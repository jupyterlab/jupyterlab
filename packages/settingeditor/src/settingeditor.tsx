/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  ISettingRegistry, IStateDB
} from '@jupyterlab/coreutils';

import {
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JSONExt, JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal
} from '@phosphor/signaling';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import {
  PluginEditor
} from './plugineditor';

import {
  PluginList
} from './pluginlist';

import {
  SplitPanel
} from './splitpanel';


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
export
class SettingEditor extends Widget {
  /**
   * Create a new setting editor.
   */
  constructor(options: SettingEditor.IOptions) {
    super();
    this.addClass('jp-SettingEditor');
    this.key = options.key;
    this.state = options.state;

    const { commands, editorFactory, rendermime } = options;
    const layout = this.layout = new PanelLayout();
    const registry = this.registry = options.registry;
    const panel = this._panel = new SplitPanel({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
    const instructions = this._instructions = new Widget();
    const editor = this._editor = new PluginEditor({
      commands, editorFactory, registry, rendermime
    });
    const confirm = () => editor.confirm();
    const list = this._list = new PluginList({ confirm, registry });
    const when = options.when;

    instructions.addClass('jp-SettingEditorInstructions');
    Private.populateInstructionsNode(instructions.node);

    if (when) {
      this._when = Array.isArray(when) ? Promise.all(when) : when;
    }

    panel.addClass('jp-SettingEditor-main');
    layout.addWidget(panel);
    panel.addWidget(list);
    panel.addWidget(instructions);

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
   * Whether the debug panel is visible.
   */
  get isDebugVisible(): boolean {
    return this._editor.raw.isDebugVisible;
  }

  /**
   * The currently loaded settings.
   */
  get settings(): ISettingRegistry.ISettings {
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
    this._panel.dispose();
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
   * Toggle the debug functionality.
   */
  toggleDebug(): void {
    this._editor.raw.toggleDebug();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._panel.hide();
    this._fetchState().then(() => {
      this._panel.show();
      this._setState();
    }).catch(reason => {
      console.error('Fetching setting editor state failed', reason);
      this._panel.show();
      this._setState();
    });
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    this._editor.confirm().then(() => {
      super.onCloseRequest(msg);
      this.dispose();
    }).catch(() => { /* no op */ });
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

    return this._fetching = Promise.all(promises).then(([saved]) => {
      this._fetching = null;

      if (this._saving) {
        return;
      }

      this._state = Private.normalizeState(saved, this._state);
    });
  }

  /**
   * Handle root level layout state changes.
   */
  private _onStateChanged(): void {
    this._state.sizes = this._panel.relativeSizes();
    this._state.container = this._editor.state;
    this._state.container.editor = this._list.editor;
    this._state.container.plugin = this._list.selection;
    this._saveState()
      .then(() => { this._setState(); })
      .catch(reason => {
        console.error('Saving setting editor state failed', reason);
        this._setState();
      });
  }

  /**
   * Set the state of the setting editor.
   */
  private _saveState(): Promise<void> {
    const { key, state } = this;
    const value = this._state;

    this._saving = true;
    return state.save(key, value)
      .then(() => { this._saving = false; })
      .catch((reason: any) => {
        this._saving = false;
        throw reason;
      });
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
    requestAnimationFrame(() => { panel.setRelativeSizes(state.sizes); });
  }

  /**
   * Set the presets of the setting editor.
   */
  private _setState(): void {
    const editor = this._editor;
    const list = this._list;
    const panel = this._panel;
    const { container } = this._state;

    if (!container.plugin) {
      editor.settings = null;
      list.selection = '';
      this._setLayout();
      return;
    }

    if (editor.settings && editor.settings.plugin === container.plugin) {
      this._setLayout();
      return;
    }

    const instructions = this._instructions;

    this.registry.load(container.plugin).then(settings => {
      if (instructions.isAttached) {
        instructions.parent = null;
      }
      if (!editor.isAttached) {
        panel.addWidget(editor);
      }
      editor.settings = settings;
      list.editor = container.editor;
      list.selection = container.plugin;
      this._setLayout();
    }).catch((reason: Error) => {
      console.error(`Loading settings failed: ${reason.message}`);
      list.selection = this._state.container.plugin = '';
      editor.settings = null;
      this._setLayout();
    });
  }

  private _editor: PluginEditor;
  private _fetching: Promise<void> | null = null;
  private _instructions: Widget;
  private _list: PluginList;
  private _panel: SplitPanel;
  private _saving = false;
  private _state: SettingEditor.ILayoutState = JSONExt.deepCopy(DEFAULT_LAYOUT);
  private _when: Promise<any>;
}


/**
 * A namespace for `SettingEditor` statics.
 */
export
namespace SettingEditor {
  /**
   * The instantiation options for a setting editor.
   */
  export
  interface IOptions {
    /**
     * The toolbar commands and registry for the setting editor toolbar.
     */
    commands: {
      /**
       * The command registry.
       */
      registry: CommandRegistry;

      /**
       * The debug command ID.
       */
      debug: string;

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
    rendermime?: RenderMimeRegistry;

    /**
     * The state database used to store layout.
     */
    state: IStateDB;

    /**
     * The point after which the editor should restore its state.
     */
    when?: Promise<any> | Array<Promise<any>>;
  }

  /**
   * The layout state for the setting editor.
   */
  export
  interface ILayoutState extends JSONObject {
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
  export
  interface IPluginLayout extends JSONObject {
    /**
     * The current plugin being displayed.
     */
    plugin: string;

    editor: 'raw' | 'table';

    sizes: number[];
  }
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Populate the instructions text node.
   */
  export
  function populateInstructionsNode(node: HTMLElement): void {
    const iconClass = `jp-SettingEditorInstructions-icon jp-JupyterIcon`;

    ReactDOM.render((
      <React.Fragment>
        <h2>
          <span className={iconClass}></span>
          <span className='jp-SettingEditorInstructions-title'>Settings</span>
        </h2>
        <span className='jp-SettingEditorInstructions-text'>
          Select a plugin from the list to view and edit its preferences.
        </span>
      </React.Fragment>
    ), node);
  }

  /**
   * Return a normalized restored layout state that defaults to the presets.
   */
  export
  function normalizeState(saved: JSONObject | null, current: SettingEditor.ILayoutState): SettingEditor.ILayoutState {
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

    const container = ('container' in saved) &&
      saved.container &&
      typeof saved.container === 'object' ? saved.container as JSONObject
        : { };

    saved.container = {
      editor: container.editor === 'raw' || container.editor === 'table' ?
        container.editor : DEFAULT_LAYOUT.container.editor,
      plugin: typeof container.plugin === 'string' ? container.plugin
        : DEFAULT_LAYOUT.container.plugin,
      sizes: numberArray(container.sizes) ? container.sizes
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
