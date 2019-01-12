/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import '../style/index.css';

import { Executor } from './executor';
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
  lastQuery: RegExp;
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
    palette.addItem({ command: startCommand, category: 'Tutorial' });
  }
};

class SearchInstance {
  constructor(currentWidget: Widget, registry: SearchProviderRegistry) {
    this._widget = currentWidget;
    this.initializeSearchAssets(registry);
  }

  get searchWidget() {
    return this._searchWidget;
  }

  get executor() {
    return this._executor;
  }

  updateIndices(): void {
    this._displayState.totalMatches = this._executor.matches.length;
    this._displayState.currentIndex = this._executor.currentMatchIndex;
    this.updateDisplay();
  }

  private _widget: Widget;
  private _displayState: IDisplayUpdate;
  private _displayUpdateSignal: Signal<Executor, IDisplayUpdate>;
  private _executor: Executor;
  private _searchWidget: Widget;
  private updateDisplay() {
    this._displayUpdateSignal.emit(this._displayState);
  }
  private startSearch(query: RegExp) {
    // save the last query (or set it to the current query if this is the first)
    this._displayState.lastQuery = this._displayState.query || query;
    this._displayState.query = query;
    this._executor.startSearch(query).then(() => {
      this.updateIndices();
      // this signal should get injected when the widget is
      // created and hooked up to react!
      this._executor.changed.connect(
        this.updateIndices,
        this
      );
    });
  }
  private endSearch() {
    this._executor.endSearch().then(() => {
      // more cleanup probably
      Signal.disconnectAll(this);
      this._searchWidget.dispose();
      this._executor.changed.disconnect(this.updateIndices, this);
    });
  }
  private highlightNext() {
    this._executor.highlightNext().then(this.updateIndices.bind(this));
  }
  private highlightPrevious() {
    this._executor.highlightPrevious().then(this.updateIndices.bind(this));
  }
  private initializeSearchAssets(registry: SearchProviderRegistry) {
    this._executor = new Executor(registry, this._widget);
    this._displayUpdateSignal = new Signal<Executor, IDisplayUpdate>(
      this._executor
    );

    this._displayState = {
      currentIndex: 0,
      totalMatches: 0,
      caseSensitive: false,
      useRegex: false,
      inputText: '',
      query: null,
      lastQuery: null
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
      this.endSearch.bind(this)
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
      const searchWidget = activeSearches[widgetId].searchWidget;
      // searchWidget.focusInput(); // focus WAS TODO
      searchWidget;
      return;
    }
    const searchInstance = new SearchInstance(currentWidget, registry);
    activeSearches[widgetId] = searchInstance;

    searchInstance.searchWidget.disposed.connect(() => {
      activeSearches[widgetId] = undefined;
    });
    Widget.attach(searchInstance.searchWidget, currentWidget.node);
  }

  export function onNextCommand(instance: SearchInstance) {
    instance.executor.highlightNext().then(() => instance.updateIndices());
  }

  export function onPrevCommand(instance: SearchInstance) {
    instance.executor.highlightPrevious().then(() => instance.updateIndices());
  }
}

export default extension;
