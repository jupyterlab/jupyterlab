/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';
import type { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { IScore } from '@jupyterlab/ui-components';
import {
  classes,
  FilterBox,
  LabIcon,
  settingsIcon,
  updateFilterFunction
} from '@jupyterlab/ui-components';
import { StringExt } from '@lumino/algorithm';
import type { PartialJSONObject } from '@lumino/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';
import { ElementExt } from '@lumino/domutils';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

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
 * DOM ids for plugin list section headers (used by aria-labelledby).
 */
const MODIFIED_HEADER_ID = 'jp-PluginList-modified-header';
const SETTINGS_HEADER_ID = 'jp-PluginList-settings-header';

/**
 * The class name for a plugin list entry.
 */
const ENTRY_CLASS = 'jp-PluginList-entry';

/**
 * A list of plugins with editable settings.
 */
export class PluginList extends ReactWidget {
  /**
   * Create a new plugin list.
   */
  constructor(options: PluginList.IOptions) {
    super();
    this._registry = this.registry = options.registry;
    this.translator = options.translator || nullTranslator;
    this.addClass('jp-PluginList');
    this._confirm = options.confirm;
    this._model = options.model ?? new PluginList.Model(options);
    this._model.ready
      .then(() => {
        this.update();
        this._model.changed.connect(() => {
          this.update();
        });
      })
      .catch(reason => {
        console.error(`Failed to load the plugin list model:\n${reason}`);
      });
    this.mapPlugins = this.mapPlugins.bind(this);
    this.setFilter = this.setFilter.bind(this);
    this.setFilter(
      options.query ? updateFilterFunction(options.query, false, false) : null
    );
    this.setError = this.setError.bind(this);
    this._evtClick = this._evtClick.bind(this);
    this._query = options.query ?? '';

    this._errors = {};
  }

  /**
   * The setting registry.
   * @deprecated - it was not intended as a public property
   */
  readonly registry: ISettingRegistry;
  private _registry: ISettingRegistry;

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
    if (selection) {
      this._focusedId = selection;
    }
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
   * Handle the DOM events for the plugin list.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeyDown(event as KeyboardEvent);
        break;
      case 'focusin':
        this._evtFocusIn(event as FocusEvent);
        break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('keydown', this);
    this.node.addEventListener('focusin', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this);
    this.node.removeEventListener('focusin', this);
    super.onBeforeDetach(msg);
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const ul = this.node.querySelector('ul');
    if (ul && this._scrollTop !== undefined) {
      ul.scrollTop = this._scrollTop;
    }
    if (this._pendingEntryFocus) {
      const id = this._pendingEntryFocus;
      this._pendingEntryFocus = null;
      const entry = this._getEntryById(id);
      if (entry) {
        this._focusEntryElement(entry);
      }
    }
    super.onUpdateRequest(msg);
  }

  /**
   * Handle the `'click'` event for the plugin list.
   *
   * @param event - The DOM event sent to the widget
   */
  private _evtClick(event: React.MouseEvent<HTMLDivElement>): void {
    const id = event.currentTarget.getAttribute('data-id');
    if (id) {
      this._selectPlugin(id);
    }
  }

  /**
   * Select a plugin in the list and notify listeners.
   *
   * @param id - The plugin id to select
   */
  private _selectPlugin(id: string): void {
    if (this._confirm) {
      this._confirm(id)
        .then(() => {
          this._applySelection(id);
        })
        .catch(() => {
          this._pendingEntryFocus = null;
        });
    } else {
      this._scrollTop = this.scrollTop;
      this._applySelection(id);
    }
  }

  /**
   * Apply the current selection and focus state without confirmation.
   *
   * @param id - The plugin id to select
   */
  private _applySelection(id: string): void {
    this._selection = id;
    this._focusedId = id;
    this._pendingEntryFocus = id;
    this._handleSelectSignal.emit(id);
    this._changed.emit(undefined);
    this.update();
  }

  /**
   * Resolve the plugin id that should hold the roving tab stop.
   */
  private _getTabStopId(visiblePluginIds: string[]): string {
    if (this._focusedId && visiblePluginIds.includes(this._focusedId)) {
      return this._focusedId;
    }
    if (this._selection && visiblePluginIds.includes(this._selection)) {
      return this._selection;
    }
    return visiblePluginIds[0] ?? '';
  }

  /**
   * Keep focus state aligned with the currently visible plugin entries.
   */
  private _syncFocusedId(visiblePluginIds: string[]): void {
    const tabStopId = this._getTabStopId(visiblePluginIds);
    if (tabStopId !== this._focusedId) {
      this._focusedId = tabStopId;
    }
  }

  /**
   * Return plugin entries in DOM order across all visible lists.
   */
  private _getEntryElements(): HTMLElement[] {
    return Array.from(
      this.node.querySelectorAll(`.${ENTRY_CLASS}`)
    ) as HTMLElement[];
  }

  /**
   * Return a plugin entry element by plugin id.
   */
  private _getEntryById(id: string): HTMLElement | null {
    return this.node.querySelector(
      `.${ENTRY_CLASS}[data-id="${CSS.escape(id)}"]`
    );
  }

  /**
   * Return the scrollable container for plugin list entries.
   */
  private _getScrollElement(): HTMLElement {
    return (
      (this.node.querySelector('.jp-PluginList-wrapper') as HTMLElement) ??
      this.node
    );
  }

  /**
   * Focus an entry element and sync the roving tab stop in the DOM.
   *
   * Used when keyboard navigation updates focus without a React re-render.
   */
  private _focusEntryElement(entry: HTMLElement): void {
    const id = entry.getAttribute('data-id');
    if (id) {
      this._focusedId = id;
    }
    for (const item of this._getEntryElements()) {
      item.tabIndex = item === entry ? 0 : -1;
    }
    entry.focus();
    ElementExt.scrollIntoViewIfNeeded(this._getScrollElement(), entry);
  }

  /**
   * Walk from an event target to the nearest plugin entry, if any.
   */
  private _resolveEntryFromEventTarget(
    target: EventTarget | null
  ): HTMLElement | null {
    let node = target as HTMLElement | null;
    while (node && node !== this.node) {
      if (node.classList.contains(ENTRY_CLASS)) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  /**
   * Whether the event target is inside the settings search input.
   */
  private _isFilterInputTarget(target: EventTarget | null): boolean {
    let node = target as HTMLElement | null;
    while (node && node !== this.node) {
      const tag = node.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'JP-SEARCH') {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  /**
   * Index of the currently focused entry, falling back to the first entry.
   */
  private _getFocusedEntryIndex(entries: HTMLElement[]): number {
    const index = entries.findIndex(
      entry => entry.getAttribute('data-id') === this._focusedId
    );
    return index === -1 ? 0 : index;
  }

  /**
   * Move keyboard focus to a plugin entry without changing the selection.
   */
  private _focusEntry(id: string): boolean {
    if (!id || id === this._focusedId) {
      return false;
    }

    const entry = this._getEntryById(id);
    if (!entry) {
      return false;
    }

    this._focusEntryElement(entry);
    return true;
  }

  /**
   * Move focus to the entry at the given index.
   */
  private _focusEntryAtIndex(index: number): boolean {
    const entries = this._getEntryElements();
    if (entries.length === 0) {
      return false;
    }

    const nextIndex = Math.min(Math.max(index, 0), entries.length - 1);
    const nextId = entries[nextIndex].getAttribute('data-id');
    return nextId ? this._focusEntry(nextId) : false;
  }

  /**
   * Move focus to another visible entry by index offset.
   */
  private _moveFocusByDelta(delta: number): boolean {
    const entries = this._getEntryElements();
    if (entries.length === 0) {
      return false;
    }

    const nextIndex = this._getFocusedEntryIndex(entries) + delta;
    if (nextIndex < 0 || nextIndex >= entries.length) {
      return false;
    }

    return this._focusEntryAtIndex(nextIndex);
  }

  /**
   * Handle the `'keydown'` event for the plugin list.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    if (this._isFilterInputTarget(event.target)) {
      return;
    }

    const entry = this._resolveEntryFromEventTarget(event.target);
    if (!entry) {
      return;
    }

    const id = entry.getAttribute('data-id');
    if (!id) {
      return;
    }

    let handled = false;
    switch (event.key) {
      case 'ArrowDown':
        handled = this._moveFocusByDelta(1);
        break;
      case 'ArrowUp':
        handled = this._moveFocusByDelta(-1);
        break;
      case 'Home':
        handled = this._focusEntryAtIndex(0);
        break;
      case 'End':
        handled = this._focusEntryAtIndex(this._getEntryElements().length - 1);
        break;
      case 'Enter':
      case ' ':
        if (id !== this._selection) {
          this._selectPlugin(id);
        }
        handled = true;
        break;
      default:
        return;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Keep roving tabindex aligned when focus moves between entries via Tab.
   */
  private _evtFocusIn(event: FocusEvent): void {
    const entry = this._resolveEntryFromEventTarget(event.target);
    if (!entry || entry.getAttribute('data-id') === this._focusedId) {
      return;
    }

    this._focusEntryElement(entry);
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
    const icon = this.getHint(ICON_KEY, this._registry, plugin);
    const iconClass = this.getHint(ICON_CLASS_KEY, this._registry, plugin);
    const iconTitle = this.getHint(ICON_LABEL_KEY, this._registry, plugin);
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
    const hasMatchDetails =
      filteredProperties !== undefined && filteredProperties.length > 0;
    const matchesId = hasMatchDetails
      ? `jp-PluginList-matches-${encodeURIComponent(id)}`
      : undefined;
    const ariaLabel = this._errors[id] ? trans.__('%1 (error)', title) : title;

    return (
      <li role="presentation" key={id}>
        <div
          role="tab"
          aria-selected={id === this.selection}
          aria-label={ariaLabel}
          aria-describedby={matchesId}
          tabIndex={id === this._focusedId ? 0 : -1}
          onClick={this._evtClick}
          className={classes(
            ENTRY_CLASS,
            id === this.selection ? 'jp-mod-selected' : '',
            this._errors[id] ? 'jp-ErrorPlugin' : ''
          )}
          data-id={id}
          title={itemTitle}
        >
          <div className="jp-PluginList-entry-label">
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
          <ul id={matchesId}>{filteredProperties}</ul>
        </div>
      </li>
    );
  }

  render(): JSX.Element {
    const trans = this.translator.load('jupyterlab');
    // Filter all plugins based on search value before displaying list.
    const allPlugins = this._model.plugins.filter(plugin => {
      if (!this._filter) {
        return false;
      }
      const filtered = this._filter(plugin);
      return filtered === null || filtered.length > 0;
    });

    const modifiedPlugins = allPlugins.filter(plugin => {
      return this._model.settings[plugin.id]?.isModified;
    });
    const otherPlugins = allPlugins.filter(plugin => {
      return !modifiedPlugins.includes(plugin);
    });
    const visiblePluginIds = [
      ...modifiedPlugins.map(plugin => plugin.id),
      ...otherPlugins.map(plugin => plugin.id)
    ];
    this._syncFocusedId(visiblePluginIds);

    const modifiedItems = modifiedPlugins.map(this.mapPlugins);
    const otherItems = otherPlugins.map(this.mapPlugins);

    return (
      <div className="jp-PluginList-wrapper">
        <FilterBox
          updateFilter={this.setFilter}
          useFuzzyFilter={false}
          placeholder={trans.__('Search settings…')}
          forceRefresh={false}
          caseSensitive={false}
          initialQuery={this._query}
        />
        {modifiedItems.length > 0 && (
          <div>
            <h1 className="jp-PluginList-header" id={MODIFIED_HEADER_ID}>
              {trans.__('Modified')}
            </h1>
            <ul
              role="tablist"
              aria-labelledby={MODIFIED_HEADER_ID}
              aria-orientation="vertical"
            >
              {modifiedItems}
            </ul>
          </div>
        )}
        {otherItems.length > 0 && (
          <div>
            <h1 className="jp-PluginList-header" id={SETTINGS_HEADER_ID}>
              {trans.__('Settings')}
            </h1>
            <ul
              role="tablist"
              aria-labelledby={SETTINGS_HEADER_ID}
              aria-orientation="vertical"
            >
              {otherItems}
            </ul>
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
  private _model: PluginList.Model;
  private _query: string | undefined;
  private _handleSelectSignal = new Signal<this, string>(this);
  private _updateFilterSignal = new Signal<
    this,
    SettingsEditor.PluginSearchFilter
  >(this);
  private _confirm?: (id: string) => Promise<void>;
  private _scrollTop: number | undefined = 0;
  private _selection = '';
  private _focusedId = '';
  private _pendingEntryFocus: string | null = null;
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
     * Model for the plugin list.
     */
    model?: PluginList.Model;

    /**
     * The setting registry for the plugin list.
     */
    registry: ISettingRegistry;

    /**
     * List of plugins to skip.
     * @deprecated - pass a `model` with `toSkip` option instead
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
   * @deprecated - prior to 4.3 this function was used to reimplement
   * the same ordering between the plugin list and editor; it is no
   * longer needed as the order is now tracked by the model.
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

  /**
   * Model for plugin list
   */
  export class Model {
    /**
     * Create a new plugin list model.
     */
    constructor(options: PluginList.Model.IOptions) {
      this._toSkip = options.toSkip ?? [];
      this._registry = options.registry;
      this._registry.pluginChanged.connect(async (_emitter, pluginId) => {
        let changed = false;
        // Either plugin can be missing (if plugin was not loaded at all yet)
        // or just plugin's settings may be missing (if transform step has no completed).
        if (!this._plugins.map(plugin => plugin.id).includes(pluginId)) {
          this._plugins = this._loadPlugins();
          changed = true;
        }
        if (!this._settings[pluginId]) {
          const pluginsToLoad = this._plugins.filter(
            plugin => plugin.id === pluginId
          );
          await this._loadSettings(pluginsToLoad);
          changed = true;
        }
        if (changed) {
          this._changed.emit();
        }
      }, this);
      this._plugins = this._loadPlugins();
      this._loadSettings(this._plugins)
        .then(() => {
          this._ready.resolve(undefined);
        })
        .catch(reason => {
          console.error(`Failed to load the settings:\n${reason}`);
        });
    }

    /**
     * A list of loaded plugins.
     */
    get plugins(): ISettingRegistry.IPlugin[] {
      return this._plugins;
    }

    /**
     * A promise which resolves when an initial loading of plugins completed.
     *
     * Note: this does not guarantee that all `plugins` nor `settings` are available
     * as these can be also loaded later as plugins are added or transformed.
     */
    get ready(): Promise<void> {
      return this._ready.promise;
    }

    /**
     * Settings keyed by plugin name.
     *
     * Note: settings for plugins can be loaded later than the plugin
     * itself, which is the case for plugins using a `transform` step.
     */
    get settings(): Record<string, Settings> {
      return this._settings;
    }

    /**
     * Signal emitted when list of plugins change.
     *
     * This signal will be emitted when new plugins are added to the registry,
     * when settings schema of an already present plugin changes, and when the
     * settings state changes from default to modified or vice versa.
     */
    get changed(): ISignal<PluginList.Model, void> {
      return this._changed;
    }

    /**
     * Loads, sorts and filters plugins from the registry.
     */
    private _loadPlugins(): ISettingRegistry.IPlugin[] {
      return this._sortPlugins(this._registry).filter(plugin => {
        const { schema } = plugin;
        const deprecated = schema['jupyter.lab.setting-deprecated'] === true;
        const editable = Object.keys(schema.properties || {}).length > 0;
        const extensible = schema.additionalProperties !== false;
        const correctEditor = !this._toSkip.includes(plugin.id);

        return !deprecated && correctEditor && (editable || extensible);
      });
    }

    /**
     * Loads settings and stores them for easy access when displaying search results.
     */
    private async _loadSettings(plugins: ISettingRegistry.IPlugin[]) {
      for (const plugin of plugins) {
        const pluginSettings = (await this._registry.load(
          plugin.id
        )) as Settings;
        pluginSettings.changed.connect(() => {
          if (pluginSettings.isModified !== this._settingsModified[plugin.id]) {
            this._changed.emit();
            this._settingsModified[plugin.id] = pluginSettings.isModified;
          }
        });
        this._settings[plugin.id] = pluginSettings;
        this._settingsModified[plugin.id] = pluginSettings.isModified;
      }
    }

    private _sortPlugins(
      registry: ISettingRegistry
    ): ISettingRegistry.IPlugin[] {
      return Object.keys(registry.plugins)
        .map(plugin => registry.plugins[plugin]!)
        .sort((a, b) => {
          return (a.schema.title || a.id).localeCompare(b.schema.title || b.id);
        });
    }

    private _plugins: ISettingRegistry.IPlugin[] = [];
    private _changed: Signal<PluginList.Model, void> = new Signal(this);
    private _ready = new PromiseDelegate<void>();
    private _registry: ISettingRegistry;
    private _settings: Record<string, Settings> = {};
    private _settingsModified: Record<string, boolean> = {};
    private _toSkip: string[];
  }

  /**
   * A namespace for `PluginList.Model` statics.
   */
  export namespace Model {
    /**
     * The instantiation options for a plugin list model.
     */
    export interface IOptions {
      /**
       * The setting registry for the plugin list model.
       */
      registry: ISettingRegistry;

      /**
       * List of plugins to skip.
       */
      toSkip?: string[];
    }
  }
}
