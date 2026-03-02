/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ILabStatus } from '@jupyterlab/application';
import { showDialog } from '@jupyterlab/apputils';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { IStateDB } from '@jupyterlab/statedb';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { IFormRendererRegistry } from '@jupyterlab/ui-components';
import {
  ReactWidget,
  updateFilterFunction,
  UseSignal
} from '@jupyterlab/ui-components';
import type { CommandRegistry } from '@lumino/commands';
import type { IDisposable } from '@lumino/disposable';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
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
    this._listModel = new PluginList.Model({
      registry: options.registry,
      // Filters out a couple of plugins that take too long to load in the new settings editor.
      toSkip: options.toSkip
    });
    this._list = new PluginList({
      registry: options.registry,
      translator: this.translator,
      query: options.query,
      model: this._listModel
    });
    this._listModel.changed.connect(() => {
      this.update();
    });
    this.addWidget(this._list);
    this.setDirtyState = this.setDirtyState.bind(this);

    const settingsPanel = ReactWidget.create(
      <UseSignal signal={this._listModel.changed}>
        {() => (
          <SettingsPanel
            settings={[...Object.values(this._listModel.settings)]}
            editorRegistry={options.editorRegistry}
            handleSelectSignal={this._list.handleSelectSignal}
            onSelect={(id: string) => (this._list.selection = id)}
            hasError={this._list.setError}
            updateFilterSignal={this._list.updateFilterSignal}
            updateDirtyState={this.setDirtyState}
            translator={this.translator}
            initialFilter={this._list.filter}
          />
        )}
      </UseSignal>
    );
    // Initializes the settings panel after loading the schema for all plugins.
    this._listModel.ready
      .then(() => {
        this.addWidget(settingsPanel);
      })
      .catch(reason => {
        console.error(`Failed to load the setting plugins:\n${reason}`);
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
   * Updates the filter of the plugin list.
   *
   * @param query The query to filter the plugin list
   */
  updateQuery(query: string): void {
    this._list.setFilter(
      query ? updateFilterFunction(query, false, false) : null,
      query
    );
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
  private _listModel: PluginList.Model;
  private _saveStateChange = new Signal<this, SettingsEditor.SaveState>(this);
}

export namespace SettingsEditor {
  /**
   * Settings editor save state
   */
  export type SaveState = 'started' | 'failed' | 'completed';

  /**
   *
   */
  export type PluginSearchFilter =
    | ((plugin: ISettingRegistry.IPlugin) => string[] | null)
    | null;

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
