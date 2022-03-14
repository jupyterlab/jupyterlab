// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel } from '@jupyterlab/ui-components';
import { JSONExt } from '@lumino/coreutils';
import { IObservableDisposable } from '@lumino/disposable';
import { Debouncer } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import { IFilter, IFiltersType, ISearchProvider } from './tokens';

/**
 * Search in a document model.
 */
export class SearchDocumentModel
  extends VDomModel
  implements IObservableDisposable {
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

    this._searchDebouncer = new Debouncer(() => {
      this._updateSearch();
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
  get filters(): IFiltersType {
    return this._filters;
  }
  set filters(v: IFiltersType) {
    if (!JSONExt.deepEqual(this._filters, v)) {
      this._filters = v;
      this.stateChanged.emit();
      this.refresh();
    }
  }

  /**
   * Filter definitions for the current provider.
   */
  get filtersDefinition(): { [n: string]: IFilter } {
    return this.searchProvider.getFilters?.() ?? {};
  }

  /**
   * The initial query string.
   */
  get initialQuery(): string {
    return this._searchExpression || this.searchProvider.getInitialQuery();
  }

  /**
   * Whether the document is read-only or not.
   */
  get isReadOnly(): boolean {
    return this.searchProvider.isReadOnly;
  }

  /**
   * Parsing regular expression error message.
   */
  get parsingError(): string {
    return this._parsingError;
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
    return this.searchProvider.matchesSize;
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

    this._searchDebouncer.dispose();
    super.dispose();
  }

  /**
   * End the query.
   */
  async endQuery(): Promise<void> {
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
    this._searchDebouncer.invoke();
  }

  /**
   * Replace all matches.
   */
  async replaceAllMatches(): Promise<void> {
    await this.searchProvider.replaceAllMatches(this._replaceText);
    // Emit state change as the index needs to be updated
    this.stateChanged.emit();
  }

  /**
   * Replace the current match.
   */
  async replaceCurrentMatch(): Promise<void> {
    await this.searchProvider.replaceCurrentMatch(this._replaceText);
    // Emit state change as the index needs to be updated
    this.stateChanged.emit();
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
            this.useRegex
          )
        : null;
      if (query) {
        await this.searchProvider.startQuery(query, this._filters);
        // Emit state change as the index needs to be updated
        this.stateChanged.emit();
      }
    } catch (reason) {
      this._parsingError = reason;
      this.stateChanged.emit();
      console.error(
        `Failed to parse expression ${this.searchExpression}`,
        reason
      );
    }
  }

  private _caseSensitive = false;
  private _disposed = new Signal<this, void>(this);
  private _parsingError = '';
  private _filters: IFiltersType = {};
  private _replaceText: string;
  private _searchDebouncer: Debouncer;
  private _searchExpression = '';
  private _useRegex = false;
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
    regex: boolean
  ): RegExp | null {
    const flag = caseSensitive ? 'g' : 'gi';
    // escape regex characters in query if its a string search
    const queryText = regex
      ? queryString
      : queryString.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    let ret;
    ret = new RegExp(queryText, flag);

    // If the empty string is hit, the search logic will freeze the browser tab
    //  Trying /^/ or /$/ on the codemirror search demo, does not find anything.
    //  So this is a limitation of the editor.
    if (ret.test('')) {
      return null;
    }

    return ret;
  }
}
