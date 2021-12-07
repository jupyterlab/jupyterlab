// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

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
  new (translator: ITranslator): ISearchProvider<T>;
  /**
   * Report whether or not this provider has the ability to search on the
   * given object. The function is a type guard, meaning that it returns
   * a boolean, but has a type predicate (`x is T`) for its return signature.
   */
  canSearchOn(domain: Widget): domain is T;
}

export interface IMimeTypeSearchEngine {
  search(query: RegExp, data: any): Promise<ISearchMatch[]>;
}

export interface ISearchProvider<T extends Widget = Widget> {
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
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   * @param filters Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  startQuery(
    query: RegExp,
    searchTarget: T,
    filters: IFiltersType
  ): Promise<void>;

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  endQuery(): Promise<void>;

  /**
   * Resets UI state as it was before the search process began. Cleans up and
   * disposes of all internal state.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  endSearch(): Promise<void>;

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(): Promise<ISearchMatch | undefined>;

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ISearchMatch | undefined>;

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceCurrentMatch(newText: string): Promise<boolean>;

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceAllMatches(newText: string): Promise<boolean>;

  /**
   * The same list of matches provided by the startQuery promise resolution
   */
  readonly matches: ISearchMatch[];

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  readonly changed: ISignal<ISearchProvider<T>, void>;

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number | null;

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
