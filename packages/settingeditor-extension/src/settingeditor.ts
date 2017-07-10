/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  CodeEditor, JSONEditor
} from '@jupyterlab/codeeditor';

import {
  ICON_CLASS_KEY, ICON_LABEL_KEY, ISettingRegistry, IStateDB, ObservableJSON
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  h, VirtualDOM, VirtualElement
} from '@phosphor/virtualdom';

import {
  PanelLayout, SplitPanel as SPanel, Widget
} from '@phosphor/widgets';


/**
 * The class name added to all setting editors.
 */
const SETTING_EDITOR_CLASS = 'jp-SettingEditor';

/**
 * The class name added to all plugin editors.
 */
const PLUGIN_EDITOR_CLASS = 'jp-PluginEditor';

/**
 * The class name added to all plugin fieldsets.
 */
const PLUGIN_FIELDSET_CLASS = 'jp-PluginFieldset';

/**
 * The class name added to all plugin lists.
 */
const PLUGIN_LIST_CLASS = 'jp-PluginList';

/**
 * The class name added to all plugin list icons.
 */
const PLUGIN_ICON_CLASS = 'jp-PluginList-icon';

/**
 * The class name added to selected items.
 */
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The class name added to the instructions widget.
 */
const INSTRUCTIONS_CLASS = 'jp-SettingEditorInstructions';

/**
 * The class name added to the instructions icon.
 */
const INSTRUCTIONS_ICON_CLASS = 'jp-SettingEditorInstructions-icon';

/**
 * The class name added to the instructions title.
 */
const INSTRUCTIONS_TITLE_CLASS = 'jp-SettingEditorInstructions-title';

/**
 * The class name added to the instructions text.
 */
const INSTRUCTIONS_TEXT_CLASS = 'jp-SettingEditorInstructions-text';

/**
 * The title of the instructions pane.
 */
const INSTRUCTIONS_TITLE = 'Settings';

/**
 * The instructions for using the setting editor.
 */
const INSTRUCTIONS_TEXT = `
Select a plugin from the list to view and edit its preferences.
`;

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
    this.addClass(SETTING_EDITOR_CLASS);
    this.key = options.key;
    this.state = options.state;

    const editorFactory = options.editorFactory;
    const layout = this.layout = new PanelLayout();
    const registry = this.registry = options.registry;
    const panel = this._panel = new SplitPanel({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });
    const instructions = this._instructions = new Widget({
      node: Private.createInstructionsNode()
    });
    const editor = this._editor = new PluginEditor({ editorFactory });
    const confirm = () => editor.confirm();
    const list = this._list = new PluginList({ confirm, registry });

    layout.addWidget(panel);
    panel.addWidget(list);
    panel.addWidget(instructions);

    editor.handleMoved.connect(this._onHandleMoved, this);
    list.selected.connect(this._onSelected, this);
    panel.handleMoved.connect(this._onHandleMoved, this);
  }

  /**
   * The state database key for the editor's state management.
   */
  readonly key: string;

  /**
   * The setting registry modified by the editor.
   */
  readonly registry: ISettingRegistry;

  /**
   * The state database used to store layout.
   */
  readonly state: IStateDB;

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
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);

    // Allow the message queue (which includes fit requests that might disrupt
    // setting relative sizes) to clear before setting sizes.
    requestAnimationFrame(() => {
      // Set the original (default) outer dimensions.
      this._panel.setRelativeSizes(this._presets.outer);
      this._fetchState()
        .then(() => { this._setPresets(); })
        .catch(reason => {
          console.error('Fetching setting editor state failed', reason);
          this._setPresets();
        });
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
    const editor = this._editor;
    const panel = this._panel;

    return this._fetching = state.fetch(key).then(saved => {
      this._fetching = null;

      if (this._saving) {
        return;
      }

      const inner = editor.sizes;
      const outer = panel.relativeSizes();
      const plugin = editor.settings ? editor.settings.plugin : '';

      if (!saved) {
        this._presets = { inner, outer, plugin };
        return;
      }

      const presets = this._presets;

      if (Array.isArray(saved.inner)) {
        presets.inner = saved.inner as number[];
      }
      if (Array.isArray(saved.outer)) {
        presets.outer = saved.outer as number[];
      }
      if (typeof saved.plugin === 'string') {
        presets.plugin = saved.plugin as string;
      }
    });
  }

  /**
   * Handle layout changes.
   */
  private _onHandleMoved(): void {
    this._presets.inner = this._editor.sizes;
    this._presets.outer = this._panel.relativeSizes();
    this._saveState().catch(reason => {
      console.error('Saving setting editor state failed', reason);
    });
  }

  /**
   * Handle a new selection in the plugin list.
   */
  private _onSelected(sender: any, plugin: string): void {
    this._presets.plugin = plugin;
    this._saveState()
      .then(() => { this._setPresets(); })
      .catch(reason => {
        console.error('Saving setting editor state failed', reason);
        this._setPresets();
      });
  }

  /**
   * Set the state of the setting editor.
   */
  private _saveState(): Promise<void> {
    const { key, state } = this;
    const value = this._presets;

    this._saving = true;
    return state.save(key, value)
      .then(() => { this._saving = false; })
      .catch(reason => {
        this._saving = false;
        throw reason;
      });
  }

  /**
   * Set the presets of the setting editor.
   */
  private _setPresets(): void {
    const editor = this._editor;
    const list = this._list;
    const panel = this._panel;
    const { inner, outer, plugin } = this._presets;

    panel.setRelativeSizes(outer);
    editor.sizes = inner;

    if (!plugin) {
      editor.settings = null;
      list.selection = '';
      return;
    }

    if (editor.settings && editor.settings.plugin === plugin) {
      return;
    }

    const instructions = this._instructions;

    this.registry.load(plugin).then(settings => {
      if (instructions.isAttached) {
        instructions.parent = null;
      }
      if (!editor.isAttached) {
        panel.addWidget(editor);
      }
      editor.settings = settings;
      list.selection = plugin;
    }).catch(reason => {
      console.error('Loading settings failed.', reason);
      list.selection = this._presets.plugin = '';
      editor.settings = null;
    });
  }

  private _editor: PluginEditor;
  private _fetching: Promise<void> | null = null;
  private _instructions: Widget;
  private _list: PluginList;
  private _panel: SplitPanel;
  private _presets = { inner: [5, 2], outer: [1, 3], plugin: '' };
  private _saving = false;
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
     * The state database used to store layout.
     */
    state: IStateDB;
  }
}


/**
 * A deprecated split panel that will be removed when the phosphor split panel
 * supports a handle moved signal.
 */
class SplitPanel extends SPanel {
  /**
   * Emits when the split handle has moved.
   */
  readonly handleMoved: ISignal<any, void> = new Signal<any, void>(this);

  handleEvent(event: Event): void {
    super.handleEvent(event);

    if (event.type === 'mouseup') {
      (this.handleMoved as Signal<any, void>).emit(void 0);
    }
  }
}


/**
 * A list of plugins with editable settings.
 */
class PluginList extends Widget {
  /**
   * Create a new plugin list.
   */
  constructor(options: PluginList.IOptions) {
    super({ node: document.createElement('ul') });
    this.registry = options.registry;
    this.addClass(PLUGIN_LIST_CLASS);
    this._confirm = options.confirm;
    this.registry.pluginChanged.connect(() => { this.update(); }, this);
  }

  /**
   * The setting registry.
   */
  readonly registry: ISettingRegistry;

  /**
   * A signal emitted when a selection is made from the plugin list.
   */
  get selected(): ISignal<this, string> {
    return this._selected;
  }

  /**
   * The selection value of the plugin list.
   */
  get selection(): string {
    return this._selection;
  }
  set selection(selection: string) {
    if (this._selection === selection) {
      return;
    }
    this._selection = selection;
    this.update();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Reset the list selection.
   */
  reset(): void {
    this._selection = '';
    this._selected.emit('');
    this.update();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.update();
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const plugins = Private.sortPlugins(this.registry.plugins);

    this.node.textContent = '';
    plugins.forEach(plugin => {
      const item = Private.createListItem(this.registry, plugin);

      if (plugin.id === this._selection) {
        item.classList.add(SELECTED_CLASS);
      }

      this.node.appendChild(item);
    });
  }

  /**
   * Handle the `'click'` event for the plugin list.
   *
   * @param event - The DOM event sent to the widget
   */
  protected _evtClick(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    let id = target.getAttribute('data-id');

    if (id === this._selection) {
      return;
    }

    if (!id) {
      while (!id && target !== this.node) {
        target = target.parentElement;
        id = target.getAttribute('data-id');
      }
    }

    if (id) {
      this._confirm().then(() => {
        this._selection = id;
        this._selected.emit(id);
        this.update();
      }).catch(() => { /* no op */ });
    }
  }

  private _confirm: () => Promise<void> | null = null;
  private _selected = new Signal<this, string>(this);
  private _selection = '';
}


/**
 * A namespace for `PluginList` statics.
 */
namespace PluginList {
  /**
   * The instantiation options for a plugin list.
   */
  export
  interface IOptions {
    /**
     * A function that allows for asynchronously confirming a selection.
     *
     * #### Notest
     * If the promise returned by the function resolves, then the selection will
     * succeed and emit an event. If the promise rejects, the selection is not
     * made.
     */
    confirm: () => Promise<void>;

    /**
     * The setting registry for the plugin list.
     */
    registry: ISettingRegistry;
  }
}


/**
 * An individual plugin settings editor.
 */
class PluginEditor extends Widget {
  /**
   * Create a new plugin editor.
   */
  constructor(options: PluginEditor.IOptions) {
    super();
    this.addClass(PLUGIN_EDITOR_CLASS);

    const { editorFactory } = options;
    const collapsible = false;
    const layout = this.layout = new PanelLayout();
    const panel = this._panel = new SplitPanel({
      orientation: 'vertical',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });

    this.handleMoved = panel.handleMoved;
    this._editor = new JSONEditor({ collapsible, editorFactory });
    this._fieldset = new PluginFieldset();

    layout.addWidget(panel);
    panel.addWidget(this._editor);
    panel.addWidget(this._fieldset);
  }

  /**
   * Emits when the split handle has moved.
   */
  readonly handleMoved: ISignal<any, void>;

  /**
   * The plugin settings being edited.
   */
  get settings(): ISettingRegistry.ISettings {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings) {
    if (!settings && !this._settings) {
      return;
    }

    const samePlugin = (settings && this._settings) &&
      settings.plugin === this._settings.plugin;

    if (samePlugin) {
      return;
    }

    const fieldset = this._fieldset;
    const editor = this._editor;

    // Disconnect old source change handler.
    if (editor.source) {
      editor.source.changed.disconnect(this._onSourceChanged, this);
    }

    // Disconnect old settings change handler.
    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }

    if (settings) {
      this._settings = fieldset.settings = settings;
      this._settings.changed.connect(this._onSettingsChanged, this);
      this._onSettingsChanged();
    } else {
      this._settings = fieldset.settings = null;
      editor.source = null;
    }

    this.update();
  }

  /**
   * Get the relative sizes of the two editor panels.
   */
  get sizes(): number[] {
    return this._panel.relativeSizes();
  }
  set sizes(sizes: number[]) {
    this._panel.setRelativeSizes(sizes);
  }

  /**
   * If the editor is in a dirty state, confirm that the user wants to leave.
   */
  confirm(): Promise<void> {
    if (this.isHidden || !this.isAttached || !this._editor.isDirty) {
      return Promise.resolve(void 0);
    }

    return showDialog({
      title: 'You have unsaved changes.',
      body: 'Do you want to leave without saving?',
      buttons: [Dialog.cancelButton(), Dialog.okButton()]
    }).then(result => {
      if (!result.accept) {
        throw new Error('User cancelled.');
      }
    });
  }

  /**
   * Dispose of the resources held by the plugin editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    super.dispose();
    this._editor.dispose();
    this._editor = null;
    this._fieldset.dispose();
    this._fieldset = null;
    this._panel.dispose();
    this._panel = null;
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const json = this._editor;
    const fieldset = this._fieldset;
    const settings = this._settings;

    if (settings) {
      json.show();
      fieldset.show();
      json.editor.refresh();
      return;
    }

    json.hide();
    fieldset.hide();
  }

  /**
   * Handle updates to the settings.
   */
  private _onSettingsChanged(): void {
    const editor = this._editor;
    const settings = this._settings;
    const values = settings.user;

    editor.source = new ObservableJSON({ values });
    editor.source.changed.connect(this._onSourceChanged, this);
  }

  /**
   * Handle source changes in the underlying editor.
   */
  private _onSourceChanged(): void {
    const editor = this._editor;
    const settings = this._settings;

    settings.save(editor.source.toJSON());
  }

  private _editor: JSONEditor = null;
  private _fieldset: PluginFieldset = null;
  private _panel: SplitPanel = null;
  private _settings: ISettingRegistry.ISettings | null = null;
}


/**
 * A namespace for `PluginEditor` statics.
 */
namespace PluginEditor {
  /**
   * The instantiation options for a plugin editor.
   */
  export
  interface IOptions {
    /**
     * The editor factory used by the plugin editor.
     */
    editorFactory: CodeEditor.Factory;
  }
}


/**
 * An individual plugin settings fieldset.
 */
class PluginFieldset extends Widget {
  /**
   * Create a new plugin fieldset.
   */
  constructor() {
    super({ node: document.createElement('fieldset') });
    this.addClass(PLUGIN_FIELDSET_CLASS);
  }

  /**
   * The plugin settings.
   */
  get settings(): ISettingRegistry.ISettings {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings) {
    this._settings = settings;
    this.update();
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const settings = this._settings;

    // Empty the node.
    this.node.textContent = '';

    // Populate if possible.
    if (settings) {
      Private.populateFieldset(this.node, settings.plugin, settings.schema);
    }
  }

  private _settings: ISettingRegistry.ISettings | null = null;
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   */
  export
  function createInstructionsNode(): HTMLElement {
    return VirtualDOM.realize(h.div({ className: INSTRUCTIONS_CLASS },
      h.h2(
        h.span({ className: `${INSTRUCTIONS_ICON_CLASS} jp-JupyterIcon` }),
        h.span({ className: INSTRUCTIONS_TITLE_CLASS }, INSTRUCTIONS_TITLE)),
      h.span({ className: INSTRUCTIONS_TEXT_CLASS }, INSTRUCTIONS_TEXT)));
  }

  /**
   * Create a plugin list item.
   */
  export
  function createListItem(registry: ISettingRegistry, plugin: ISettingRegistry.IPlugin): HTMLLIElement {
    const icon = getHint(ICON_CLASS_KEY, registry, plugin);
    const iconClass = `${PLUGIN_ICON_CLASS}${icon ? ' ' + icon : ''}`;
    const iconLabel = getHint(ICON_LABEL_KEY, registry, plugin);
    const title = plugin.schema.title || plugin.id;
    const caption = `(${plugin.id}) ${plugin.schema.description}`;

    return VirtualDOM.realize(
      h.li({ dataset: { id: plugin.id }, title: caption },
        h.span({ className: iconClass, title: iconLabel }),
        h.span(title))
    ) as HTMLLIElement;
  }

  /**
   * Check the plugin for a rendering hint's value.
   *
   * #### Notes
   * The order of priority for overridden hints is as follows, from most
   * important to least:
   * 1. Data set by the end user in a settings file.
   * 2. Data set by the plugin author as a schema default.
   * 3. Data set by the plugin author as a top-level key of the schema.
   */
  function getHint(key: string, registry: ISettingRegistry, plugin: ISettingRegistry.IPlugin): string {
    // First, give priorty to checking if the hint exists in the user data.
    let hint = plugin.data.user[key];

    // Second, check to see if the hint exists in composite data, which folds
    // in default values from the schema.
    if (!hint) {
      hint = plugin.data.composite[key];
    }

    // Third, check to see if the plugin schema has defined the hint.
    if (!hint) {
      hint = plugin.schema[key];
    }

    // Finally, use the defaults from the registry schema.
    if (!hint) {
      const properties = registry.schema.properties;

      hint = properties && properties[key] && properties[key].default;
    }

    return typeof hint === 'string' ? hint : '';
  }

  /**
   * Populate the fieldset with a specific plugin's metadata.
   */
  export
  function populateFieldset(node: HTMLElement, id: string, schema: ISettingRegistry.ISchema): void {
    const fields: { [key: string]: VirtualElement } = Object.create(null);
    const properties = schema.properties || { };
    const title = `(${id}) ${schema.description}`;
    const label = `Fields - ${schema.title || id}`;
    const headers = h.tr(
      h.th('Key'),
      h.th('Type'),
      h.th('Default'));

    Object.keys(properties).forEach(key => {
      const field = properties[key];
      const { title, type } = field;
      fields[key] = h.tr(
        h.td(h.code({ title }, key)),
        h.td(h.code(type)),
        h.td('default' in field ? h.code(JSON.stringify(field.default)) : ''));
    });

    const rows: VirtualElement[] = Object.keys(fields)
      .sort((a, b) => a.localeCompare(b)).map(key => fields[key]);

    node.appendChild(VirtualDOM.realize(h.legend({ title }, label)));
    if (rows.length) {
      node.appendChild(VirtualDOM.realize(h.table(headers, rows)));
    }
  }

  /**
   * Sort a list of plugins by ID.
   */
  export
  function sortPlugins(plugins: ISettingRegistry.IPlugin[]): ISettingRegistry.IPlugin[] {
    return plugins.sort((a, b) => {
      return (a.schema.title || a.id).localeCompare(b.schema.title || b.id);
    });
  }
}
