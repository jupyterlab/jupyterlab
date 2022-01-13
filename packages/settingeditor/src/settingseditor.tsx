import { ILabStatus } from '@jupyterlab/application';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  IFormComponentRegistry,
  launchIcon,
  ReactWidget
} from '@jupyterlab/ui-components';
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
    this._status = options.status;
    layout.addWidget(this._panel);
    const list = (this._list = new PluginList({
      registry: options.registry,
      translator: this.translator
    }));
    this._panel.addWidget(list);
    this.updateDirtyState = this.updateDirtyState.bind(this);

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
          updateDirtyState={this.updateDirtyState}
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
          <launchIcon.react />
        </button>
      );
      openJSONEditorButton.addClass('jp-openJSONSettingsEditor');
      this._saveStatusIndicator = ReactWidget.create(
        <p> {this._dirty ? 'Saving...' : 'Saved'}</p>
      );
      this._saveStatusIndicator.addClass('jp-saveStatusIndicator');
      layout.addWidget(this._saveStatusIndicator);
      layout.addWidget(openJSONEditorButton);
    });
  }

  updateDirtyState(dirty: boolean) {
    this._dirty = dirty;
    if (this._dirty && !this._clearDirty) {
      this._clearDirty = this._status.setDirty();
    } else if (!this._dirty && this._clearDirty) {
      this._clearDirty.dispose();
      this._clearDirty = null;
    }
    if (dirty && !this.title.className.includes('jp-mod-dirty')) {
      this.title.className += ' jp-mod-dirty';
    }
    if (!dirty) {
      this.title.className = this.title.className.replace('jp-mod-dirty', '');
    }
    const layout = this.layout as PanelLayout;
    layout.removeWidget(this._saveStatusIndicator);
    this._saveStatusIndicator = ReactWidget.create(
      <p> {dirty ? 'Saving...' : 'Saved'}</p>
    );
    this._saveStatusIndicator.addClass('jp-saveStatusIndicator');
    layout.addWidget(this._saveStatusIndicator);
  }

  protected onCloseRequest(msg: Message): void {
    if (this._list.hasErrors) {
      showDialog({
        title:
          'Unsaved changes due to validation error. Continue without saving?',
        buttons: [Dialog.okButton(), Dialog.cancelButton()]
      }).then(value => {
        if (value.button.accept) {
          this.dispose();
          super.onCloseRequest(msg);
        }
      });
    } else if (this._dirty) {
      showDialog({
        title: 'Some changes have not been saved. Continue without saving?',
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      }).then(value => {
        if (value.button.accept) {
          this.dispose();
          super.onCloseRequest(msg);
        }
      });
    } else {
      this.dispose();
      super.onCloseRequest(msg);
    }
  }

  private _clearDirty: any;
  private _status: ILabStatus;
  private _saveStatusIndicator: ReactWidget;
  private _dirty: boolean = false;
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

    status: ILabStatus;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
