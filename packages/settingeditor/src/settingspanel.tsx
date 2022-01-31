/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { IFormComponentRegistry } from '@jupyterlab/ui-components';
import { ISignal } from '@lumino/signaling';
import React, { useEffect, useState } from 'react';
import { PluginList } from './pluginlist';
import { SettingsFormEditor } from './SettingsFormEditor';

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
   * Translator object
   */
  translator: ITranslator;

  /**
   * Callback to update the plugin list to display plugins with
   * invalid / unsaved settings in red.
   */
  hasError: (id: string, error: boolean) => void;

  /**
   * Sends the updated dirty state to the parent class.
   */
  updateDirtyState: (dirty: boolean) => void;
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
  hasError,
  updateDirtyState,
  translator
}: ISettingsPanelProps): JSX.Element => {
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);

  // Refs used to keep track of "selected" plugin based on scroll location
  const editorRefs: {
    [pluginId: string]: React.RefObject<HTMLDivElement>;
  } = {};
  for (const setting of settings) {
    editorRefs[setting.id] = React.useRef(null);
  }
  const wrapperRef: React.RefObject<HTMLDivElement> = React.useRef(null);
  const editorDirtyStates: React.RefObject<{
    [id: string]: boolean;
  }> = React.useRef({});

  useEffect(() => {
    const onSelectChange = (list: PluginList, pluginId: string) => {
      setExpandedPlugin(expandedPlugin !== pluginId ? pluginId : null);
      // Scroll to the plugin when a selection is made in the left panel.
      editorRefs[pluginId].current?.scrollIntoView(true);
    };
    handleSelectSignal?.connect?.(onSelectChange);

    return () => {
      handleSelectSignal?.disconnect?.(onSelectChange);
    };
  }, []);

  const updateDirtyStates = (id: string, dirty: boolean) => {
    if (editorDirtyStates.current) {
      editorDirtyStates.current[id] = dirty;
      for (const editor in editorDirtyStates.current) {
        if (editorDirtyStates.current[editor]) {
          updateDirtyState(true);
          return;
        }
      }
    }
    updateDirtyState(false);
  };

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
              isCollapsed={pluginSettings.id !== expandedPlugin}
              onCollapseChange={(willCollapse: boolean) => {
                if (!willCollapse) {
                  setExpandedPlugin(pluginSettings.id);
                } else if (pluginSettings.id === expandedPlugin) {
                  setExpandedPlugin(null);
                }
              }}
              settings={pluginSettings}
              renderers={editorRegistry.renderers}
              hasError={(error: boolean) => {
                hasError(pluginSettings.id, error);
              }}
              updateDirtyState={(dirty: boolean) => {
                updateDirtyStates(pluginSettings.id, dirty);
              }}
              onSelect={onSelect}
              translator={translator}
            />
          </div>
        );
      })}
    </div>
  );
};
