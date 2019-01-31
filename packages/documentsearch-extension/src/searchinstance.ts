// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisplayState, ISearchProvider } from '.';
import { createSearchOverlay } from './searchoverlay';

import { MainAreaWidget } from '@jupyterlab/apputils';

import { Widget } from '@phosphor/widgets';
import { Signal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';

/**
 * Represents a search on a single widget.
 */
export class SearchInstance implements IDisposable {
  constructor(widget: Widget, searchProvider: ISearchProvider) {
    this._widget = widget;
    this._activeProvider = searchProvider;

    this._searchWidget = createSearchOverlay(
      this._displayUpdateSignal,
      this._displayState,
      this._onCaseSensitiveToggled.bind(this),
      this._onRegexToggled.bind(this),
      this._highlightNext.bind(this),
      this._highlightPrevious.bind(this),
      this._startSearch.bind(this),
      this.dispose.bind(this)
    );

    // TODO: this does not update if the toolbar changes height.
    if (this._widget instanceof MainAreaWidget) {
      // Offset the position of the search widget to not cover the toolbar.
      this._searchWidget.node.style.top = `${
        this._widget.toolbar.node.clientHeight
      }px`;
    }
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
  focusInput(): void {
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

  private async _startSearch(query: RegExp) {
    // save the last query (or set it to the current query if this is the first)
    if (this._activeProvider && this._displayState.query) {
      await this._activeProvider.endSearch();
    }
    this._displayState.query = query;
    await this._activeProvider.startSearch(query, this._widget);
    this.updateIndices();

    // this signal should get injected when the widget is
    // created and hooked up to react!
    this._activeProvider.changed.connect(
      this.updateIndices,
      this
    );
  }

  /**
   * Dispose of the resources held by the search instance.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._activeProvider.endSearch();
    this._searchWidget.dispose();
    Signal.clearData(this);
  }

  /**
   * Test whether the tracker is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private async _highlightNext() {
    if (!this._displayState.query) {
      return;
    }
    await this._activeProvider.highlightNext();
    this.updateIndices();
  }

  private async _highlightPrevious() {
    if (!this._displayState.query) {
      return;
    }
    await this._activeProvider.highlightPrevious();
    this.updateIndices();
  }

  private _onCaseSensitiveToggled = () => {
    this._displayState.caseSensitive = !this._displayState.caseSensitive;
    this._updateDisplay();
  };

  private _onRegexToggled = () => {
    this._displayState.useRegex = !this._displayState.useRegex;
    this._updateDisplay();
  };

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
  private _isDisposed = false;
}
