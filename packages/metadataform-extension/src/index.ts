// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module metadataform-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { INotebookTools } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { IFormRendererRegistry } from '@jupyterlab/ui-components';
import { JSONExt, PartialJSONArray } from '@lumino/coreutils';

import {
  IMetadataFormProvider,
  MetadataForm,
  MetadataFormProvider,
  MetadataFormWidget
} from '@jupyterlab/metadataform';

const PLUGIN_ID = '@jupyterlab/metadataform-extension:metadataforms';

namespace Private {
  export async function loadSettingsMetadataForm(
    app: JupyterFrontEnd,
    registry: ISettingRegistry,
    notebookTools: INotebookTools,
    translator: ITranslator,
    formComponentRegistry: IFormRendererRegistry
  ): Promise<IMetadataFormProvider> {
    let canonical: ISettingRegistry.ISchema | null;
    let loaded: { [name: string]: ISettingRegistry.IMetadataForm[] } = {};

    /**
     * Populate the plugin's schema defaults.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};
      schema.properties!.metadataforms.default = Object.keys(registry.plugins)
        .map(plugin => {
          const metadataForms =
            registry.plugins[plugin]!.schema['jupyter.lab.metadataforms'] ?? [];

          metadataForms.forEach(metadataForm => {
            metadataForm._origin = plugin;
          });
          loaded[plugin] = metadataForms;
          return metadataForms;
        })
        .concat([schema['jupyter.lab.metadataforms'] as any[]])
        .reduce((acc, val) => {
          // If a MetadataForm with the same ID already exists,
          // the metadataKeys will be concatenated to this MetadataForm's metadataKeys .
          // Otherwise, the whole MetadataForm will be pushed as a new form.
          val.forEach(value => {
            const metadataForm = acc.find(addedValue => {
              return addedValue.id === value.id;
            });
            if (metadataForm) {
              // TODO do insertion of metadataSchema properties in a generic way.
              // Currently this only support 'properties', 'allOf' and 'required'.
              //  - add or replace entries if it is an object.
              //  - concat if it is an array.
              //  - replace if it is a primitive ?

              // Includes new metadataKey in the existing metadataSchema.
              // Overwrites if the metadataKey already exists.
              for (let [metadataKey, properties] of Object.entries(
                value.metadataSchema.properties
              )) {
                metadataForm.metadataSchema.properties[metadataKey] =
                  properties;
              }

              // Includes required fields.
              if (value.metadataSchema.required) {
                if (!metadataForm.metadataSchema.required) {
                  metadataForm.metadataSchema.required =
                    value.metadataSchema.required;
                } else {
                  metadataForm.metadataSchema.required.concat(
                    value.metadataSchema.required
                  );
                }
              }

              // Includes allOf array in the existing metadataSchema.
              if (value.metadataSchema.allOf) {
                if (!metadataForm.metadataSchema.allOf) {
                  metadataForm.metadataSchema.allOf =
                    value.metadataSchema.allOf;
                } else {
                  metadataForm.metadataSchema.allOf.concat(
                    value.metadataSchema.allOf
                  );
                }
              }

              // Includes uiSchema in the existing uiSchema.
              // Overwrites if the uiSchema already exists for that metadataKey.
              if (value.uiSchema) {
                if (!metadataForm.uiSchema) metadataForm.uiSchema = {};
                for (let [metadataKey, ui] of Object.entries(value.uiSchema)) {
                  metadataForm.uiSchema[metadataKey] = ui;
                }
              }

              // Includes metadataOptions in the existing uiSchema.
              // Overwrites if options already exists for that metadataKey.
              if (value.metadataOptions) {
                if (!metadataForm.metadataOptions)
                  metadataForm.metadataOptions = {};
                for (let [metadataKey, options] of Object.entries(
                  value.metadataOptions
                )) {
                  metadataForm.metadataOptions[metadataKey] = options;
                }
              }
            } else {
              acc.push(value);
            }
          });
          return acc;
        }, []); // flatten one level;
    }

    // Transform the plugin object to return different schema than the default.
    registry.transform(PLUGIN_ID, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }
        const defaults =
          (canonical.properties?.metadataforms?.default as PartialJSONArray) ??
          [];
        const user = {
          metadataforms: plugin.data.user.metadataforms ?? []
        };
        const composite = {
          metadataforms: defaults.concat(user.metadataforms)
        };

        plugin.data = { composite, user };
        return plugin;
      },
      fetch: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        return {
          data: plugin.data,
          id: plugin.id,
          raw: plugin.raw,
          schema: canonical,
          version: plugin.version
        };
      }
    });

    // Repopulate the canonical variable after the setting registry has
    // preloaded all initial plugins.
    canonical = null;

    const settings = await registry.load(PLUGIN_ID);
    const metadataForms: IMetadataFormProvider = new MetadataFormProvider();

    // Creates all the forms from extensions settings.
    for (let schema of settings.composite
      .metadataforms as ISettingRegistry.IMetadataForm[]) {
      let metaInformation: MetadataForm.IMetaInformation = {};
      let metadataSchema: ISettingRegistry.IMetadataSchema = JSONExt.deepCopy(
        schema.metadataSchema
      );
      let uiSchema: MetadataForm.IUiSchema = {};

      if (schema.uiSchema) {
        uiSchema = JSONExt.deepCopy(schema.uiSchema) as MetadataForm.IUiSchema;
      }

      for (let [metadataKey, properties] of Object.entries(
        metadataSchema.properties
      )) {
        if (properties.default) {
          if (!metaInformation[metadataKey]) metaInformation[metadataKey] = {};
          metaInformation[metadataKey].default = properties.default;
        }
      }

      if (schema.metadataOptions) {
        for (let [metadataKey, options] of Object.entries(
          schema.metadataOptions
        )) {
          // Optionally links key to cell type.
          if (options.cellTypes) {
            if (!metaInformation[metadataKey])
              metaInformation[metadataKey] = {};
            metaInformation[metadataKey].cellTypes = options.cellTypes;
          }

          // Optionally links key to metadata level.
          if (options.metadataLevel) {
            if (!metaInformation[metadataKey])
              metaInformation[metadataKey] = {};
            metaInformation[metadataKey].level = options.metadataLevel;
          }

          // Optionally set the writeDefault flag.
          if (options.writeDefault !== undefined) {
            if (!metaInformation[metadataKey])
              metaInformation[metadataKey] = {};
            metaInformation[metadataKey].writeDefault = options.writeDefault;
          }

          // Optionally links key to a custom widget.
          if (options.customRenderer) {
            const component = formComponentRegistry.getRenderer(
              options.customRenderer as string
            );

            // If renderer is defined (custom widget has been registered), set it as used widget.
            if (component !== undefined) {
              if (!uiSchema[metadataKey]) uiSchema[metadataKey] = {};
              if (component.fieldRenderer) {
                uiSchema[metadataKey]['ui:field'] = component.fieldRenderer;
              } else {
                uiSchema[metadataKey]['ui:widget'] = component.widgetRenderer;
              }
            }
          }
        }
      }

      // Adds a section to notebookTools.
      notebookTools.addSection({
        sectionName: schema.id,
        rank: schema.rank,
        label: schema.label ?? schema.id
      });

      // Creates the tool.
      const tool = new MetadataFormWidget({
        metadataSchema: metadataSchema,
        metaInformation: metaInformation,
        uiSchema: uiSchema,
        pluginId: schema._origin,
        translator: translator,
        showModified: schema.showModified
      });

      // Adds the form to the section.
      notebookTools.addItem({ section: schema.id, tool: tool });

      metadataForms.add(schema.id, tool);
    }
    return metadataForms;
  }
}

/**
 * The metadata form plugin.
 */
const metadataForm: JupyterFrontEndPlugin<IMetadataFormProvider> = {
  id: PLUGIN_ID,
  description: 'Provides the metadata form registry.',
  autoStart: true,
  requires: [
    INotebookTools,
    ITranslator,
    IFormRendererRegistry,
    ISettingRegistry
  ],
  provides: IMetadataFormProvider,
  activate: async (
    app: JupyterFrontEnd,
    notebookTools: INotebookTools,
    translator: ITranslator,
    componentsRegistry: IFormRendererRegistry,
    settings: ISettingRegistry
  ): Promise<IMetadataFormProvider> => {
    return await Private.loadSettingsMetadataForm(
      app,
      settings,
      notebookTools,
      translator,
      componentsRegistry
    );
  }
};

export default metadataForm;
