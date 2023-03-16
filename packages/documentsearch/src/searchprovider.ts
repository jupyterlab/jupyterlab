// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import {
  IFilter,
  IFilters,
  IReplaceOptions,
  ISearchMatch,
  ISearchProvider
} from './tokens';

/**
 * Abstract class implementing the search provider interface.
 */
export abstract class SearchProvider<T extends Widget = Widget>
  implements ISearchProvider
{
  /**
   * Constructor
   *
   * @param widget The widget to search in
   */
  constructor(protected widget: T) {
    this._stateChanged = new Signal<this, void>(this);
    this._filtersChanged = new Signal<this, void>(this);
    this._disposed = false;
  }

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  get stateChanged(): ISignal<this, void> {
    return this._stateChanged;
  }

  /**
   * Signal indicating that filter definition changed.
   */
  get filtersChanged(): ISignal<this, void> {
    return this._filtersChanged;
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    return null;
  }

  /**
   * Whether the search provider is disposed or not.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * The number of matches.
   */
  get matchesCount(): number | null {
    return null;
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  abstract get isReadOnly(): boolean;

  /**
   * Dispose of the resources held by the search provider.
   *
   * #### Notes
   * If the object's `dispose` method is called more than once, all
   * calls made after the first will be a no-op.
   *
   * #### Undefined Behavior
   * It is undefined behavior to use any functionality of the object
   * after it has been disposed unless otherwise explicitly noted.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    Signal.clearData(this);
  }

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(): string {
    return '';
  }

  /**
   * Get the filters for the given provider.
   *
   * @returns The filters.
   *
   * ### Notes
   * TODO For now it only supports boolean filters (represented with checkboxes)
   */
  getFilters(): { [key: string]: IFilter } {
    return {};
  }

  /**
   * Start a search using the provided options.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  abstract startQuery(query: RegExp, filters: IFilters): Promise<void>;

  /**
   * Stop a search and clear any internal state of the search provider.
   */
  abstract endQuery(): Promise<void>;

  /**
   * Clear currently highlighted match.
   */
  abstract clearHighlight(): Promise<void>;

  /**
   * Highlight the next match.
   *
   * @returns The next match if available
   */
  abstract highlightNext(): Promise<ISearchMatch | undefined>;

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if available.
   */
  abstract highlightPrevious(): Promise<ISearchMatch | undefined>;

  /**
   * Replace the currently selected match with the provided text
   *
   * @param newText The replacement text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  abstract replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean>;

  /**
   * Replace all matches in the widget with the provided text
   *
   * @param newText The replacement text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  abstract replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean>;

  /**
   * Utility for copying the letter case from old to new text.
   */
  static preserveCase(oldText: string, newText: string): string {
    if (oldText.toUpperCase() === oldText) {
      return newText.toUpperCase();
    }
    if (oldText.toLowerCase() === oldText) {
      return newText.toLowerCase();
    }
    if (toSentenceCase(oldText) === oldText) {
      return toSentenceCase(newText);
    }
    return newText;
  }

  // Needs to be protected so subclass can emit the signal too.
  protected _stateChanged: Signal<this, void>;
  protected _filtersChanged: Signal<this, void>;
  private _disposed: boolean;
}

/**
 * Capitalise first letter of provided word.
 */
function toSentenceCase([first = '', ...suffix]: string): string {
  return first.toUpperCase() + '' + suffix.join('').toLowerCase();
}
