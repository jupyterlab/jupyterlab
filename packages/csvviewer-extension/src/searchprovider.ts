// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ISearchProvider, ISearchMatch } from '@jupyterlab/documentsearch';
import { CSVViewer } from '@jupyterlab/csvviewer';
import { IDocumentWidget, DocumentWidget } from '@jupyterlab/docregistry';
import { Signal, ISignal } from '@phosphor/signaling';

export class CSVSearchProvider implements ISearchProvider {
  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static canSearchOn(domain: any): boolean {
    // check to see if the CMSearchProvider can search on the
    // first cell, false indicates another editor is present
    return (
      domain instanceof DocumentWidget && domain.content instanceof CSVViewer
    );
  }

  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(
    query: RegExp,
    searchTarget: IDocumentWidget<CSVViewer>
  ): Promise<ISearchMatch[]> {
    this._target = searchTarget;
    this._query = query;
    searchTarget.content.searchService.find(query);
    return this.matches;
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  async endQuery(): Promise<void> {
    this._target.content.searchService.clear();
  }

  /**
   * Resets UI state as it was before the search process began.  Cleans up and
   * disposes of all internal state.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    this._target.content.searchService.clear();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    this._target.content.searchService.find(this._query);
    return undefined;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._target.content.searchService.find(this._query, true);
    return undefined;
  }

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The same list of matches provided by the startQuery promise resoluton
   */
  readonly matches: ISearchMatch[] = [];

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number | null = null;

  private _target: IDocumentWidget<CSVViewer>;
  private _query: RegExp;
  private _changed = new Signal<this, void>(this);
}
