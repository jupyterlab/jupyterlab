/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ReactWidget } from '@jupyterlab/apputils';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  classes,
  InputGroup,
  LabIcon,
  settingsIcon
} from '@jupyterlab/ui-components';
import { StringExt } from '@lumino/algorithm';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import React, { useEffect, useState } from 'react';

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
 * A text match score with associated content item.
 */
interface IScore {
  /**
   * The numerical score for the text match.
   */
  score: number;

  /**
   * The indices of the text matches.
   */
  indices: number[] | null;
}

interface ISearcherProps {
  listing: ISettingRegistry.IPlugin[];
  setFilter: (filter: (plugin: ISettingRegistry.IPlugin) => boolean) => void;
  useFuzzyFilter: boolean;
  placeholder?: string;
  forceRefresh?: boolean;
}

/**
 * Perform a fuzzy search on a single item.
 */
function fuzzySearch(source: string, query: string): IScore | null {
  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // The regex for search word boundaries
  const rgx = /\b\w/g;

  let continueSearch = true;

  // Search the source by word boundary.
  while (continueSearch) {
    // Find the next word boundary in the source.
    let rgxMatch = rgx.exec(source);

    // Break if there is no more source context.
    if (!rgxMatch) {
      break;
    }

    // Run the string match on the relevant substring.
    let match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

    // Break if there is no match.
    if (!match) {
      break;
    }

    // Update the match if the score is better.
    if (match && match.score <= score) {
      score = match.score;
      indices = match.indices;
    }
  }

  // Bail if there was no match.
  if (!indices || score === Infinity) {
    return null;
  }

  // Handle a split match.
  return {
    score,
    indices
  };
}

const Searcher = (props: ISearcherProps) => {
  const [filter, setFilter] = useState('');

  if (props.forceRefresh) {
    useEffect(() => {
      props.setFilter((item: ISettingRegistry.IPlugin) => {
        return true;
      });
    }, []);
  }

  /**
   * Handler for search input changes.
   */
  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    setFilter(target.value);
    props.setFilter((item: ISettingRegistry.IPlugin) => {
      if (props.useFuzzyFilter) {
        // Run the fuzzy search for the item and query.
        const name = item.schema?.title?.toLowerCase() ?? '';
        const query = target.value.toLowerCase();
        let score = fuzzySearch(name, query);
        // Ignore the item if it is not a match.
        if (!score) {
          item.indices = [];
          return false;
        }
        item.indices = score.indices;
        return true;
      }
      const i = item.id.indexOf(target.value);
      if (i === -1) {
        item.indices = [];
        return false;
      }
      item.indices = [...Array(target.value.length).keys()].map(x => x + i);
      return true;
    });
  };

  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      placeholder={props.placeholder}
      onChange={handleChange}
      value={filter}
      className="jp-PluginList-Searcher"
    />
  );
};

/**
 * A list of plugins with editable settings.
 */
export class PluginList extends ReactWidget {
  private _filter: (item: ISettingRegistry.IPlugin) => boolean;
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
    this._evtMousedown = this._evtMousedown.bind(this);

    this._allPlugins = PluginList.sortPlugins(this.registry).filter(plugin => {
      const { schema } = plugin;
      const deprecated = schema['jupyter.lab.setting-deprecated'] === true;
      const editable = Object.keys(schema.properties || {}).length > 0;
      const extensible = schema.additionalProperties !== false;

      return !deprecated && (editable || extensible) && this._filter?.(plugin);
    });

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

    this._confirm(id)
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

  setFilter(filter: (item: ISettingRegistry.IPlugin) => boolean) {
    this._filter = filter;
    this.update();
  }

  mapPlugins(plugin: ISettingRegistry.IPlugin) {
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
        className={
          id === this.selection
            ? 'jp-mod-selected jp-PluginList-entry'
            : 'jp-PluginList-entry'
        }
        data-id={id}
        key={id}
        title={itemTitle}
      >
        {id === this.selection ? (
          <div className="jp-SelectedIndicator" />
        ) : undefined}
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

  render(): React.ReactElement<any> {
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
      <div>
        <Searcher
          listing={this._allPlugins}
          setFilter={this.setFilter}
          useFuzzyFilter={true}
          placeholder={'Search...'}
          forceRefresh={false}
        />
        {modifiedItems.length > 0 ? (
          <div>
            <p className="jp-PluginList-header">Modified</p>
            <ul>{modifiedItems}</ul>
          </div>
        ) : undefined}
        <p className="jp-PluginList-header">Settings</p>
        <ul>{otherItems}</ul>
      </div>
    );
  }

  protected translator: ITranslator;
  private _changed = new Signal<this, void>(this);
  private _modifiedPlugins: ISettingRegistry.IPlugin[] = [];
  private _allPlugins: ISettingRegistry.IPlugin[] = [];
  private _confirm: (id: string) => Promise<void>;
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
    confirm: (id: string) => Promise<void>;

    /**
     * The setting registry for the plugin list.
     */
    registry: ISettingRegistry;

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
