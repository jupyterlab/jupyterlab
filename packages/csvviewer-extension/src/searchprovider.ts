// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ISearchProvider, ISearchMatch } from '@jupyterlab/documentsearch';
import { CSVViewer } from '@jupyterlab/csvviewer';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { Signal, ISignal } from '@lumino/signaling';
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
  getInitialQuery(searchTarget: CSVDocumentWidget): any {
    // CSV Viewer does not support selection
    return null;
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
    searchTarget: CSVDocumentWidget
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
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._target.content.searchService.find(this._query, true);
    return undefined;
  }

  /**
   * Replace the currently selected match with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async replaceCurrentMatch(newText: string): Promise<boolean> {
    return false;
  }

  /**
   * Replace all matches in the notebook with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    return false;
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
