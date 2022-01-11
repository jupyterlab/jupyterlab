import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IFormComponentRegistry, ReactWidget } from '@jupyterlab/ui-components';
import { PanelLayout, SplitPanel, Widget } from '@lumino/widgets';
import React from 'react';
import { PluginList } from './pluginlist';
import { SettingsPanel } from './settingspanel';
import { Message } from '@lumino/messaging';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';

/**
 * Form based interface for editing settings.
 */
export class SettingsEditor extends Widget {
  constructor(options: SettingsEditor.IOptions) {
    super();
    const layout = (this.layout = new PanelLayout());
    this.translator = options.translator || nullTranslator;
    this._panel = new SplitPanel({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
    layout.addWidget(this._panel);
    const list = (this._list = new PluginList({
      registry: options.registry,
      translator: this.translator
    }));
    this._panel.addWidget(list);
    /**
     * Initializes the settings panel after loading the schema for all plugins.
     */
    void Promise.all(
      PluginList.sortPlugins(options.registry)
        .filter(plugin => {
          const { schema } = plugin;
          const deprecated = schema['jupyter.lab.setting-deprecated'] === true;
          const editable = Object.keys(schema.properties || {}).length > 0;
          const extensible = schema.additionalProperties !== false;

          return !deprecated && (editable || extensible);
        })
        .map(async plugin => await options.registry.load(plugin.id))
    ).then(settings => {
      const settingsPanel = ReactWidget.create(
        <SettingsPanel
          settings={
            settings.filter(
              pluginSettings =>
                pluginSettings.id !==
                  '@jupyterlab/application-extension:context-menu' &&
                pluginSettings.id !== '@jupyterlab/mainmenu-extension:plugin'
            ) as Settings[]
          }
          editorRegistry={options.editorRegistry}
          handleSelectSignal={this._list.handleSelectSignal}
          onSelect={(id: string) => (this._list.selection = id)}
          hasError={this._list.setError}
        />
      );
      this._panel.addClass('jp-SettingsPanelWidget');
      this._panel.addWidget(settingsPanel);
      const openJSONEditorButton = ReactWidget.create(
        <button
          onClick={() => {
            void options.commands.execute('settingeditor:open-json');
          }}
        >
          JSON Settings Editor
        </button>
      );
      openJSONEditorButton.addClass('jp-openJSONSettingsEditor');
      layout.addWidget(openJSONEditorButton);
    });
  }

  protected onCloseRequest(msg: Message): void {
    if (this._list.hasErrors) {
      showDialog({
        title:
          'Unsaved changes due to validation error. Continue without saving?',
        buttons: [Dialog.okButton(), Dialog.cancelButton()]
      }).then(value => {
        if (value.button.accept) {
          super.onCloseRequest(msg);
        }
      });
    } else {
      super.onCloseRequest(msg);
    }
  }

  protected translator: ITranslator;
  private _list: PluginList;
  private _panel: SplitPanel;
}

export namespace SettingsEditor {
  export interface IOptions {
    editorRegistry: IFormComponentRegistry;

    /**
     * The state database key for the editor's state management.
     */
    key: string;

    /**
     * The setting registry the editor modifies.
     */
    registry: ISettingRegistry;

    /**
     * The state database used to store layout.
     */
    state: IStateDB;

    /**
     * Command registry used to open the JSON settings editor.
     */
    commands: CommandRegistry;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
