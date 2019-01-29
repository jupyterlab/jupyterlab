// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import '../style/index.css';

import { SearchProviderRegistry } from './searchproviderregistry';

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';

import { ISignal, Signal } from '@phosphor/signaling';
import { createSearchOverlay } from './searchoverlay';
import { Widget } from '@phosphor/widgets';

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
  highlightNext(): Promise<ISearchMatch>;

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ISearchMatch>;

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

/**
 * Represents a search on a single widget.
 */
export class SearchInstance {
  constructor(widget: Widget, searchProvider: ISearchProvider) {
    this._widget = widget;
    this._activeProvider = searchProvider;
    this._initializeSearchAssets();
  }

  /**
   * The search widget.
   */
  get searchWidget() {
    return this._searchWidget;
  }

  /**
   * The search provider.
   */
  get provider() {
    return this._activeProvider;
  }

  /**
   * Focus the search widget input.
   */
  focus(): void {
    this._displayState.forceFocus = true;

    // Trigger a rerender without resetting the forceFocus.
    this._displayUpdateSignal.emit(this._displayState);
  }

  /**
   * Updates the match index and total display in the search widget.
   */
  updateIndices(): void {
    this._displayState.totalMatches = this._activeProvider.matches.length;
    this._displayState.currentIndex = this._activeProvider.currentMatchIndex;
    this._updateDisplay();
  }

  private _updateDisplay() {
    // Reset the focus attribute to make sure we don't steal focus.
    this._displayState.forceFocus = false;

    // Trigger a rerender
    this._displayUpdateSignal.emit(this._displayState);
  }

  private _startSearch(query: RegExp) {
    // save the last query (or set it to the current query if this is the first)
    this._displayState.query = query;
    let cleanupPromise = Promise.resolve();
    if (this._activeProvider) {
      cleanupPromise = this._activeProvider.endSearch();
    }
    cleanupPromise.then(() =>
      this._activeProvider.startSearch(query, this._widget).then(() => {
        this.updateIndices();
        // this signal should get injected when the widget is
        // created and hooked up to react!
        this._activeProvider.changed.connect(
          this.updateIndices,
          this
        );
      })
    );
  }

  private _endSearch() {
    this._activeProvider.endSearch().then(() => {
      Signal.disconnectAll(this);
      this._searchWidget.dispose();
      this._activeProvider.changed.disconnect(this.updateIndices, this);
    });
  }

  private _highlightNext() {
    if (!this._displayState.query) {
      return;
    }
    this._activeProvider.highlightNext().then(this.updateIndices.bind(this));
  }

  private _highlightPrevious() {
    if (!this._displayState.query) {
      return;
    }
    this._activeProvider
      .highlightPrevious()
      .then(this.updateIndices.bind(this));
  }

  private _onCaseSensitiveToggled = () => {
    this._displayState.caseSensitive = !this._displayState.caseSensitive;
    this._updateDisplay();
  };

  private _onRegexToggled = () => {
    this._displayState.useRegex = !this._displayState.useRegex;
    this._updateDisplay();
  };

  private _initializeSearchAssets() {
    const onCaseSensitiveToggled = () => {
      this._displayState.caseSensitive = !this._displayState.caseSensitive;
      this._updateDisplay();
    };

    const onRegexToggled = () => {
      this._displayState.useRegex = !this._displayState.useRegex;
      this._updateDisplay();
    };

    // TODO: circular import
    this._searchWidget = createSearchOverlay(
      this._displayUpdateSignal,
      this._displayState,
      this._onCaseSensitiveToggled.bind(this),
      this._onRegexToggled.bind(this),
      this._highlightNext.bind(this),
      this._highlightPrevious.bind(this),
      this._startSearch.bind(this),
      this._endSearch.bind(this)
    );

    // TODO: this does not update if the toolbar changes height.
    if (this._widget instanceof MainAreaWidget) {
      // Offset the position of the search widget to not cover the toolbar.
      this._searchWidget.node.style.top = `${
        this._widget.toolbar.node.clientHeight
      }px`;
    }
  }

  private _widget: Widget;
  private _displayState: IDisplayState = {
    currentIndex: 0,
    totalMatches: 0,
    caseSensitive: false,
    useRegex: false,
    inputText: '',
    query: null,
    errorMessage: '',
    forceFocus: true
  };
  private _displayUpdateSignal = new Signal<this, IDisplayState>(this);
  private _activeProvider: ISearchProvider;
  private _searchWidget: Widget;
}

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
