/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab
} from '@jupyterlab/application';

import {
  ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  BoxLayout, Widget
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
 * The class name added to all plugin lists.
 */
const PLUGIN_LIST_CLASS = 'jp-PluginList';

/**
 * The class name added to selected items.
 */
const SELECTED_CLASS = 'jp-mode-selected';


/**
 * An interface for modifying and saving application settings.
 */
class SettingEditor extends Widget {
  /**
   * Create a new setting editor.
   */
  constructor(options: SettingEditor.IOptions) {
    super();

    const settings = this.settings = options.settings;
    const layout = this.layout = new BoxLayout({ direction: 'left-to-right' });

    layout.addWidget(this._list = new PluginList({ settings }));
    layout.addWidget(this._editor = new PluginEditor());
    BoxLayout.setStretch(this._list, 1);
    BoxLayout.setStretch(this._editor, 3);

    this.addClass(SETTING_EDITOR_CLASS);
    settings.pluginChanged.connect(() => { this.update(); }, this);
    this._list.selected.connect((list, plugin) => {
      console.log('plugin clicked', plugin);
    }, this);
  }

  /**
   * The setting registry modified by the editor.
   */
  readonly settings: ISettingRegistry;

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
    /* no op */
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    this._editor.update();
    this._list.update();
  }

  private _editor: PluginEditor;
  private _list: PluginList;
}


/**
 * A namespace for `SettingEditor` statics.
 */
namespace SettingEditor {
  /**
   * The instantiation options for a setting editor.
   */
  export
  interface IOptions {
    /**
     * The setting registry the editor modifies.
     */
    settings: ISettingRegistry;
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
    this.settings = options.settings;
    this.addClass(PLUGIN_LIST_CLASS);
  }

  /**
   * The setting registry.
   */
  readonly settings: ISettingRegistry;

  /**
   * A signal emitted when a selection is made from the plugin list.
   */
  get selected(): ISignal<this, string> {
    return this._selected;
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
    const plugins = Private.sortPlugins(this.settings.plugins);
    this.node.textContent = '';
    plugins.forEach(plugin => {
      const item = Private.createListItem(plugin);
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
    if (id && id === this._selection) {
      return;
    }
    if (!id) {
      while (target !== this.node) {
        target = target.parentElement;
        id = target.getAttribute('data-id');
      }
    }
    if (id) {
      this._selection = id;
      this._selected.emit(id);
      this.update();
      return;
    }
  }

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
     * The setting registry for the plugin list.
     */
    settings: ISettingRegistry;
  }
}


/**
 * An individual plugin settings editor.
 */
class PluginEditor extends Widget {
  /**
   * Create a new plugin editor.
   */
  constructor() {
    super();
    this.addClass(PLUGIN_EDITOR_CLASS);
  }
}


/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export
  const open = 'setting-editor:open';
};


/**
 * Activate the setting editor.
 */
export
function activateSettingEditor(app: JupyterLab, restorer: ILayoutRestorer, settings: ISettingRegistry): void {
  const { commands, shell } = app;
  const namespace = 'setting-editor';
  const editor = new SettingEditor({ settings });
  const tracker = new InstanceTracker<SettingEditor>({ namespace });

  editor.id = namespace;
  editor.title.label = 'Settings';
  editor.title.closable = true;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: widget => ({ }),
    name: widget => namespace
  });
  tracker.add(editor);

  commands.addCommand(CommandIDs.open, {
    execute: () => {
      if (editor.parent === null) {
        shell.addToMainArea(editor);
      }
      shell.activateById(editor.id);
    },
    label: 'Settings'
  });
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Create a plugin list item.
   */
  export
  function createListItem(plugin: ISettingRegistry.IPlugin): HTMLLIElement {
    const li = document.createElement('li');
    const annotation = plugin.annotation;

    li.textContent = (annotation && annotation.label) || plugin.id;
    li.setAttribute('data-id', plugin.id);

    return li;
  }

  /**
   * Sort a list of plugins by ID.
   */
  export
  function sortPlugins(plugins: ISettingRegistry.IPlugin[]): ISettingRegistry.IPlugin[] {
    return plugins.sort((a, b) => a.id.localeCompare(b.id));
  }
}
