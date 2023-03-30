/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ReactWidget } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { JSONExt, JSONObject, JSONValue } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { ISignal } from '@lumino/signaling';
import { SplitPanel, Widget } from '@lumino/widgets';
import * as React from 'react';
import { SettingsEditorPlaceholder } from './InstructionsPlaceholder';
import { PluginEditor } from './plugineditor';
import { PluginList } from './pluginlist';

/**
 * The ratio panes in the setting editor.
 */
const DEFAULT_LAYOUT: JsonSettingEditor.ILayoutState = {
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
export class JsonSettingEditor extends SplitPanel {
  /**
   * Create a new setting editor.
   */
  constructor(options: JsonSettingEditor.IOptions) {
    super({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
    this.translator = options.translator || nullTranslator;
    this.addClass('jp-SettingEditor');
    this.key = options.key;
    this.state = options.state;

    const { commands, editorFactory, rendermime } = options;
    const registry = (this.registry = options.registry);
    const instructions = (this._instructions = ReactWidget.create(
      <SettingsEditorPlaceholder translator={this.translator} />
    ));
    instructions.addClass('jp-SettingEditorInstructions');
    const editor = (this._editor = new PluginEditor({
      commands,
      editorFactory,
      registry,
      rendermime,
      translator: this.translator
    }));
    const confirm = () => editor.confirm();
    const list = (this._list = new PluginList({
      confirm,
      registry,
      translator: this.translator
    }));
    const when = options.when;

    if (when) {
      this._when = Array.isArray(when) ? Promise.all(when) : when;
    }

    this.addWidget(list);
    this.addWidget(instructions);

    SplitPanel.setStretch(list, 0);
    SplitPanel.setStretch(instructions, 1);
    SplitPanel.setStretch(editor, 1);

    editor.stateChanged.connect(this._onStateChanged, this);
    list.changed.connect(this._onStateChanged, this);
    this.handleMoved.connect(this._onStateChanged, this);
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
   * Whether the raw editor revert functionality is enabled.
   */
  get canRevertRaw(): boolean {
    return this._editor.raw.canRevert;
  }

  /**
   * Whether the raw editor save functionality is enabled.
   */
  get canSaveRaw(): boolean {
    return this._editor.raw.canSave;
  }

  /**
   * Emits when the commands passed in at instantiation change.
   */
  get commandsChanged(): ISignal<any, string[]> {
    return this._editor.raw.commandsChanged;
  }

  /**
   * The currently loaded settings.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._editor.settings;
  }

  /**
   * The inspectable raw user editor source for the currently loaded settings.
   */
  get source(): CodeEditor.IEditor {
    return this._editor.raw.source;
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
    this._instructions.dispose();
    this._list.dispose();
  }

  /**
   * Revert raw editor back to original settings.
   */
  revert(): void {
    this._editor.raw.revert();
  }

  /**
   * Save the contents of the raw editor.
   */
  save(): Promise<void> {
    return this._editor.raw.save();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.hide();
    this._fetchState()
      .then(() => {
        this.show();
        this._setState();
      })
      .catch(reason => {
        console.error('Fetching setting editor state failed', reason);
        this.show();
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
    this._state.sizes = this.relativeSizes();
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
    const state = this._state;

    editor.state = state.container;

    // Allow the message queue (which includes fit requests that might disrupt
    // setting relative sizes) to clear before setting sizes.
    requestAnimationFrame(() => {
      this.setRelativeSizes(state.sizes);
    });
  }

  /**
   * Set the presets of the setting editor.
   */
  private _setState(): void {
    const editor = this._editor;
    const list = this._list;
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

    const instructions = this._instructions;

    this.registry
      .load(container.plugin)
      .then(settings => {
        if (instructions.isAttached) {
          instructions.parent = null;
        }
        if (!editor.isAttached) {
          this.addWidget(editor);
        }
        editor.settings = settings;
        list.selection = container.plugin;
        this._setLayout();
      })
      .catch(reason => {
        console.error(`Loading ${container.plugin} settings failed.`, reason);
        list.selection = this._state.container.plugin = '';
        editor.settings = null;
        this._setLayout();
      });
  }

  protected translator: ITranslator;
  private _editor: PluginEditor;
  private _fetching: Promise<void> | null = null;
  private _instructions: Widget;
  private _list: PluginList;
  private _saving = false;
  private _state: JsonSettingEditor.ILayoutState =
    JSONExt.deepCopy(DEFAULT_LAYOUT);
  private _when: Promise<any>;
}

/**
 * A namespace for `JsonSettingEditor` statics.
 */
export namespace JsonSettingEditor {
  /**
   * The instantiation options for a setting editor.
   */
  export interface IOptions {
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
    current: JsonSettingEditor.ILayoutState
  ): JsonSettingEditor.ILayoutState {
    if (!saved) {
      return JSONExt.deepCopy(DEFAULT_LAYOUT);
    }

    if (!('sizes' in saved) || !numberArray(saved.sizes)) {
      saved.sizes = JSONExt.deepCopy(DEFAULT_LAYOUT.sizes);
    }
    if (!('container' in saved)) {
      saved.container = JSONExt.deepCopy(DEFAULT_LAYOUT.container);
      return saved as JsonSettingEditor.ILayoutState;
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

    return saved as JsonSettingEditor.ILayoutState;
  }

  /**
   * Tests whether an array consists exclusively of numbers.
   */
  function numberArray(value: JSONValue): boolean {
    return Array.isArray(value) && value.every(x => typeof x === 'number');
  }
}
