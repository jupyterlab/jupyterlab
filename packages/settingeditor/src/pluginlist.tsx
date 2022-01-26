/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ReactWidget } from '@jupyterlab/apputils';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  classes,
  FilterBox,
  LabIcon,
  settingsIcon
} from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import React from 'react';

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
 * A list of plugins with editable settings.
 */
export class PluginList extends ReactWidget {
  /**
   * Create a new plugin list.
   */
  constructor(options: PluginList.IOptions) {
    super();
    this.registry = options.registry;
    this.translator = options.translator || nullTranslator;
    this.addClass('jp-PluginList');
    this._confirm = options.confirm;
    this.registry.pluginChanged.connect(() => {
      this.update();
    }, this);
    this.mapPlugins = this.mapPlugins.bind(this);
    this._filter = (item: ISettingRegistry.IPlugin) => true;
    this.setFilter = this.setFilter.bind(this);
    this.setError = this.setError.bind(this);
    this._evtMousedown = this._evtMousedown.bind(this);

    this._allPlugins = PluginList.sortPlugins(this.registry).filter(plugin => {
      const { schema } = plugin;
      const deprecated = schema['jupyter.lab.setting-deprecated'] === true;
      const editable = Object.keys(schema.properties || {}).length > 0;
      const extensible = schema.additionalProperties !== false;
      // Filters out a couple of plugins that take too long to load in the new settings editor.
      const correctEditor =
        // If this is the json settings editor, anything is fine
        this._confirm ||
        // If this is the new settings editor, remove context menu / main menu settings.
        (!this._confirm && !(options.toSkip ?? []).includes(plugin.id));

      return (
        !deprecated &&
        correctEditor &&
        (editable || extensible) &&
        this._filter?.(plugin)
      );
    });

    this._errors = {};
    this.selection = this._allPlugins[0].id;
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

  get hasErrors(): boolean {
    for (const id in this._errors) {
      if (this._errors[id]) {
        return true;
      }
    }
    return false;
  }

  /**
   * The selection value of the plugin list.
   */
  get selection(): string {
    return this._selection;
  }
  set selection(selection: string) {
    this._selection = selection;
    this.update();
  }

  get filter(): (item: ISettingRegistry.IPlugin) => boolean {
    return this._filter;
  }
  set filter(filter: (item: ISettingRegistry.IPlugin) => boolean) {
    this._filter = filter;
  }

  protected async updateModifiedPlugins(): Promise<void> {
    const modifiedPlugins = [];
    for (const plugin of this._allPlugins) {
      const settings: Settings = (await this.registry.load(
        plugin.id
      )) as Settings;
      if (settings.isModified) {
        modifiedPlugins.push(plugin);
      }
    }
    if (this._modifiedPlugins.length !== modifiedPlugins.length) {
      this._modifiedPlugins = modifiedPlugins;
      this.update();
      return;
    }
    for (const plugin of modifiedPlugins) {
      if (!this._modifiedPlugins.find(p => p.id === plugin.id)) {
        this._modifiedPlugins = modifiedPlugins;
        this.update();
        return;
      }
    }
  }

  get handleSelectSignal(): ISignal<this, string> {
    return this._handleSelectSignal;
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    void this.updateModifiedPlugins();
    const ul = this.node.querySelector('ul');
    if (ul && this._scrollTop !== undefined) {
      ul.scrollTop = this._scrollTop;
    }
    super.onUpdateRequest(msg);
  }

  /**
   * Handle the `'mousedown'` event for the plugin list.
   *
   * @param event - The DOM event sent to the widget
   */
  private _evtMousedown(event: React.MouseEvent<HTMLButtonElement>): void {
    const target = event.currentTarget;
    const id = target.getAttribute('data-id');

    if (!id) {
      return;
    }

    if (this._confirm) {
      this._confirm(id)
        .then(() => {
          this.selection = id!;
          this._changed.emit(undefined);
          this.update();
        })
        .catch(() => {
          /* no op */
        });
    } else {
      this._scrollTop = this.scrollTop;
      this._selection = id!;
      this._handleSelectSignal.emit(id!);
      this._changed.emit(undefined);
      this.update();
    }
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
  getHint(
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

  setFilter(filter: (item: string) => boolean): void {
    this._filter = (value: ISettingRegistry.IPlugin) => {
      return filter(value.schema.title?.toLowerCase() ?? '');
    };
    this.update();
  }

  setError(id: string, error: boolean): void {
    if (this._errors[id] !== error) {
      this._errors[id] = error;
      this.update();
    } else {
      this._errors[id] = error;
    }
  }

  mapPlugins(plugin: ISettingRegistry.IPlugin): JSX.Element {
    const { id, schema, version } = plugin;
    const trans = this.translator.load('jupyterlab');
    const title =
      typeof schema.title === 'string' ? trans._p('schema', schema.title) : id;
    const description =
      typeof schema.description === 'string'
        ? trans._p('schema', schema.description)
        : '';
    const itemTitle = `${description}\n${id}\n${version}`;
    const icon = this.getHint(ICON_KEY, this.registry, plugin);
    const iconClass = this.getHint(ICON_CLASS_KEY, this.registry, plugin);
    const iconTitle = this.getHint(ICON_LABEL_KEY, this.registry, plugin);

    return (
      <button
        onClick={this._evtMousedown}
        className={`${
          id === this.selection
            ? 'jp-mod-selected jp-PluginList-entry'
            : 'jp-PluginList-entry'
        } ${this._errors[id] ? 'jp-ErrorPlugin' : ''}`}
        data-id={id}
        key={id}
        title={itemTitle}
      >
        {id === this.selection || this._errors[id] ? (
          <div className="jp-SelectedIndicator" />
        ) : null}
        <LabIcon.resolveReact
          icon={icon || (iconClass ? undefined : settingsIcon)}
          iconClass={classes(iconClass, 'jp-Icon')}
          title={iconTitle}
          tag="span"
          stylesheet="settingsEditor"
        />
        <span>{title}</span>
      </button>
    );
  }

  render(): JSX.Element {
    const trans = this.translator.load('jupyterlab');

    const modifiedItems = this._modifiedPlugins
      .filter(this._filter)
      .map(this.mapPlugins);
    const otherItems = this._allPlugins
      .filter(
        plugin =>
          !this._modifiedPlugins.includes(plugin) && this._filter(plugin)
      )
      .map(this.mapPlugins);

    return (
      <div className="jp-PluginList-wrapper">
        <FilterBox
          updateFilter={this.setFilter}
          useFuzzyFilter={true}
          placeholder={trans.__('Search…')}
          forceRefresh={false}
        />
        {modifiedItems.length > 0 && (
          <div>
            <h1 className="jp-PluginList-header">{trans.__('Modified')}</h1>
            <ul>{modifiedItems}</ul>
          </div>
        )}
        <h1 className="jp-PluginList-header">{trans.__('Settings')}</h1>
        <ul>{otherItems}</ul>
      </div>
    );
  }

  protected translator: ITranslator;
  private _changed = new Signal<this, void>(this);
  private _errors: { [id: string]: boolean };
  private _filter: (item: ISettingRegistry.IPlugin) => boolean;
  private _handleSelectSignal = new Signal<this, string>(this);
  private _modifiedPlugins: ISettingRegistry.IPlugin[] = [];
  private _allPlugins: ISettingRegistry.IPlugin[] = [];
  private _confirm?: (id: string) => Promise<void>;
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
     * #### Notes
     * If the promise returned by the function resolves, then the selection will
     * succeed and emit an event. If the promise rejects, the selection is not
     * made.
     */
    confirm?: (id: string) => Promise<void>;

    /**
     * The setting registry for the plugin list.
     */
    registry: ISettingRegistry;

    /**
     * List of plugins to skip
     */
    toSkip?: string[];

    /**
     * The setting registry for the plugin list.
     */
    translator?: ITranslator;
  }

  /**
   * Sort a list of plugins by title and ID.
   */
  export function sortPlugins(
    registry: ISettingRegistry
  ): ISettingRegistry.IPlugin[] {
    return Object.keys(registry.plugins)
      .map(plugin => registry.plugins[plugin]!)
      .sort((a, b) => {
        return (a.schema.title || a.id).localeCompare(b.schema.title || b.id);
      });
  }
}
