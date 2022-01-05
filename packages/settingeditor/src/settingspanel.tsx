/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IFormComponentRegistry } from '@jupyterlab/ui-components';
import { Settings } from '@jupyterlab/settingregistry';
import { ISignal } from '@lumino/signaling';
import React from 'react';
import { SettingsFormEditor } from './SettingsFormEditor';
import { PluginList } from './pluginlist';

export interface ISettingsPanelProps {
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

  /**
   * Handler for when selection change is triggered by scrolling
   * in the SettingsPanel.
   */
  onSelect: (id: string) => void;

  /**
   * Signal that fires when a selection is made in the plugin list.
   */
  handleSelectSignal: ISignal<PluginList, string>;

  /**
   * Callback to update the plugin list to display plugins with
   * invalid / unsaved settings in red.
   */
  hasError: (id: string, error: boolean) => void;
}

/**
 * React component that displays a list of SettingsFormEditor
 * components.
 */
export const SettingsPanel: React.FC<ISettingsPanelProps> = ({
  settings,
  editorRegistry,
  onSelect,
  handleSelectSignal,
  hasError
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
  handleSelectSignal?.connect?.((list, pluginId) =>
    editorRefs[pluginId].current?.scrollIntoView(true)
  );

  return (
    <div className="jp-SettingsPanel" ref={wrapperRef}>
      {settings.map(pluginSettings => {
        return (
          <div
            ref={editorRefs[pluginSettings.id]}
            className="jp-SettingsForm"
            key={`${pluginSettings.id}SettingsEditor`}
          >
            <SettingsFormEditor
              settings={pluginSettings}
              renderers={editorRegistry.renderers}
              handleSelectSignal={handleSelectSignal}
              hasError={(error: boolean) => {
                hasError(pluginSettings.id, error);
              }}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
};
