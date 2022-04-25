// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CSVViewer } from '@jupyterlab/csvviewer';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { ISearchProvider, SearchProvider } from '@jupyterlab/documentsearch';
import { ITranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';

// The type for which isApplicable returns true
export type CSVDocumentWidget = DocumentWidget<CSVViewer>;

/**
 * CSV viewer search provider
 */
export class CSVSearchProvider extends SearchProvider<CSVDocumentWidget> {
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
  static createNew(
    widget: CSVDocumentWidget,
    translator?: ITranslator
  ): ISearchProvider {
    return new CSVSearchProvider(widget);
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static isApplicable(domain: Widget): domain is CSVDocumentWidget {
    // check to see if the CSVSearchProvider can search on the
    // first cell, false indicates another editor is present
    return (
      domain instanceof DocumentWidget && domain.content instanceof CSVViewer
    );
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = true;

  /**
   * Clear currently highlighted match.
   */
  clearHighlight(): Promise<void> {
    // no-op
    return Promise.resolve();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The match is never returned by this provider
   */
  highlightNext(loop?: boolean): Promise<undefined> {
    this.widget.content.searchService.find(this._query);
    return Promise.resolve(undefined);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The match is never returned by this provider
   */
  highlightPrevious(loop?: boolean): Promise<undefined> {
    this.widget.content.searchService.find(this._query, true);
    return Promise.resolve(undefined);
  }

  /**
   * Replace the currently selected match with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
   * @param newText The replacement text
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  replaceCurrentMatch(newText: string, loop?: boolean): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the notebook with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
   * @param newText The replacement text
   *
   * @returns A promise that resolves once the action has completed.
   */
  replaceAllMatches(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   */
  startQuery(query: RegExp): Promise<void> {
    this._query = query;
    this.widget.content.searchService.find(query);

    return Promise.resolve();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   */
  endQuery(): Promise<void> {
    this.widget.content.searchService.clear();

    return Promise.resolve();
  }

  private _query: RegExp;
}
