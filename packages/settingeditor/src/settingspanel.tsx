/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { CodeEditor } from '@jupyterlab/codeeditor';
import { IFormComponentRegistry } from '@jupyterlab/ui-components';
import { Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { ISignal } from '@lumino/signaling';
import React from 'react';
import { SettingEditor } from './settingeditor';
import { SettingsFormEditor } from './settingmetadataeditor';

interface ISettingsPanelProps {
  /**
   * List of Settings objects that provide schema and values
   * of plugins.
   */
  settings: Settings[];

  /**
   * Form component registry that provides renderers
   * for the form editor.
   */
  editorRegistry: IFormComponentRegistry;

  editorFactory: CodeEditor.Factory;

  /**
   * Handler for when selection change is triggered by scrolling
   * in the SettingsPanel.
   */
  onSelect?: (id: string) => void;

  /**
   * Signal that fires when a selection is made in the plugin list.
   */
  handleSelectSignal?: ISignal<SettingEditor, string>;

  /**
   * The application language translator.
   */
  translator?: ITranslator;
}

/**
 * React component that displays a list of SettingsFormEditor
 * components.
 */
export const SettingsPanel: React.FC<ISettingsPanelProps> = ({
  settings,
  editorRegistry,
  editorFactory,
  onSelect,
  handleSelectSignal,
  translator
}) => {
  // Refs used to keep track of "selected" plugin based on scroll location
  const editorRefs: {
    [pluginId: string]: React.RefObject<HTMLDivElement>;
  } = {};
  for (const setting of settings) {
    editorRefs[setting.id] = React.useRef(null);
  }
  const wrapperRef: React.RefObject<HTMLDivElement> = React.useRef(null);

  // Scroll to the plugin when a selection is made in the left panel.
  handleSelectSignal?.connect?.((editor, pluginId) =>
    editorRefs[pluginId].current?.scrollIntoView()
  );

  // TODO: is this efficient?
  /**
   * Calculates the currently "selected" plugin based on scroll location
   */
  const updateSelectedPlugin = () => {
    for (const refId in editorRefs) {
      const ref = editorRefs[refId];
      const offsetTop =
        ref.current?.offsetTop ?? 0 + (wrapperRef.current?.offsetTop ?? 0);
      if (
        wrapperRef.current?.scrollTop &&
        ref.current?.scrollHeight &&
        wrapperRef.current?.scrollTop + 1 >=
          (wrapperRef.current?.offsetTop ?? 0) &&
        // If top of editor is visible
        (offsetTop >= wrapperRef.current?.scrollTop ||
          // If the top is above the view and the bottom is below the view
          (offsetTop < wrapperRef.current?.scrollTop &&
            offsetTop + ref.current?.scrollHeight >
              wrapperRef.current?.scrollTop + wrapperRef.current?.clientHeight))
      ) {
        onSelect?.(refId);
        break;
      }
    }
  };

  return (
    <div
      className="jp-SettingsPanel"
      ref={wrapperRef}
      onScroll={updateSelectedPlugin}
    >
      {settings.map(pluginSettings => {
        return (
          <div
            ref={editorRefs[pluginSettings.id]}
            key={`${pluginSettings.id}SettingsEditor`}
          >
            <SettingsFormEditor
              settings={pluginSettings}
              editorFactory={editorFactory}
              componentRegistry={editorRegistry}
              translator={translator}
            />
          </div>
        );
      })}
    </div>
  );
};
