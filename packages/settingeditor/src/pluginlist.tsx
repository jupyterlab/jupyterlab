/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ICON_CLASS_KEY,
  ICON_LABEL_KEY,
  ISettingRegistry
} from '@jupyterlab/coreutils';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

/**
 * A list of plugins with editable settings.
 */
export class PluginList extends Widget {
  /**
   * Create a new plugin list.
   */
  constructor(options: PluginList.IOptions) {
    super();
    this.registry = options.registry;
    this.addClass('jp-PluginList');
    this._confirm = options.confirm;
    this.registry.pluginChanged.connect(() => {
      this.update();
    }, this);
  }

  /**
   * The setting registry.
   */
  readonly registry: ISettingRegistry;

  /**
   * A signal emitted when a list user interaction happens.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The editor type currently selected.
   */
  get editor(): 'raw' | 'table' {
    return this._editor;
  }
  set editor(editor: 'raw' | 'table') {
    if (this._editor === editor) {
      return;
    }

    this._editor = editor;
    this.update();
  }

  /**
   * The selection value of the plugin list.
   */
  get scrollTop(): number {
    return this.node.querySelector('ul').scrollTop;
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
   * called in response to events on the plugin list's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtMousedown(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('mousedown', this);
    this.update();
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const { node, registry } = this;
    const type = this._editor;
    const selection = this._selection;

    Private.populateList(registry, type, selection, node);
    node.querySelector('ul').scrollTop = this._scrollTop;
  }

  /**
   * Handle the `'mousedown'` event for the plugin list.
   *
   * @param event - The DOM event sent to the widget
   */
  private _evtMousedown(event: MouseEvent): void {
    event.preventDefault();

    let target = event.target as HTMLElement;
    let id = target.getAttribute('data-id');

    if (id === this._selection) {
      return;
    }

    const editor = target.getAttribute('data-editor');

    if (editor) {
      this._editor = editor as 'raw' | 'table';
      this._changed.emit(undefined);
      this.update();
      return;
    }

    if (!id) {
      while (!id && target !== this.node) {
        target = target.parentElement as HTMLElement;
        id = target.getAttribute('data-id');
      }
    }

    if (!id) {
      return;
    }

    this._confirm()
      .then(() => {
        this._scrollTop = this.scrollTop;
        this._selection = id;
        this._changed.emit(undefined);
        this.update();
      })
      .catch(() => {
        /* no op */
      });
  }

  private _changed = new Signal<this, void>(this);
  private _confirm: () => Promise<void>;
  private _editor: 'raw' | 'table' = 'raw';
  private _scrollTop = 0;
  private _selection = '';
}

/**
 * A namespace for `PluginList` statics.
 */
export namespace PluginList {
  /**
   * The instantiation options for a plugin list.
   */
  export interface IOptions {
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
 * A namespace for private module data.
 */
namespace Private {
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
  function getHint(
    key: string,
    registry: ISettingRegistry,
    plugin: ISettingRegistry.IPlugin
  ): string {
    // First, give priority to checking if the hint exists in the user data.
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
      const { properties } = registry.schema;

      hint = properties && properties[key] && properties[key].default;
    }

    return typeof hint === 'string' ? hint : '';
  }

  /**
   * Populate the plugin list.
   */
  export function populateList(
    registry: ISettingRegistry,
    type: 'raw' | 'table',
    selection: string,
    node: HTMLElement
  ): void {
    const plugins = sortPlugins(registry.plugins);
    const items = plugins.map(plugin => {
      const itemTitle = `(${plugin.id}) ${plugin.schema.description}`;
      const image = getHint(ICON_CLASS_KEY, registry, plugin);
      const iconClass = `jp-PluginList-icon${image ? ' ' + image : ''}`;
      const iconTitle = getHint(ICON_LABEL_KEY, registry, plugin);
      return (
        <li
          className={plugin.id === selection ? 'jp-mod-selected' : ''}
          data-id={plugin.id}
          key={plugin.id}
          title={itemTitle}
        >
          <span className={iconClass} title={iconTitle} />
          <span>{plugin.schema.title || plugin.id}</span>
        </li>
      );
    });

    ReactDOM.unmountComponentAtNode(node);
    ReactDOM.render(
      <React.Fragment>
        <div className="jp-PluginList-switcher">
          <button data-editor="raw" disabled={type === 'raw'}>
            Raw View
          </button>
          <button data-editor="table" disabled={type === 'table'}>
            Table View
          </button>
        </div>
        <ul>{items}</ul>
      </React.Fragment>,
      node
    );
  }

  /**
   * Sort a list of plugins by ID.
   */
  function sortPlugins(
    plugins: ISettingRegistry.IPlugin[]
  ): ISettingRegistry.IPlugin[] {
    return plugins.sort((a, b) => {
      return (a.schema.title || a.id).localeCompare(b.schema.title || b.id);
    });
  }
}
