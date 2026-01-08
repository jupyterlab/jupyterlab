/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ILabStatus } from '@jupyterlab/application';
import { showDialog } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  IFormRendererRegistry,
  ReactWidget,
  updateFilterFunction,
  UseSignal
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { SplitPanel, Widget } from '@lumino/widgets';
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
    this.toggleCompact = this.toggleCompact.bind(this);
    this._list = new PluginList({
      registry: options.registry,
      translator: this.translator,
      query: options.query,
      model: this._listModel,
      onToggle: this.toggleCompact
    });
    this._listModel.changed.connect(() => {
      this.update();
    });
    this.addWidget(this._list);
    this.setDirtyState = this.setDirtyState.bind(this);
    this.addClass('jp-SettingsEditor');

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
   * Toggle the side bar compact mode.
   */
  toggleCompact(): void {
    const compactWidth = 36;
    const node = this._list.node;

    if (!this._isCompact) {
      // Expanding -> Compacting
      this._isCompact = true;
      this._lastWidth = node.offsetWidth;
      node.classList.add('jp-mod-compact');
      this.addClass('jp-mod-compact');

      // Clear search query in compact mode
      this._list.setFilter(updateFilterFunction('', false, false), '');

      // Enforce size for compact mode to prevent resizing
      node.style.minWidth = `${compactWidth}px`;
      node.style.maxWidth = `${compactWidth}px`;
      node.style.width = `${compactWidth}px`;

      const totalWidth = this.node.offsetWidth;
      const fraction = compactWidth / totalWidth;
      this.setRelativeSizes([fraction, 1 - fraction]);
    } else {
      // Compacting -> Expanding
      this._isCompact = false;
      node.classList.remove('jp-mod-compact');
      this.removeClass('jp-mod-compact');

      // Enforce min width in expanded mode
      node.style.minWidth = '175px';
      node.style.maxWidth = '';
      node.style.width = '';

      // Restore layout
      if (this._lastWidth) {
        const totalWidth = this.node.offsetWidth;
        const fraction = this._lastWidth / totalWidth;
        this.setRelativeSizes([fraction, 1 - fraction]);
      }
    }
    this.update();
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
   * Handle resize events
   *
   * @param msg Widget resize message
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    const width = msg.width === -1 ? this.node.offsetWidth : msg.width;
    if (this._isCompact && width > 0) {
      const fraction = 36 / width;
      this.setRelativeSizes([fraction, 1 - fraction]);
    }
    super.onResize(msg);
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
  private _lastWidth: number;
  private _isCompact = false;
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
