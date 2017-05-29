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
  Widget, BoxLayout
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
  }

  /**
   * The setting registry modified by the editor.
   */
  readonly settings: ISettingRegistry;

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
    /* no op */
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
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const plugins = Private.sortPlugins(this.settings.plugins);
    this.node.textContent = '';
    plugins.forEach(plugin => {
      const item = Private.createListItem(plugin);
      if (plugin.id === this._selected) {
        item.classList.add(SELECTED_CLASS);
      }
      this.node.appendChild(item);
    });
  }

  private _selected: string = '';
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
    li.textContent = plugin.id;
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
