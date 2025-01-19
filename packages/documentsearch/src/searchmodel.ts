// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel } from '@jupyterlab/ui-components';
import { IObservableDisposable } from '@lumino/disposable';
import { Debouncer } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import {
  IFilter,
  IFilters,
  IReplaceOptionsSupport,
  ISearchProvider,
  SelectionState
} from './tokens';

/**
 * Search in a document model.
 */
export class SearchDocumentModel
  extends VDomModel
  implements IObservableDisposable
{
  /**
   * Search document model
   * @param searchProvider Provider for the current document
   * @param searchDebounceTime Debounce search time
   */
  constructor(
    protected searchProvider: ISearchProvider,
    searchDebounceTime: number
  ) {
    super();

    this._filters = {};
    if (this.searchProvider.getFilters) {
      const filters = this.searchProvider.getFilters();
      for (const filter in filters) {
        this._filters[filter] = filters[filter].default;
      }
    }

    searchProvider.stateChanged.connect(this._onProviderStateChanged, this);

    this._searchDebouncer = new Debouncer(() => {
      this._updateSearch().catch(reason => {
        console.error('Failed to update search on document.', reason);
      });
    }, searchDebounceTime);
  }

  /**
   * Whether the search is case sensitive or not.
   */
  get caseSensitive(): boolean {
    return this._caseSensitive;
  }
  set caseSensitive(v: boolean) {
    if (this._caseSensitive !== v) {
      this._caseSensitive = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Current highlighted match index.
   */
  get currentIndex(): number | null {
    return this.searchProvider.currentMatchIndex;
  }

  /**
   * A signal emitted when the object is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Filter values.
   */
  get filters(): IFilters {
    return this._filters;
  }

  /**
   * Filter definitions for the current provider.
   */
  get filtersDefinition(): { [n: string]: IFilter } {
    return this.searchProvider.getFilters?.() ?? {};
  }

  /**
   * Filter definitions changed.
   */
  get filtersDefinitionChanged(): ISignal<ISearchProvider, void> | null {
    return this.searchProvider.filtersChanged || null;
  }

  /**
   * The initial query string.
   */
  get initialQuery(): string {
    return this._initialQuery;
  }
  set initialQuery(v: string) {
    // The value comes from user selection (set by search provider).
    this._initialQuery = v;
  }

  /**
   * Initial query as suggested by provider.
   *
   * A common choice is the text currently selected by the user.
   */
  get suggestedInitialQuery(): string {
    return this.searchProvider.getInitialQuery();
  }

  /**
   * Whether the selection includes a single item or multiple items;
   * this is used by the heuristic auto-enabling "search in selection" mode.
   *
   * Returns `undefined` if the provider does not expose this information.
   */
  get selectionState(): SelectionState | undefined {
    return this.searchProvider.getSelectionState
      ? this.searchProvider.getSelectionState()
      : undefined;
  }

  /**
   * Whether the document is read-only or not.
   */
  get isReadOnly(): boolean {
    return this.searchProvider.isReadOnly;
  }

  /**
   * Replace options support.
   */
  get replaceOptionsSupport(): IReplaceOptionsSupport | undefined {
    return this.searchProvider.replaceOptionsSupport;
  }

  /**
   * Parsing regular expression error message.
   */
  get parsingError(): string {
    return this._parsingError;
  }

  /**
   * Whether to preserve case when replacing.
   */
  get preserveCase(): boolean {
    return this._preserveCase;
  }
  set preserveCase(v: boolean) {
    if (this._preserveCase !== v) {
      this._preserveCase = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Replacement expression
   */
  get replaceText(): string {
    return this._replaceText;
  }
  set replaceText(v: string) {
    if (this._replaceText !== v) {
      this._replaceText = v;
      this.stateChanged.emit();
    }
  }

  /**
   * Search expression
   */
  get searchExpression(): string {
    return this._searchExpression;
  }
  set searchExpression(v: string) {
    if (this._searchExpression !== v) {
      this._searchExpression = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Total number of matches.
   */
  get totalMatches(): number | null {
    return this.searchProvider.matchesCount;
  }

  /**
   * Whether to use regular expression or not.
   */
  get useRegex(): boolean {
    return this._useRegex;
  }
  set useRegex(v: boolean) {
    if (this._useRegex !== v) {
      this._useRegex = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Whether to match whole words or not.
   */
  get wholeWords(): boolean {
    return this._wholeWords;
  }
  set wholeWords(v: boolean) {
    if (this._wholeWords !== v) {
      this._wholeWords = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Dispose the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    if (this._searchExpression) {
      this.endQuery().catch(reason => {
        console.error(
          `Failed to end query '${this._searchExpression}.`,
          reason
        );
      });
    }

    this.searchProvider.stateChanged.disconnect(
      this._onProviderStateChanged,
      this
    );

    this._searchDebouncer.dispose();
    super.dispose();
  }

  /**
   * End the query.
   */
  async endQuery(): Promise<void> {
    this._searchActive = false;
    await this.searchProvider.endQuery();
    this.stateChanged.emit();
  }

  /**
   * Highlight the next match.
   */
  async highlightNext(): Promise<void> {
    await this.searchProvider.highlightNext();
    // Emit state change as the index needs to be updated
    this.stateChanged.emit();
  }

  /**
   * Highlight the previous match
   */
  async highlightPrevious(): Promise<void> {
    await this.searchProvider.highlightPrevious();
    // Emit state change as the index needs to be updated
    this.stateChanged.emit();
  }

  /**
   * Refresh search
   */
  refresh(): void {
    this._searchDebouncer.invoke().catch(reason => {
      console.error('Failed to invoke search document debouncer.', reason);
    });
  }

  /**
   * Replace all matches.
   */
  async replaceAllMatches(): Promise<void> {
    await this.searchProvider.replaceAllMatches(this._replaceText, {
      preserveCase: this.preserveCase,
      regularExpression: this.useRegex
    });
    // Emit state change as the index needs to be updated
    this.stateChanged.emit();
  }

  /**
   * Replace the current match.
   */
  async replaceCurrentMatch(): Promise<void> {
    await this.searchProvider.replaceCurrentMatch(this._replaceText, true, {
      preserveCase: this.preserveCase,
      regularExpression: this.useRegex
    });
    // Emit state change as the index needs to be updated
    this.stateChanged.emit();
  }

  /**
   * Set the value of a given filter.
   *
   * @param name Filter name
   * @param v Filter value
   */
  async setFilter(name: string, v: boolean): Promise<void> {
    if (this._filters[name] !== v) {
      if (this.searchProvider.validateFilter) {
        this._filters[name] = await this.searchProvider.validateFilter(name, v);
        // If the value was changed
        if (this._filters[name] === v) {
          this.stateChanged.emit();
          this.refresh();
        }
      } else {
        this._filters[name] = v;
        this.stateChanged.emit();
        this.refresh();
      }
    }
  }

  private async _updateSearch(): Promise<void> {
    if (this._parsingError) {
      this._parsingError = '';
      this.stateChanged.emit();
    }
    try {
      const query = this.searchExpression
        ? Private.parseQuery(
            this.searchExpression,
            this.caseSensitive,
            this.useRegex,
            this.wholeWords
          )
        : null;
      if (query) {
        this._searchActive = true;
        await this.searchProvider.startQuery(query, this._filters);
      } else {
        this._searchActive = false;
        await this.searchProvider.endQuery();
      }
      // Emit state change as the index needs to be updated
      this.stateChanged.emit();
    } catch (reason) {
      this._parsingError = reason.toString();
      this.stateChanged.emit();
      console.error(
        `Failed to parse expression ${this.searchExpression}`,
        reason
      );
    }
  }

  private _onProviderStateChanged() {
    if (this._searchActive) {
      this.refresh();
    }
  }

  private _caseSensitive = false;
  private _disposed = new Signal<this, void>(this);
  private _parsingError = '';
  private _preserveCase = false;
  private _initialQuery = '';
  private _filters: IFilters = {};
  private _replaceText: string = '';
  private _searchActive = false;
  private _searchDebouncer: Debouncer;
  private _searchExpression = '';
  private _useRegex = false;
  private _wholeWords = false;
}

namespace Private {
  /**
   * Build the regular expression to use for searching.
   *
   * @param queryString Query string
   * @param caseSensitive Whether the search is case sensitive or not
   * @param regex Whether the expression is a regular expression
   * @returns The regular expression to use
   */
  export function parseQuery(
    queryString: string,
    caseSensitive: boolean,
    regex: boolean,
    wholeWords: boolean
  ): RegExp | null {
    const flag = caseSensitive ? 'gm' : 'gim';
    // escape regex characters in query if its a string search
    let queryText = regex
      ? queryString
      : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');

    if (wholeWords) {
      queryText = '\\b' + queryText + '\\b';
    }
    const ret = new RegExp(queryText, flag);

    // If the empty string is hit, the search logic will freeze the browser tab
    //  Trying /^/ or /$/ on the codemirror search demo, does not find anything.
    //  So this is a limitation of the editor.
    if (ret.test('')) {
      return null;
    }

    return ret;
  }
}
