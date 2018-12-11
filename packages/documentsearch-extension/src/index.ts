/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

// import { Widget } from '@phosphor/widgets';

import { SearchBox } from './searchbox';

import { Executor } from './executor';

import { SearchProviderRegistry } from './searchproviderregistry';

import '../style/index.css';

export interface ISearchMatch {
  /**
   * Text of the exact match itself
   */
  readonly text: string;

  /**
   * Fragment containing match
   */
  readonly fragment: string;

  /**
   * Line number of match
   */
  line: number;

  /**
   * Column location of match
   */
  column: number;

  /**
   * Index among the other matches
   */
  index: number;
}
export interface ISearchOptions {
  /**
   * Actual search query entered by user
   */
  query: string;

  /**
   * Should the search be performed in a case-sensitive manner?
   */
  caseSensitive: boolean;

  /**
   * Is the search term to be treated as a regular expression?
   */
  regex: boolean;
}

export interface ISearchProvider {
  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param options All of the search parameters configured in the search panel
   *
   * @returns A promise that resolves with a list of all matches
   */
  startSearch(
    options: ISearchOptions,
    searchTarget: any
  ): Promise<ISearchMatch[]>;

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  endSearch(): Promise<void>;

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(): Promise<ISearchMatch>;

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ISearchMatch>;

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  canSearchOn(domain: any): boolean;

  /**
   * The same list of matches provided by the startSearch promise resoluton
   */
  readonly matches: ISearchMatch[];

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number;
}

console.log('documentsearch-extension loaded');

/**
 * Initialization data for the document-search extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'document-search',
  autoStart: true,
  requires: [ICommandPalette],
  activate: (app: JupyterLab, palette: ICommandPalette) => {
    console.log('JupyterLab extension document-search is activated!');

    // Create registry, retrieve all default providers
    const registry: SearchProviderRegistry = new SearchProviderRegistry();
    const executor: Executor = new Executor(registry, app.shell);

    // Create widget, attach to signals
    const widget: SearchBox = new SearchBox();

    // Default to just searching on the current widget, could eventually
    // read a flag provided by the search box widget if we want to search something else
    widget.startSearch.connect((_, searchOptions) =>
      executor.startSearch(searchOptions)
    );
    widget.endSearch.connect(_ => executor.endSearch());
    widget.highlightNext.connect(_ => executor.highlightNext());
    widget.highlightPrevious.connect(_ => executor.highlightPrevious());

    const command: string = 'document:search';
    app.commands.addCommand(command, {
      label: 'Search the open document',
      execute: () => {
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.addToLeftArea(widget, { rank: 400 });
        }
        app.shell.activateById(widget.id);
      }
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'Tutorial' });
  }
};

export default extension;
