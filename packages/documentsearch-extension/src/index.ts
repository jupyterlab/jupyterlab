// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import '../style/index.css';

import { SearchProviderRegistry } from './searchproviderregistry';

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';

import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import { SearchInstance } from './searchinstance';

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

/**
 * This interface is meant to enforce that SearchProviders implement the static
 * canSearchOn function.
 */
export interface ISearchProviderConstructor {
  new (): ISearchProvider;
  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  canSearchOn(domain: any): boolean;
}

export interface ISearchProvider {
  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   *
   * @returns A promise that resolves with a list of all matches
   */
  startSearch(query: RegExp, searchTarget: any): Promise<ISearchMatch[]>;

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
  highlightNext(): Promise<ISearchMatch | undefined>;

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ISearchMatch | undefined>;

  /**
   * The same list of matches provided by the startSearch promise resoluton
   */
  readonly matches: ISearchMatch[];

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  readonly changed: ISignal<ISearchProvider, void>;

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number;
}

export interface IDisplayState {
  /**
   * The index of the currently selected match
   */
  currentIndex: number;

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
   * The text in the entry
   */
  inputText: string;

  /**
   * The query constructed from the text and the case/regex flags
   */
  query: RegExp;

  /**
   * An error message (used for bad regex syntax)
   */
  errorMessage: string;

  /**
   * Should the focus forced into the input on the next render?
   */
  forceFocus: boolean;
}

/**
 * Initialization data for the document-search extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: '@jupyterlab/documentsearch:plugin',
  autoStart: true,
  requires: [ICommandPalette],
  activate: (app: JupyterLab, palette: ICommandPalette) => {
    // Create registry, retrieve all default providers
    const registry: SearchProviderRegistry = new SearchProviderRegistry();
    const activeSearches: Private.ActiveSearchMap = {};

    const startCommand: string = 'documentsearch:start';
    const nextCommand: string = 'documentsearch:highlightNext';
    const prevCommand: string = 'documentsearch:highlightPrevious';
    app.commands.addCommand(startCommand, {
      label: 'Search the open document',
      execute: () => {
        let currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        Private.onStartCommand(currentWidget, registry, activeSearches);
      }
    });

    app.commands.addCommand(nextCommand, {
      label: 'Next match in open document',
      execute: () => {
        let currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        Private.openBoxOrExecute(
          currentWidget,
          registry,
          activeSearches,
          Private.onNextCommand
        );
      }
    });

    app.commands.addCommand(prevCommand, {
      label: 'Previous match in open document',
      execute: () => {
        let currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        Private.openBoxOrExecute(
          currentWidget,
          registry,
          activeSearches,
          Private.onPrevCommand
        );
      }
    });

    // Add the command to the palette.
    palette.addItem({ command: startCommand, category: 'Main Area' });
  }
};

namespace Private {
  export type ActiveSearchMap = {
    [key: string]: SearchInstance;
  };

  export function openBoxOrExecute(
    currentWidget: Widget,
    registry: SearchProviderRegistry,
    activeSearches: ActiveSearchMap,
    command: (instance: SearchInstance) => void
  ): void {
    const instance = activeSearches[currentWidget.id];
    if (instance) {
      command(instance);
    } else {
      onStartCommand(currentWidget, registry, activeSearches);
    }
  }

  export function onStartCommand(
    currentWidget: Widget,
    registry: SearchProviderRegistry,
    activeSearches: ActiveSearchMap
  ): void {
    const widgetId = currentWidget.id;
    if (activeSearches[widgetId]) {
      activeSearches[widgetId].focus();
      // TODO: focusing when the notebook is in edit mode somehow does not
      // actually focus. Perhaps something in the notebook is stealing focus?
      return;
    }
    const searchProvider = registry.getProviderForWidget(currentWidget);
    if (!searchProvider) {
      // TODO: Is there a way to pass the invocation of ctrl+f through to the browser?
      return;
    }
    const searchInstance = new SearchInstance(currentWidget, searchProvider);
    activeSearches[widgetId] = searchInstance;

    searchInstance.searchWidget.disposed.connect(() => {
      delete activeSearches[widgetId];
    });
    Widget.attach(searchInstance.searchWidget, currentWidget.node);
  }

  export async function onNextCommand(instance: SearchInstance) {
    await instance.provider.highlightNext();
    instance.updateIndices();
  }

  export async function onPrevCommand(instance: SearchInstance) {
    await instance.provider.highlightPrevious();
    instance.updateIndices();
  }
}

export default extension;
