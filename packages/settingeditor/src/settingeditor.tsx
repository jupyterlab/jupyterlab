/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ReactWidget } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IFormComponentRegistry } from '@jupyterlab/formeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { JSONExt, JSONObject, JSONValue } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';
import React from 'react';
import { PluginEditor } from './plugineditor';
import { PluginList } from './pluginlist';
import { SettingsPanel } from './settingspanel';
import { SplitPanel } from './splitpanel';
import { Switch } from '@jupyterlab/ui-components';

/**
 * The ratio panes in the setting editor.
 */
const DEFAULT_LAYOUT: SettingEditor.ILayoutState = {
  sizes: [1, 3],
  container: {
    editor: 'raw',
    plugin: '',
    sizes: [1, 1]
  }
};

/**
 * An interface for modifying and saving application settings.
 */
export class SettingEditor extends Widget {
  /**
   * Create a new setting editor.
   */
  constructor(options: SettingEditor.IOptions) {
    super();
    this.translator = options.translator || nullTranslator;
    this.addClass('jp-SettingEditor');
    this.key = options.key;
    this.state = options.state;

    const { commands, editorFactory, rendermime, editorRegistry } = options;
    const layout = (this.layout = new PanelLayout());
    const registry = (this.registry = options.registry);
    const panel = (this._panel = new SplitPanel({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    }));

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
      this._settings = settings as Settings[];
      const settingsPanel = (this._settingsPanel = ReactWidget.create(
        <SettingsPanel
          settings={settings as Settings[]}
          editorRegistry={editorRegistry}
          handleSelectSignal={this._handleSelectSignal}
          onSelect={(id: string) => (this._list.selection = id)}
        />
      ));
      const currentSettings = settings.find(
        plugin => plugin.id === list.selection
      );
      if (currentSettings) {
        editor.settings = currentSettings;
      }
      settingsPanel.addClass('jp-SettingsPanel');
      panel.addWidget(settingsPanel);
    });

    const switchButton = new Switch();
    switchButton.addClass('jp-SettingEditor-Switch');
    switchButton.valueChanged.connect(
      (sender, args) => (this.isRawEditor = args.newValue)
    );
    layout.addWidget(switchButton);

    const editor = (this._editor = new PluginEditor({
      commands,
      editorFactory,
      registry,
      rendermime,
      translator: this.translator
    }));

    const confirm = (id: string) => {
      this._handleSelectSignal.emit(id);
      const newSettings = this._settings.find(plugin => plugin.id === id);
      if (newSettings) {
        editor.settings = newSettings;
      }
      return editor.confirm();
    };
    const list = (this._list = new PluginList({
      confirm,
      registry,
      translator: this.translator
    }));
    const when = options.when;

    if (when) {
      this._when = Array.isArray(when) ? Promise.all(when) : when;
    }

    panel.addClass('jp-SettingEditor-main');
    layout.addWidget(panel);
    panel.addWidget(list);
    panel.addWidget(editor);
    editor.hide();

    SplitPanel.setStretch(list, 0);
    SplitPanel.setStretch(editor, 1);

    editor.stateChanged.connect(this._onStateChanged, this);
    list.changed.connect(this._onStateChanged, this);
    panel.handleMoved.connect(this._onStateChanged, this);
  }

  /**
   * The state database key for the editor's state management.
   */
  readonly key: string;

  /**
   * The setting registry used by the editor.
   */
  readonly registry: ISettingRegistry;

  /**
   * The state database used to store layout.
   */
  readonly state: IStateDB;

  /**
   * The currently loaded settings.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._editor.settings;
  }

  get isRawEditor(): boolean {
    return this._isRawEditor;
  }
  set isRawEditor(value: boolean) {
    this._isRawEditor = value;

    if (this._isRawEditor) {
      this._settingsPanel.hide();
      this._editor.show();
    } else if (!this._isRawEditor) {
      this._editor.hide();
      this._settingsPanel.show();
    }
  }

  /**
   * Dispose of the resources held by the setting editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    super.dispose();
    this._editor.dispose();
    this._list.dispose();
    this._panel.dispose();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._panel.hide();
    this._fetchState()
      .then(() => {
        this._panel.show();
        this._setState();
      })
      .catch(reason => {
        console.error('Fetching setting editor state failed', reason);
        this._panel.show();
        this._setState();
      });
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    this._editor
      .confirm()
      .then(() => {
        super.onCloseRequest(msg);
        this.dispose();
      })
      .catch(() => {
        /* no op */
      });
  }

  /**
   * Get the state of the panel.
   */
  private _fetchState(): Promise<void> {
    if (this._fetching) {
      return this._fetching;
    }

    const { key, state } = this;
    const promises = [state.fetch(key), this._when];

    return (this._fetching = Promise.all(promises).then(([value]) => {
      this._fetching = null;

      if (this._saving) {
        return;
      }

      this._state = Private.normalizeState(value, this._state);
    }));
  }

  /**
   * Handle root level layout state changes.
   */
  private async _onStateChanged(): Promise<void> {
    this._state.sizes = this._panel.relativeSizes();
    this._state.container = this._editor.state;
    this._state.container.plugin = this._list.selection;
    try {
      await this._saveState();
    } catch (error) {
      console.error('Saving setting editor state failed', error);
    }
    this._setState();
  }

  /**
   * Set the state of the setting editor.
   */
  private async _saveState(): Promise<void> {
    const { key, state } = this;
    const value = this._state;

    this._saving = true;
    try {
      await state.save(key, value);
      this._saving = false;
    } catch (error) {
      this._saving = false;
      throw error;
    }
  }

  /**
   * Set the layout sizes.
   */
  private _setLayout(): void {
    const editor = this._editor;
    const panel = this._panel;
    const state = this._state;

    editor.state = state.container;

    // Allow the message queue (which includes fit requests that might disrupt
    // setting relative sizes) to clear before setting sizes.
    requestAnimationFrame(() => {
      panel.setRelativeSizes(state.sizes);
    });
  }

  /**
   * Set the presets of the setting editor.
   */
  private _setState(): void {
    const editor = this._editor;
    const list = this._list;
    // const panel = this._panel;
    const { container } = this._state;

    if (!container.plugin) {
      editor.settings = null;
      list.selection = '';
      this._setLayout();
      return;
    }

    if (editor.settings && editor.settings.id === container.plugin) {
      this._setLayout();
      return;
    }
  }

  protected translator: ITranslator;
  private _editor: PluginEditor;
  private _handleSelectSignal = new Signal<this, string>(this);
  private _settingsPanel: ReactWidget;
  private _isRawEditor: boolean = false;
  private _settings: Settings[];
  private _fetching: Promise<void> | null = null;
  private _list: PluginList;
  private _panel: SplitPanel;
  private _saving = false;
  private _state: SettingEditor.ILayoutState = JSONExt.deepCopy(DEFAULT_LAYOUT);
  private _when: Promise<any>;
}

/**
 * A namespace for `SettingEditor` statics.
 */
export namespace SettingEditor {
  /**
   * The instantiation options for a setting editor.
   */
  export interface IOptions {
    editorRegistry: IFormComponentRegistry;
    /**
     * The toolbar commands and registry for the setting editor toolbar.
     */
    commands: {
      /**
       * The command registry.
       */
      registry: CommandRegistry;

      /**
       * The revert command ID.
       */
      revert: string;

      /**
       * The save command ID.
       */
      save: string;
    };

    /**
     * The editor factory used by the setting editor.
     */
    editorFactory: CodeEditor.Factory;

    /**
     * The state database key for the editor's state management.
     */
    key: string;

    /**
     * The setting registry the editor modifies.
     */
    registry: ISettingRegistry;

    /**
     * The optional MIME renderer to use for rendering debug messages.
     */
    rendermime?: IRenderMimeRegistry;

    /**
     * The state database used to store layout.
     */
    state: IStateDB;

    /**
     * The point after which the editor should restore its state.
     */
    when?: Promise<any> | Array<Promise<any>>;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * The layout state for the setting editor.
   */
  export interface ILayoutState extends JSONObject {
    /**
     * The layout state for a plugin editor container.
     */
    container: IPluginLayout;

    /**
     * The relative sizes of the plugin list and plugin editor.
     */
    sizes: number[];
  }

  /**
   * The layout information that is stored and restored from the state database.
   */
  export interface IPluginLayout extends JSONObject {
    /**
     * The current plugin being displayed.
     */
    plugin: string;
    sizes: number[];
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Return a normalized restored layout state that defaults to the presets.
   */
  export function normalizeState(
    saved: JSONObject | null,
    current: SettingEditor.ILayoutState
  ): SettingEditor.ILayoutState {
    if (!saved) {
      return JSONExt.deepCopy(DEFAULT_LAYOUT);
    }

    if (!('sizes' in saved) || !numberArray(saved.sizes)) {
      saved.sizes = JSONExt.deepCopy(DEFAULT_LAYOUT.sizes);
    }
    if (!('container' in saved)) {
      saved.container = JSONExt.deepCopy(DEFAULT_LAYOUT.container);
      return saved as SettingEditor.ILayoutState;
    }

    const container =
      'container' in saved &&
      saved.container &&
      typeof saved.container === 'object'
        ? (saved.container as JSONObject)
        : {};

    saved.container = {
      plugin:
        typeof container.plugin === 'string'
          ? container.plugin
          : DEFAULT_LAYOUT.container.plugin,
      sizes: numberArray(container.sizes)
        ? container.sizes
        : JSONExt.deepCopy(DEFAULT_LAYOUT.container.sizes)
    };

    return saved as SettingEditor.ILayoutState;
  }

  /**
   * Tests whether an array consists exclusively of numbers.
   */
  function numberArray(value: JSONValue): boolean {
    return Array.isArray(value) && value.every(x => typeof x === 'number');
  }
}
