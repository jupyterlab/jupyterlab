/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { IYText } from '@jupyter/ydoc';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IEditorServices } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  EditorThemeRegistry,
  IEditorExtensionRegistry,
  IEditorLanguageRegistry,
  IEditorThemeRegistry,
  parseMathIPython,
  pythonBuiltin,
  ybinding
} from '@jupyterlab/codemirror';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  FormComponent,
  IFormRendererRegistry
} from '@jupyterlab/ui-components';
import { JSONExt, ReadonlyJSONValue } from '@lumino/coreutils';
import type { FieldProps } from '@rjsf/utils';
import validatorAjv8 from '@rjsf/validator-ajv8';
import React from 'react';

/**
 * CodeMirror settings plugin ID
 */
const SETTINGS_ID = '@jupyterlab/codemirror-extension:plugin';

/**
 * CodeMirror language registry provider.
 */
export const languagePlugin: JupyterFrontEndPlugin<IEditorLanguageRegistry> = {
  id: '@jupyterlab/codemirror-extension:languages',
  description: 'Provides the CodeMirror languages registry.',
  provides: IEditorLanguageRegistry,
  optional: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator | null) => {
    const languages = new EditorLanguageRegistry();

    // Register default languages
    for (const language of EditorLanguageRegistry.getDefaultLanguages(
      translator
    )) {
      languages.addLanguage(language);
    }

    // Add Jupyter Markdown flavor here to support
    // code block highlighting.
    languages.addLanguage({
      name: 'ipythongfm',
      mime: 'text/x-ipythongfm',
      load: async () => {
        const [m, py, tex] = await Promise.all([
          import('@codemirror/lang-markdown'),
          import('@codemirror/lang-python'),
          import('@codemirror/legacy-modes/mode/stex')
        ]);
        const mdlang = m.markdown({
          base: m.markdownLanguage,
          codeLanguages: (info: string) => languages.findBest(info) as any,
          extensions: [
            parseMathIPython(StreamLanguage.define(tex.stexMath).parser)
          ]
        });
        return new LanguageSupport(mdlang.language, [
          mdlang.support,
          pythonBuiltin(py.pythonLanguage)
        ]);
      }
    });
    return languages;
  }
};

/**
 * CodeMirror theme registry provider.
 */
export const themePlugin: JupyterFrontEndPlugin<IEditorThemeRegistry> = {
  id: '@jupyterlab/codemirror-extension:themes',
  description: 'Provides the CodeMirror theme registry',
  provides: IEditorThemeRegistry,
  optional: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator | null) => {
    const themes = new EditorThemeRegistry();
    // Register default themes
    for (const theme of EditorThemeRegistry.getDefaultThemes(translator)) {
      themes.addTheme(theme);
    }
    return themes;
  }
};

/**
 * CodeMirror editor extensions registry provider.
 */
export const extensionPlugin: JupyterFrontEndPlugin<IEditorExtensionRegistry> =
  {
    id: '@jupyterlab/codemirror-extension:extensions',
    description: 'Provides the CodeMirror extension factory registry.',
    provides: IEditorExtensionRegistry,
    requires: [IEditorThemeRegistry],
    optional: [ITranslator, ISettingRegistry, IFormRendererRegistry],
    activate: (
      app: JupyterFrontEnd,
      themes: IEditorThemeRegistry,
      translator: ITranslator | null,
      settingRegistry: ISettingRegistry | null,
      formRegistry: IFormRendererRegistry | null
    ): IEditorExtensionRegistry => {
      const registry = new EditorExtensionRegistry();

      // Register default extensions
      for (const extensionFactory of EditorExtensionRegistry.getDefaultExtensions(
        {
          themes,
          translator
        }
      )) {
        registry.addExtension(extensionFactory);
      }

      if (settingRegistry) {
        const updateSettings = (settings: ISettingRegistry.ISettings) => {
          registry.baseConfiguration =
            (settings.get('defaultConfig').composite as Record<string, any>) ??
            {};
        };
        void Promise.all([
          settingRegistry.load(SETTINGS_ID),
          app.restored
        ]).then(([settings]) => {
          updateSettings(settings);
          settings.changed.connect(updateSettings);
        });

        formRegistry?.addRenderer(`${SETTINGS_ID}.defaultConfig`, {
          fieldRenderer: (props: FieldProps) => {
            const properties = React.useMemo(
              () => registry.settingsSchema,
              []
            ) as any;
            const defaultFormData: Record<string, any> = {};
            // Only provide customizable options
            for (const [key, value] of Object.entries(
              registry.defaultConfiguration
            )) {
              if (typeof properties[key] !== 'undefined') {
                defaultFormData[key] = value;
              }
            }

            return (
              <div className="jp-FormGroup-contentNormal">
                <h3 className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                  {props.schema.title}
                </h3>
                {props.schema.description && (
                  <div className="jp-FormGroup-description">
                    {props.schema.description}
                  </div>
                )}
                <FormComponent
                  schema={{
                    title: props.schema.title,
                    description: props.schema.description,
                    type: 'object',
                    properties,
                    additionalProperties: false
                  }}
                  validator={validatorAjv8}
                  formData={{ ...defaultFormData, ...props.formData }}
                  formContext={{ defaultFormData }}
                  liveValidate
                  onChange={e => {
                    // Only save non-default values
                    const nonDefault: Record<string, ReadonlyJSONValue> = {};
                    for (const [property, value] of Object.entries(
                      e.formData ?? {}
                    )) {
                      const default_ = defaultFormData[property];
                      if (
                        default_ === undefined ||
                        !JSONExt.deepEqual(value, default_)
                      ) {
                        nonDefault[property] = value;
                      }
                    }
                    props.onChange(nonDefault);
                  }}
                  tagName="div"
                  translator={translator ?? nullTranslator}
                />
              </div>
            );
          }
        });
      }

      return registry;
    }
  };

/**
 * CodeMirror shared model binding provider.
 */
export const bindingPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/codemirror-extension:binding',
  description:
    'Register the CodeMirror extension factory binding the editor and the shared model.',
  autoStart: true,
  requires: [IEditorExtensionRegistry],
  activate: (app: JupyterFrontEnd, extensions: IEditorExtensionRegistry) => {
    extensions.addExtension({
      name: 'shared-model-binding',
      factory: options => {
        const sharedModel = options.model.sharedModel as IYText;
        return EditorExtensionRegistry.createImmutableExtension(
          ybinding({
            ytext: sharedModel.ysource,
            undoManager: sharedModel.undoManager ?? undefined
          })
        );
      }
    });
  }
};

/**
 * The editor services.
 */
export const servicesPlugin: JupyterFrontEndPlugin<IEditorServices> = {
  id: '@jupyterlab/codemirror-extension:services',
  description: 'Provides the service to instantiate CodeMirror editors.',
  provides: IEditorServices,
  requires: [IEditorLanguageRegistry, IEditorExtensionRegistry],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    languages: IEditorLanguageRegistry,
    extensions: IEditorExtensionRegistry,
    translator: ITranslator | null
  ): IEditorServices => {
    const factory = new CodeMirrorEditorFactory({
      extensions,
      languages,
      translator: translator ?? nullTranslator
    });
    return {
      factoryService: factory,
      mimeTypeService: new CodeMirrorMimeTypeService(languages)
    };
  }
};
