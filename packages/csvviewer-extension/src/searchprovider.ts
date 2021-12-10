// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CSVViewer } from '@jupyterlab/csvviewer';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { ISearchMatch, ISearchProvider } from '@jupyterlab/documentsearch';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

// The type for which canSearchFor returns true
export type CSVDocumentWidget = DocumentWidget<CSVViewer>;

export class CSVSearchProvider implements ISearchProvider<CSVDocumentWidget> {
  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static canSearchOn(domain: Widget): domain is CSVDocumentWidget {
    // check to see if the CSVSearchProvider can search on the
    // first cell, false indicates another editor is present
    return (
      domain instanceof DocumentWidget && domain.content instanceof CSVViewer
    );
  }

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(searchTarget: CSVDocumentWidget): string {
    // CSV Viewer does not support selection
    return '';
  }

  /**
   * Initialize the search state with the given target.
   *
   * @param searchTarget The widget to be searched
   */
  startSearch(searchTarget: CSVDocumentWidget): void {
    this._target = searchTarget;
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
  startQuery(query: RegExp): Promise<void> {
    if (!this._target) {
      return Promise.resolve();
    }
    this._query = query;
    this._target.content.searchService.find(query);

    return Promise.resolve();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  endQuery(): Promise<void> {
    this._target.content.searchService.clear();

    return Promise.resolve();
  }

  /**
   * Resets UI state as it was before the search process began.  Cleans up and
   * disposes of all internal state.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    await this.endQuery();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(): Promise<ISearchMatch | undefined> {
    this._target.content.searchService.find(this._query);
    return Promise.resolve(undefined);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._target.content.searchService.find(this._query, true);
    return Promise.resolve(undefined);
  }

  /**
   * Replace the currently selected match with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
   * @returns A promise that resolves once the action has completed.
   */
  replaceCurrentMatch(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the notebook with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
   * @returns A promise that resolves once the action has completed.
   */
  replaceAllMatches(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The number of matches.
   */
  readonly matchesSize = null;

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number | null = null;

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = true;

  private _target: CSVDocumentWidget;
  private _query: RegExp;
  private _changed = new Signal<this, void>(this);
}
