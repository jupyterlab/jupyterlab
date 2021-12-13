// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

/**
 * The search provider registry token.
 */
export const ISearchProviderRegistry = new Token<ISearchProviderRegistry>(
  '@jupyterlab/documentsearch:ISearchProviderRegistry'
);

/**
 * Filter interface
 */
export interface IFilter {
  /**
   * Filter title
   */
  title: string;
  /**
   * Filter description
   */
  description: string;
  /**
   * Default value
   */
  default: boolean;
  /**
   * Does the filter support replace?
   */
  supportReplace: boolean;
}

/**
 * Type of filters
 *
 * TODO support additional filter type
 */
export interface IFiltersType {
  [key: string]: boolean;
}

export interface IDisplayState {
  /**
   * The index of the currently selected match
   */
  currentIndex: number | null;

  /**
   * The total number of matches found in the document
   */
  totalMatches: number;

  /**
   * Should the search be case sensitive?
   */
  caseSensitive: boolean;

  /**
   * Should the search string be treated as a RegExp?
   */
  useRegex: boolean;

  /**
   * The text in the search entry
   */
  searchText: string;

  /**
   * The query constructed from the text and the case/regex flags
   */
  query: RegExp | null;

  /**
   * An error message (used for bad regex syntax)
   */
  errorMessage: string;

  /**
   * Should the focus forced into the input on the next render?
   */
  forceFocus: boolean;

  /**
   * Whether or not the search input is currently focused
   */
  searchInputFocused: boolean;

  /**
   * Whether or not the replace input is currently focused
   */
  replaceInputFocused: boolean;

  /**
   * The text in the replace entry
   */
  replaceText: string;

  /**
   * Whether or not the replace entry row is visible
   */
  replaceEntryShown: boolean;

  /**
   * What should we include when we search?
   */
  filters: IFiltersType;

  /**
   * Is the filters view open?
   */
  filtersOpen: boolean;
}

export interface ISearchMatch {
  /**
   * Text of the exact match itself
   */
  readonly text: string;

  /**
   * Start location of the match (in a text, this is the column)
   */
  position: number;

  /**
   * Index among the other matches
   */
  index: number;
}

export interface IHTMLSearchMatch extends ISearchMatch {
  /**
   * Node containing the match
   */
  readonly node: Text;
}

export interface ITextSearchMatch extends ISearchMatch {
  /**
   * Fragment containing match
   */
  readonly fragment: string;

  /**
   * Line number of match
   */
  line: number;
}

/**
 * This interface is meant to enforce that SearchProviders implement
 * the static canSearchOn function.
 */
export interface ISearchProviderConstructor<T extends Widget = Widget> {
  new (
    translator: ITranslator,
    registry: ISearchProviderRegistry
  ): ISearchProvider<T>;
  /**
   * Report whether or not this provider has the ability to search on the
   * given object. The function is a type guard, meaning that it returns
   * a boolean, but has a type predicate (`x is T`) for its return signature.
   */
  canSearchOn(domain: Widget): domain is T;
}

export interface ISearchProviderRegistry {
  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  register(
    key: string,
    provider: ISearchProviderConstructor<Widget>
  ): IDisposable;

  /**
   * Add a search mime type provider to the registry.
   *
   * @param key - The mime type key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  registerMimeTypeSearchEngine(
    key: string,
    provider: IMimeTypeSearchEngine
  ): IDisposable;

  /**
   * Returns a matching provider for the mimetype.
   *
   * @param key The mimetype to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getMimeTypeSearchEngine(key: string): IMimeTypeSearchEngine | undefined;

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget(widget: Widget): ISearchProvider<Widget> | undefined;

  /**
   * Signal that emits when a new search provider has been registered
   * or removed.
   */
  changed: ISignal<ISearchProviderRegistry, void>;
}

export interface IMimeTypeSearchEngine {
  search(query: RegExp, data: any): Promise<ISearchMatch[]>;
}

export interface IBaseSearchProvider {
  /**
   * Initialize the search using the provided options.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   * @param filters Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  startQuery(query: RegExp, filters: IFiltersType): Promise<void>;

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  endQuery(): Promise<void>;

  /**
   * Move the current match indicator to the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(loop?: boolean): Promise<ISearchMatch | undefined>;

  /**
   * Move the current match indicator to the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(loop?: boolean): Promise<ISearchMatch | undefined>;

  /**
   * Replace the currently selected match with the provided text
   * and highlight the next match.
   *
   * @param newText New text to include.
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceCurrentMatch(newText: string, loop?: boolean): Promise<boolean>;

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @param newText New text to include.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceAllMatches(newText: string): Promise<boolean>;

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  readonly changed: ISignal<IBaseSearchProvider, void>;

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number | null;

  /**
   * The number of matches.
   */
  readonly matchesSize: number | null;
}

export interface ISearchProvider<T extends Widget = Widget>
  extends IBaseSearchProvider {
  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @param searchTarget The widget to be searched
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(searchTarget: T): string;

  /**
   * Initialize the search state with the given target.
   *
   * @param searchTarget The widget to be searched
   */
  startSearch(searchTarget: T): void;

  /**
   * Reset the target search state as it was before the search process began.
   * Cleans up and disposes of all internal state.
   *
   * @returns A promise that resolves when all state have been cleaned up.
   */
  endSearch(): Promise<void>;

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly: boolean;

  /**
   * Get the filters for the given provider.
   *
   * @returns The filters.
   *
   * ### Notes
   * TODO For now it only supports boolean filters (represented with checkboxes)
   */
  getFilters?(): { [key: string]: IFilter };
}
