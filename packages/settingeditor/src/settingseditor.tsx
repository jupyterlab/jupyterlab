/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ILabStatus } from '@jupyterlab/application';
import { showDialog } from '@jupyterlab/apputils';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IFormRendererRegistry, ReactWidget } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { SplitPanel } from '@lumino/widgets';
import React from 'react';
import { PluginList } from './pluginlist';
import { SettingsPanel } from './settingspanel';

/**
 * Form based interface for editing settings.
 */
export class SettingsEditor extends SplitPanel {
  constructor(options: SettingsEditor.IOptions) {
    super({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
    this.translator = options.translator || nullTranslator;
    this._status = options.status;
    const list = (this._list = new PluginList({
      registry: options.registry,
      toSkip: options.toSkip,
      translator: this.translator,
      query: options.query
    }));
    this.addWidget(list);
    this.setDirtyState = this.setDirtyState.bind(this);

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
    )
      .then(settings => {
        const settingsPanel = ReactWidget.create(
          <SettingsPanel
            settings={
              settings.filter(
                pluginSettings =>
                  !(options.toSkip ?? []).includes(pluginSettings.id)
              ) as Settings[]
            }
            editorRegistry={options.editorRegistry}
            handleSelectSignal={this._list.handleSelectSignal}
            onSelect={(id: string) => (this._list.selection = id)}
            hasError={this._list.setError}
            updateFilterSignal={this._list.updateFilterSignal}
            updateDirtyState={this.setDirtyState}
            translator={this.translator}
            initialFilter={this._list.filter}
          />
        );
        this.addWidget(settingsPanel);
      })
      .catch(reason => {
        console.error(`Fail to load the setting plugins:\n${reason}`);
      });
  }

  /**
   * A signal emitted on the start and end of a saving operation.
   */
  get saveStateChanged(): ISignal<this, SettingsEditor.SaveState> {
    return this._saveStateChange;
  }

  /**
   * Set the dirty state status
   *
   * @param dirty New status
   */
  setDirtyState(dirty: boolean): void {
    this._dirty = dirty;
    if (this._dirty && !this._clearDirty) {
      this._clearDirty = this._status.setDirty();
    } else if (!this._dirty && this._clearDirty) {
      this._clearDirty.dispose();
      this._clearDirty = null;
    }
    if (dirty) {
      if (!this.title.className.includes('jp-mod-dirty')) {
        this.title.className += ' jp-mod-dirty';
      }
    } else {
      this.title.className = this.title.className.replace('jp-mod-dirty', '');
    }
    this._saveStateChange.emit(dirty ? 'started' : 'completed');
  }

  /**
   * A message handler invoked on a `'close-request'` message.
   *
   * @param msg Widget message
   */
  protected onCloseRequest(msg: Message): void {
    const trans = this.translator.load('jupyterlab');
    if (this._list.hasErrors) {
      void showDialog({
        title: trans.__('Warning'),
        body: trans.__(
          'Unsaved changes due to validation error. Continue without saving?'
        )
      }).then(value => {
        if (value.button.accept) {
          this.dispose();
          super.onCloseRequest(msg);
        }
      });
    } else if (this._dirty) {
      void showDialog({
        title: trans.__('Warning'),
        body: trans.__(
          'Some changes have not been saved. Continue without saving?'
        )
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

  protected translator: ITranslator;
  private _clearDirty: IDisposable | null = null;
  private _status: ILabStatus;
  private _dirty: boolean = false;
  private _list: PluginList;
  private _saveStateChange = new Signal<this, SettingsEditor.SaveState>(this);
}

export namespace SettingsEditor {
  /**
   * Settings editor save state
   */
  export type SaveState = 'started' | 'failed' | 'completed';

  /**
   * Settings editor options
   */
  export interface IOptions {
    /**
     * Form component registry
     */
    editorRegistry: IFormRendererRegistry;

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
     * Application status
     */
    status: ILabStatus;

    /**
     * List of plugins to skip
     */
    toSkip?: string[];

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    query?: string;
  }
}
