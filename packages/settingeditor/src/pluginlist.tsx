/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  classes,
  FilterBox,
  IScore,
  LabIcon,
  settingsIcon,
  updateFilterFunction
} from '@jupyterlab/ui-components';
import { StringExt } from '@lumino/algorithm';
import { PartialJSONObject } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';

import type { SettingsEditor } from './settingseditor';

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
    this.setFilter = this.setFilter.bind(this);
    this.setFilter(
      options.query ? updateFilterFunction(options.query, false, false) : null
    );
    this.setError = this.setError.bind(this);
    this._evtMousedown = this._evtMousedown.bind(this);
    this._query = options.query ?? '';

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

      return !deprecated && correctEditor && (editable || extensible);
    });

    /**
     * Loads all settings and stores them for easy access when displaying search results.
     */
    const loadSettings = async () => {
      for (const plugin of this._allPlugins) {
        const pluginSettings = (await this.registry.load(
          plugin.id
        )) as Settings;
        this._settings[plugin.id] = pluginSettings;
      }
      this.update();
    };
    void loadSettings();

    this._errors = {};
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

  get filter(): SettingsEditor.PluginSearchFilter {
    return this._filter;
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

  /**
   * Signal that fires when search filter is updated so that settings panel can filter results.
   */
  get updateFilterSignal(): ISignal<this, SettingsEditor.PluginSearchFilter> {
    return this._updateFilterSignal;
  }

  get handleSelectSignal(): ISignal<this, string> {
    return this._handleSelectSignal;
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
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
  private _evtMousedown(event: React.MouseEvent<HTMLDivElement>): void {
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

  /**
   * Function to recursively filter properties that match search results.
   * @param filter - Function to filter based on search results
   * @param props - Schema properties being filtered
   * @param definitions - Definitions to use for filling in references in properties
   * @param ref - Reference to a definition
   * @returns - String array of properties that match the search results.
   */
  getFilterString(
    filter: (item: string) => Partial<IScore> | null,
    props: ISettingRegistry.IProperty,
    definitions?: any,
    ref?: string
  ): string[] {
    // If properties given are references, populate properties
    // with corresponding definition.
    if (ref && definitions) {
      ref = ref.replace('#/definitions/', '');
      props = definitions[ref] ?? {};
    }

    // If given properties are an object, advance into the properties
    // for that object instead.
    if (props.properties) {
      props = props.properties;
      // If given properties are an array, advance into the properties
      // for the items instead.
    } else if (props.items) {
      props = props.items as any;
      // Otherwise, you've reached the base case and don't need to check for matching properties
    } else {
      return [];
    }

    // If reference found, recurse
    if (props['$ref']) {
      return this.getFilterString(
        filter,
        props,
        definitions,
        props['$ref'] as string
      );
    }

    // Make sure props is non-empty before calling reduce
    if (Object.keys(props).length === 0) {
      return [];
    }

    // Iterate through the properties and check for titles / descriptions that match search.
    return Object.keys(props).reduce((acc: string[], value: any) => {
      // If this is the base case, check for matching title / description
      const subProps = props[value] as PartialJSONObject;
      if (!subProps) {
        if (filter((props.title as string) ?? '')) {
          return props.title;
        }
        if (filter(value)) {
          return value;
        }
      }

      // If there are properties in the object, check for title / description
      if (filter((subProps.title as string) ?? '')) {
        acc.push(subProps.title as string);
      }
      if (filter(value)) {
        acc.push(value);
      }

      // Finally, recurse on the properties left.
      acc.concat(
        this.getFilterString(
          filter,
          subProps as ISettingRegistry.IProperty,
          definitions,
          subProps['$ref'] as string
        )
      );
      return acc;
    }, []);
  }

  /**
   * Updates the filter when the search bar value changes.
   * @param filter Filter function passed by search bar based on search value.
   */
  setFilter(
    filter: ((item: string) => Partial<IScore> | null) | null,
    query?: string
  ): void {
    if (filter) {
      this._filter = (plugin: ISettingRegistry.IPlugin): string[] | null => {
        if (!filter || filter(plugin.schema.title ?? '')) {
          return null;
        }
        const filtered = this.getFilterString(
          filter,
          plugin.schema ?? {},
          plugin.schema.definitions
        );
        return filtered;
      };
    } else {
      this._filter = null;
    }
    this._query = query;
    this._updateFilterSignal.emit(this._filter);
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
    const highlightedTitleIndices = StringExt.matchSumOfSquares(
      title.toLocaleLowerCase(),
      this._query?.toLocaleLowerCase() ?? ''
    );
    const hightlightedTitle = StringExt.highlight(
      title,
      highlightedTitleIndices?.indices ?? [],
      chunk => {
        return <mark>{chunk}</mark>;
      }
    );
    const description =
      typeof schema.description === 'string'
        ? trans._p('schema', schema.description)
        : '';
    const itemTitle = `${description}\n${id}\n${version}`;
    const icon = this.getHint(ICON_KEY, this.registry, plugin);
    const iconClass = this.getHint(ICON_CLASS_KEY, this.registry, plugin);
    const iconTitle = this.getHint(ICON_LABEL_KEY, this.registry, plugin);
    const filteredProperties = this._filter
      ? this._filter(plugin)?.map(fieldValue => {
          const highlightedIndices = StringExt.matchSumOfSquares(
            fieldValue.toLocaleLowerCase(),
            this._query?.toLocaleLowerCase() ?? ''
          );
          const highlighted = StringExt.highlight(
            fieldValue,
            highlightedIndices?.indices ?? [],
            chunk => {
              return <mark>{chunk}</mark>;
            }
          );
          return <li key={`${id}-${fieldValue}`}> {highlighted} </li>;
        })
      : undefined;

    return (
      <div
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
        <div className="jp-PluginList-entry-label" role="tab">
          <div className="jp-SelectedIndicator" />
          <LabIcon.resolveReact
            icon={icon || (iconClass ? undefined : settingsIcon)}
            iconClass={classes(iconClass, 'jp-Icon')}
            title={iconTitle}
            tag="span"
            stylesheet="settingsEditor"
          />
          <span className="jp-PluginList-entry-label-text">
            {hightlightedTitle}
          </span>
        </div>
        <ul>{filteredProperties}</ul>
      </div>
    );
  }

  render(): JSX.Element {
    const trans = this.translator.load('jupyterlab');
    // Filter all plugins based on search value before displaying list.
    const allPlugins = this._allPlugins.filter(plugin => {
      if (!this._filter) {
        return false;
      }
      const filtered = this._filter(plugin);
      return filtered === null || filtered.length > 0;
    });

    const modifiedPlugins = allPlugins.filter(plugin => {
      return this._settings[plugin.id]?.isModified;
    });
    const modifiedItems = modifiedPlugins.map(this.mapPlugins);
    const otherItems = allPlugins
      .filter(plugin => {
        return !modifiedPlugins.includes(plugin);
      })
      .map(this.mapPlugins);

    return (
      <div className="jp-PluginList-wrapper">
        <FilterBox
          updateFilter={this.setFilter}
          useFuzzyFilter={false}
          placeholder={trans.__('Search…')}
          forceRefresh={false}
          caseSensitive={false}
          initialQuery={this._query}
        />
        {modifiedItems.length > 0 && (
          <div>
            <h1 className="jp-PluginList-header">{trans.__('Modified')}</h1>
            <ul>{modifiedItems}</ul>
          </div>
        )}
        {otherItems.length > 0 && (
          <div>
            <h1 className="jp-PluginList-header">{trans.__('Settings')}</h1>
            <ul>{otherItems}</ul>
          </div>
        )}
        {modifiedItems.length === 0 && otherItems.length === 0 && (
          <p className="jp-PluginList-noResults">
            {trans.__('No items match your search.')}
          </p>
        )}
      </div>
    );
  }

  protected translator: ITranslator;
  private _changed = new Signal<this, void>(this);
  private _errors: { [id: string]: boolean };
  private _filter: SettingsEditor.PluginSearchFilter;
  private _query: string | undefined;
  private _handleSelectSignal = new Signal<this, string>(this);
  private _updateFilterSignal = new Signal<
    this,
    SettingsEditor.PluginSearchFilter
  >(this);
  private _allPlugins: ISettingRegistry.IPlugin[] = [];
  private _settings: { [id: string]: Settings } = {};
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

    /**
     * An optional initial query so the plugin list can filter on start.
     */
    query?: string;
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
