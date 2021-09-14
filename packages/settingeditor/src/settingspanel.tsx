import { IFormComponentRegistry } from '@jupyterlab/formeditor';
import { Settings } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { ISignal } from '@lumino/signaling';
import React from 'react';
import { SettingEditor } from '.';
import { SettingsMetadataEditor } from './settingmetadataeditor';

interface ISettingsPanelProps {
  settings: Settings[];

  editorRegistry: IFormComponentRegistry;

  onSelect?: (id: string) => void;
  handleSelectSignal?: ISignal<SettingEditor, string>;

  /**
   * The application language translator.
   */
  translator?: ITranslator;
}

export const SettingsPanel: React.FC<ISettingsPanelProps> = ({
  settings,
  editorRegistry,
  onSelect,
  handleSelectSignal,
  translator
}) => {
  const editorRefs: {
    [pluginId: string]: React.RefObject<HTMLDivElement>;
  } = {};
  for (const setting of settings) {
    editorRefs[setting.id] = React.useRef(null);
  }
  const wrapperRef: React.RefObject<HTMLDivElement> = React.useRef(null);

  handleSelectSignal?.connect?.((editor, pluginId) =>
    editorRefs[pluginId].current?.scrollIntoView()
  );

  // TODO: is this efficient?
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
            <SettingsMetadataEditor
              settings={pluginSettings}
              componentRegistry={editorRegistry}
            />
          </div>
        );
      })}
    </div>
  );
};
