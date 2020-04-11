/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { classes, LabIcon, settingsIcon } from '@jupyterlab/ui-components';

import { Message } from '@lumino/messaging';

import { ISignal, Signal } from '@lumino/signaling';

import { Widget } from '@lumino/widgets';

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
   * The selection value of the plugin list.
   */
  get scrollTop(): number | undefined {
    return this.node.querySelector('ul')?.scrollTop;
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
    const selection = this._selection;

    Private.populateList(registry, selection, node);
    const ul = node.querySelector('ul');
    if (ul && this._scrollTop !== undefined) {
      ul.scrollTop = this._scrollTop;
    }
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
        this._selection = id!;
        this._changed.emit(undefined);
        this.update();
      })
      .catch(() => {
        /* no op */
      });
  }

  private _changed = new Signal<this, void>(this);
  private _confirm: () => Promise<void>;
  private _scrollTop: number | undefined = 0;
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
   * The JupyterLab plugin schema key for the setting editor
   * icon class of a plugin.
   */
  const ICON_KEY = 'jupyter.lab.setting-icon';

  /**
   * The JupyterLab plugin schema key for the setting editor
   * icon class of a plugin.
   */
  const ICON_CLASS_KEY = 'jupyter.lab.setting-icon-class';

  /**
   * The JupyterLab plugin schema key for the setting editor
   * icon label of a plugin.
   */
  const ICON_LABEL_KEY = 'jupyter.lab.setting-icon-label';

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
    selection: string,
    node: HTMLElement
  ): void {
    const plugins = sortPlugins(registry).filter(plugin => {
      const { schema } = plugin;
      const deprecated = schema['jupyter.lab.setting-deprecated'] === true;
      const editable = Object.keys(schema.properties || {}).length > 0;
      const extensible = schema.additionalProperties !== false;

      return !deprecated && (editable || extensible);
    });
    const items = plugins.map(plugin => {
      const { id, schema, version } = plugin;
      const itemTitle = `${schema.description}\n${id}\n${version}`;
      const icon = getHint(ICON_KEY, registry, plugin);
      const iconClass = getHint(ICON_CLASS_KEY, registry, plugin);
      const iconTitle = getHint(ICON_LABEL_KEY, registry, plugin);

      return (
        <li
          className={id === selection ? 'jp-mod-selected' : ''}
          data-id={id}
          key={id}
          title={itemTitle}
        >
          <LabIcon.resolveReact
            icon={icon || (iconClass ? undefined : settingsIcon)}
            iconClass={classes(iconClass, 'jp-Icon')}
            title={iconTitle}
            tag="span"
            stylesheet="settingsEditor"
          />
          <span>{schema.title || id}</span>
        </li>
      );
    });

    ReactDOM.unmountComponentAtNode(node);
    ReactDOM.render(<ul>{items}</ul>, node);
  }

  /**
   * Sort a list of plugins by title and ID.
   */
  function sortPlugins(registry: ISettingRegistry): ISettingRegistry.IPlugin[] {
    return Object.keys(registry.plugins)
      .map(plugin => registry.plugins[plugin]!)
      .sort((a, b) => {
        return (a.schema.title || a.id).localeCompare(b.schema.title || b.id);
      });
  }
}
