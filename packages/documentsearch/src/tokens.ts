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
  /**
   * Filter name: value
   */
  [key: string]: boolean;
}

/**
 * React search component state
 */
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

/**
 * Base search match interface
 */
export interface ISearchMatch {
  /**
   * Text of the exact match itself
   */
  readonly text: string;

  /**
   * Start location of the match (in a text, this is the column)
   */
  position: number;
}

/**
 * HTML search match interface
 */
export interface IHTMLSearchMatch extends ISearchMatch {
  /**
   * Node containing the match
   */
  readonly node: Text;
}

/**
 * Interface for search provider factory
 */
export interface ISearchProviderFactory<T extends Widget = Widget> {
  /**
   * Instantiate a search provider for the widget.
   *
   * #### Notes
   * The widget provided is always checked using `isApplicable` before calling
   * this factory.
   *
   * @param widget The widget to search on
   * @param translator [optional] The translator object
   *
   * @returns The search provider on the widget
   */
  readonly createNew: (widget: T, translator?: ITranslator) => ISearchProvider;

  /**
   * Report whether or not this provider has the ability to search on the
   * given widget. The function is a type guard, meaning that it returns
   * a boolean, but has a type predicate (`x is T`) for its return signature.
   *
   * @param domain Widget to test
   */
  readonly isApplicable: (domain: Widget) => domain is T;
}

/**
 * Search provider registry interface
 */
export interface ISearchProviderRegistry {
  /**
   * Add a provider to the registry.
   *
   * @param key - The provider key.
   * @returns A disposable delegate that, when disposed, deregisters the given search provider
   */
  register(key: string, provider: ISearchProviderFactory<Widget>): IDisposable;

  /**
   * Returns a matching provider for the widget.
   *
   * @param widget - The widget to search over.
   * @returns the search provider, or undefined if none exists.
   */
  getProviderForWidget(widget: Widget): ISearchProvider | undefined;

  /**
   * Signal that emits when a new search provider has been registered
   * or removed.
   */
  changed: ISignal<ISearchProviderRegistry, void>;
}

/**
 * Base search provider interface
 *
 * #### Notes
 * It is implemented by subprovider like searching on a single cell.
 */
export interface IBaseSearchProvider extends IDisposable {
  /**
   * Start a search
   *
   * @param query Regular expression to test for
   * @param filters Filters to apply when searching
   */
  startQuery(query: RegExp, filters: IFiltersType): Promise<void>;

  /**
   * Stop a search and clear any internal state of the provider
   */
  endQuery(): Promise<void>;

  /**
   * Clear currently highlighted match.
   */
  clearHighlight(): void;

  /**
   * Highlight the next match
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The next match if it exists
   */
  highlightNext(loop?: boolean): Promise<ISearchMatch | undefined>;

  /**
   * Highlight the previous match
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The previous match if it exists.
   */
  highlightPrevious(loop?: boolean): Promise<ISearchMatch | undefined>;

  /**
   * Replace the currently selected match with the provided text
   * and highlight the next match.
   *
   * @param newText The replacement text
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceCurrentMatch(newText: string, loop?: boolean): Promise<boolean>;

  /**
   * Replace all matches in the widget with the provided text
   *
   * @param newText The replacement text.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  replaceAllMatches(newText: string): Promise<boolean>;

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  readonly stateChanged: ISignal<IBaseSearchProvider, void>;

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number | null;

  /**
   * The number of matches.
   */
  readonly matchesSize: number | null;
}

/**
 * Search provider interface
 */
export interface ISearchProvider extends IBaseSearchProvider {
  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(): string;

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly: boolean;

  /**
   * Get the filters definition for the given provider.
   *
   * @returns The filters definition.
   *
   * ### Notes
   * TODO For now it only supports boolean filters (represented with checkboxes)
   */
  getFilters?(): { [key: string]: IFilter };
}
