/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import '../style/index.css';

import { SearchProviderRegistry } from './searchproviderregistry';

import {
  JupyterLab,
  JupyterLabPlugin,
  ApplicationShell
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';

import { ISignal, Signal } from '@phosphor/signaling';
import { createSearchOverlay } from './searchoverlay';
import { Widget } from '@phosphor/widgets';
import { DocumentWidget } from '@jupyterlab/docregistry';

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

export interface ISearchProvider {
  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param options All of the search parameters configured in the search panel
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
   * Report whether or not this provider has the ability to search on the given object
   */
  canSearchOn(domain: any): boolean;

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

export interface IDisplayUpdate {
  currentIndex: number;
  totalMatches: number;
  caseSensitive: boolean;
  useRegex: boolean;
  inputText: string;
  query: RegExp;
  errorMessage: string;
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
      execute: Private.onStartCommand.bind(
        null,
        app.shell,
        registry,
        activeSearches
      )
    });

    app.commands.addCommand(nextCommand, {
      label: 'Search the open document',
      execute: Private.openBoxOrExecute.bind(
        null,
        app.shell,
        registry,
        activeSearches,
        Private.onNextCommand
      )
    });

    app.commands.addCommand(prevCommand, {
      label: 'Search the open document',
      execute: Private.openBoxOrExecute.bind(
        null,
        app.shell,
        registry,
        activeSearches,
        Private.onPrevCommand
      )
    });

    // Add the command to the palette.
    palette.addItem({ command: startCommand, category: 'Main Area' });
  }
};

class SearchInstance {
  constructor(shell: ApplicationShell, registry: SearchProviderRegistry) {
    this._widget = shell.currentWidget;
    const toolbarHeight = (this._widget as DocumentWidget).toolbar.node
      .clientHeight;
    this.initializeSearchAssets(registry, toolbarHeight);
    // check the full content of the cm editor on start search, see if full content
    // is there or lazy loaded...  is it a codemirror setting?  can i force full load?
    // I don't think it's a lazy load issue, i think the changed event may not be getting fired?
    // need to evaluate if the search overlay is the one not being evaluated or if the changed event
    // isn't getting fired after the final update
  }

  get searchWidget() {
    return this._searchWidget;
  }

  get provider() {
    return this._activeProvider;
  }

  focus(): void {
    this._displayState.forceFocus = true;
    this._displayUpdateSignal.emit(this._displayState);
  }

  updateIndices(): void {
    this._displayState.totalMatches = this._activeProvider.matches.length;
    this._displayState.currentIndex = this._activeProvider.currentMatchIndex;
    this.updateDisplay();
  }

  private _widget: Widget;
  private _displayState: IDisplayUpdate;
  private _displayUpdateSignal: Signal<ISearchProvider, IDisplayUpdate>;
  private _activeProvider: ISearchProvider;
  private _searchWidget: Widget;
  private updateDisplay() {
    this._displayState.forceFocus = false;
    this._displayUpdateSignal.emit(this._displayState);
  }
  private startSearch(query: RegExp) {
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
  private endSearch() {
    this._activeProvider.endSearch().then(() => {
      // more cleanup probably
      Signal.disconnectAll(this);
      this._searchWidget.dispose();
      this._activeProvider.changed.disconnect(this.updateIndices, this);
    });
  }
  private highlightNext() {
    this._activeProvider.highlightNext().then(this.updateIndices.bind(this));
  }
  private highlightPrevious() {
    this._activeProvider
      .highlightPrevious()
      .then(this.updateIndices.bind(this));
  }
  private initializeSearchAssets(
    registry: SearchProviderRegistry,
    toolbarHeight: number
  ) {
    this._activeProvider = registry.getProviderForWidget(this._widget);
    this._displayUpdateSignal = new Signal<ISearchProvider, IDisplayUpdate>(
      this._activeProvider
    );

    this._displayState = {
      currentIndex: 0,
      totalMatches: 0,
      caseSensitive: false,
      useRegex: false,
      inputText: '',
      query: null,
      errorMessage: '',
      forceFocus: true
    };

    const onCaseSensitiveToggled = () => {
      this._displayState.caseSensitive = !this._displayState.caseSensitive;
      this.updateDisplay();
    };

    const onRegexToggled = () => {
      this._displayState.useRegex = !this._displayState.useRegex;
      this.updateDisplay();
    };

    this._searchWidget = createSearchOverlay(
      this._displayUpdateSignal,
      this._displayState,
      onCaseSensitiveToggled,
      onRegexToggled,
      this.highlightNext.bind(this),
      this.highlightPrevious.bind(this),
      this.startSearch.bind(this),
      this.endSearch.bind(this),
      toolbarHeight
    );
  }
}

namespace Private {
  export type ActiveSearchMap = {
    [key: string]: SearchInstance;
  };

  export function openBoxOrExecute(
    shell: ApplicationShell,
    registry: SearchProviderRegistry,
    activeSearches: ActiveSearchMap,
    command: Function
  ): void {
    const currentWidget = shell.currentWidget;
    const instance = activeSearches[currentWidget.id];
    if (instance) {
      command(instance);
    } else {
      onStartCommand(shell, registry, activeSearches);
    }
  }

  export function onStartCommand(
    shell: ApplicationShell,
    registry: SearchProviderRegistry,
    activeSearches: ActiveSearchMap
  ): void {
    const currentWidget = shell.currentWidget;
    const widgetId = currentWidget.id;
    if (activeSearches[widgetId]) {
      activeSearches[widgetId].focus();
      return;
    }
    const searchInstance = new SearchInstance(shell, registry);
    activeSearches[widgetId] = searchInstance;

    searchInstance.searchWidget.disposed.connect(() => {
      activeSearches[widgetId] = undefined;
    });
    Widget.attach(searchInstance.searchWidget, currentWidget.node);
  }

  export function onNextCommand(instance: SearchInstance) {
    instance.provider.highlightNext().then(() => instance.updateIndices());
  }

  export function onPrevCommand(instance: SearchInstance) {
    instance.provider.highlightPrevious().then(() => instance.updateIndices());
  }
}

export default extension;
