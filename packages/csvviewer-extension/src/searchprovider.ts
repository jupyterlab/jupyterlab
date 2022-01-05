// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CSVViewer } from '@jupyterlab/csvviewer';
import { DocumentWidget } from '@jupyterlab/docregistry';
import {
  ISearchMatch,
  ISearchProvider,
  ISearchProviderRegistry,
  SearchProvider
} from '@jupyterlab/documentsearch';
import { ITranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';

// The type for which canSearchFor returns true
export type CSVDocumentWidget = DocumentWidget<CSVViewer>;

export class CSVSearchProvider extends SearchProvider<CSVDocumentWidget> {
  /**
   * Instantiate a search provider for the widget.
   *
   * #### Notes
   * The widget provided is always checked using `canSearchOn` before calling
   * this factory.
   *
   * @param widget The widget to search on
   * @param registry The search provider registry
   * @param translator [optional] The translator object
   *
   * @returns The search provider on the widget
   */
  static createSearchProvider(
    widget: CSVDocumentWidget,
    registry: ISearchProviderRegistry,
    translator?: ITranslator
  ): ISearchProvider<CSVDocumentWidget> {
    return new CSVSearchProvider(widget);
  }

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
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = true;

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
    this._query = query;
    this.widget.content.searchService.find(query);

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
    this.widget.content.searchService.clear();

    return Promise.resolve();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(loop?: boolean): Promise<ISearchMatch | undefined> {
    this.widget.content.searchService.find(this._query);
    return Promise.resolve(undefined);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(loop?: boolean): Promise<ISearchMatch | undefined> {
    this.widget.content.searchService.find(this._query, true);
    return Promise.resolve(undefined);
  }

  /**
   * Replace the currently selected match with the provided text
   * Not implemented in the CSV viewer as it is read-only.
   *
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
   * @returns A promise that resolves once the action has completed.
   */
  replaceAllMatches(newText: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  private _query: RegExp;
}
