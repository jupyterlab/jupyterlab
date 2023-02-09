/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { IFormRendererRegistry } from '@jupyterlab/ui-components';
import { ISignal } from '@lumino/signaling';
import type { Field } from '@rjsf/utils';
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
  editorRegistry: IFormRendererRegistry;

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

  /**
   * Signal that sends updated filter when search value changes.
   */
  updateFilterSignal: ISignal<
    PluginList,
    (plugin: ISettingRegistry.IPlugin) => string[] | null
  >;

  /**
   * If the settings editor is created with an initial search query, an initial
   * filter function is passed to the settings panel.
   */
  initialFilter: (item: ISettingRegistry.IPlugin) => string[] | null;
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
  updateFilterSignal,
  translator,
  initialFilter
}: ISettingsPanelProps): JSX.Element => {
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [filterPlugin, setFilter] = useState<
    (plugin: ISettingRegistry.IPlugin) => string[] | null
  >(() => initialFilter);

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
    const onFilterUpdate = (
      list: PluginList,
      newFilter: (plugin: ISettingRegistry.IPlugin) => string[] | null
    ) => {
      setFilter(() => newFilter);
      for (const pluginSettings of settings) {
        const filtered = newFilter(pluginSettings.plugin);
        if (filtered === null || filtered.length > 0) {
          setExpandedPlugin(pluginSettings.id);
          break;
        }
      }
    };

    // Set first visible plugin as expanded plugin on initial load.
    for (const pluginSettings of settings) {
      const filtered = filterPlugin(pluginSettings.plugin);
      if (filtered === null || filtered.length > 0) {
        setExpandedPlugin(pluginSettings.id);
        break;
      }
    }

    // When filter updates, only show plugins that match search.
    updateFilterSignal.connect(onFilterUpdate);

    const onSelectChange = (list: PluginList, pluginId: string) => {
      setExpandedPlugin(expandedPlugin !== pluginId ? pluginId : null);
      // Scroll to the plugin when a selection is made in the left panel.
      editorRefs[pluginId]?.current?.scrollIntoView(true);
    };
    handleSelectSignal?.connect?.(onSelectChange);

    return () => {
      updateFilterSignal.disconnect(onFilterUpdate);
      handleSelectSignal?.disconnect?.(onSelectChange);
    };
  }, []);

  const updateDirtyStates = React.useCallback(
    (id: string, dirty: boolean) => {
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
    },
    [editorDirtyStates, updateDirtyState]
  );

  const renderers = React.useMemo(
    () =>
      Object.entries(editorRegistry.renderers).reduce<{
        [plugin: string]: { [property: string]: Field };
      }>((agg, [id, renderer]) => {
        const splitPosition = id.lastIndexOf('.');
        const pluginId = id.substring(0, splitPosition);
        const propertyName = id.substring(splitPosition + 1);
        if (!agg[pluginId]) {
          agg[pluginId] = {};
        }
        if (!agg[pluginId][propertyName] && renderer.fieldRenderer) {
          agg[pluginId][propertyName] = renderer.fieldRenderer;
        }
        return agg;
      }, {}),
    [editorRegistry]
  );

  return (
    <div className="jp-SettingsPanel" ref={wrapperRef}>
      {settings.map(pluginSettings => {
        // Pass filtered results to SettingsFormEditor to only display filtered fields.
        const filtered = filterPlugin(pluginSettings.plugin);
        // If filtered results are an array, only show if the array is non-empty.
        if (filtered !== null && filtered.length === 0) {
          return undefined;
        }
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
              filteredValues={filtered}
              settings={pluginSettings}
              renderers={renderers}
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
