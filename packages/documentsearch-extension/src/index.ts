// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import '../style/index.css';

import { SearchProviderRegistry } from './searchproviderregistry';
import { SearchInstance } from './searchinstance';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { ISignal } from '@phosphor/signaling';

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
  startQuery(query: RegExp, searchTarget: any): Promise<ISearchMatch[]>;

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  endQuery(): Promise<void>;

  /**
   * Resets UI state as it was before the search process began.  Cleans up and
   * disposes of all internal state.
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
   * The same list of matches provided by the startQuery promise resoluton
   */
  readonly matches: ISearchMatch[];

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  readonly changed: ISignal<ISearchProvider, void>;

  /**
   * The current index of the selected match.
   */
  readonly currentMatchIndex: number | null;
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
const extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/documentsearch:plugin',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    mainMenu: IMainMenu | null
  ) => {
    // Create registry, retrieve all default providers
    const registry: SearchProviderRegistry = new SearchProviderRegistry();
    const activeSearches: {
      [key: string]: SearchInstance;
    } = {};

    const startCommand: string = 'documentsearch:start';
    const nextCommand: string = 'documentsearch:highlightNext';
    const prevCommand: string = 'documentsearch:highlightPrevious';
    app.commands.addCommand(startCommand, {
      label: 'Find…',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        return registry.getProviderForWidget(currentWidget) !== undefined;
      },
      execute: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const widgetId = currentWidget.id;
        let searchInstance = activeSearches[widgetId];
        if (!searchInstance) {
          const searchProvider = registry.getProviderForWidget(currentWidget);
          if (!searchProvider) {
            return;
          }
          searchInstance = new SearchInstance(currentWidget, searchProvider);

          activeSearches[widgetId] = searchInstance;
          // find next and previous are now enabled
          app.commands.notifyCommandChanged();

          searchInstance.disposed.connect(() => {
            delete activeSearches[widgetId];
            // find next and previous are now not enabled
            app.commands.notifyCommandChanged();
          });
        }
        searchInstance.focusInput();
      }
    });

    app.commands.addCommand(nextCommand, {
      label: 'Find Next',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        return !!activeSearches[currentWidget.id];
      },
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const instance = activeSearches[currentWidget.id];
        if (!instance) {
          return;
        }

        await instance.provider.highlightNext();
        instance.updateIndices();
      }
    });

    app.commands.addCommand(prevCommand, {
      label: 'Find Previous',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        return !!activeSearches[currentWidget.id];
      },
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const instance = activeSearches[currentWidget.id];
        if (!instance) {
          return;
        }

        await instance.provider.highlightPrevious();
        instance.updateIndices();
      }
    });

    // Add the command to the palette.
    palette.addItem({ command: startCommand, category: 'Main Area' });
    palette.addItem({ command: nextCommand, category: 'Main Area' });
    palette.addItem({ command: prevCommand, category: 'Main Area' });

    // Add main menu notebook menu.
    if (mainMenu) {
      mainMenu.editMenu.addGroup(
        [
          { command: startCommand },
          { command: nextCommand },
          { command: prevCommand }
        ],
        10
      );
    }
  }
};

export default extension;
