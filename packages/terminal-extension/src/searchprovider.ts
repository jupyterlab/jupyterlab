// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import {
  IReplaceOptions,
  ISearchProvider,
  SearchProvider
} from '@jupyterlab/documentsearch';
import { Terminal } from '@jupyterlab/terminal';
import { ITranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';
import type {
  ISearchDecorationOptions,
  ISearchOptions
} from '@xterm/addon-search';
import Color from 'color';

// The type for which isApplicable returns true
export type TerminalWidget = MainAreaWidget<Terminal>;

/**
 * Terminal search provider.
 */
export class TerminalSearchProvider extends SearchProvider<TerminalWidget> {
  /**
   * Constructor.
   *
   * @param widget The widget to search in.
   */
  constructor(protected widget: TerminalWidget) {
    super(widget);

    const terminal = this.widget.content;

    terminal.searchAddon.onDidChangeResults(event => {
      const { resultCount, resultIndex } = event;
      this._currentMatchIndex = resultCount > 0 ? resultIndex : null;
      this._matchesCount = resultCount > 0 ? resultCount : null;
    });

    terminal.themeChanged.connect(() => {
      this._onThemeChanged();
    });

    // Get initial theme colors.
    this._onThemeChanged();
  }

  /**
   * Create a search provider for the terminal widget.
   *
   * Note the widget provided is always checked using `isApplicable` before calling this
   * function.
   *
   * @param widget The terminal widget to search in.
   * @param translator [optional] The translator object.
   *
   * @returns The search provider for the terminal widget.
   */
  static createNew(
    widget: TerminalWidget,
    translator?: ITranslator
  ): ISearchProvider {
    return new TerminalSearchProvider(widget);
  }

  /**
   * Report whether or not this provider has the ability to search on the given object.
   */
  static isApplicable(domain: Widget): domain is TerminalWidget {
    return (
      domain instanceof MainAreaWidget && domain.content instanceof Terminal
    );
  }

  /**
   * Clear currently highlighted match.
   */
  async clearHighlight(): Promise<void> {
    this._clear();
    return Promise.resolve();
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    return this._currentMatchIndex;
  }

  /**
   * Stop a search and clear any internal state of the search provider.
   */
  async endQuery(): Promise<void> {
    this._clear();
    return Promise.resolve();
  }

  /**
   * Highlight the next match.
   *
   * @returns The next match if available
   */
  async highlightNext(): Promise<undefined> {
    this._next();
    return Promise.resolve(undefined);
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if available.
   */
  async highlightPrevious(): Promise<undefined> {
    this._previous();
    return Promise.resolve(undefined);
  }

  /**
   * The number of matches.
   */
  get matchesCount(): number | null {
    return this._matchesCount;
  }

  /**
   * Replace the currently selected match with the provided text
   * Not implemented in the terminal as it is read-only.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Replace all matches in the widget with the provided text
   * Not implemented in the terminal as it is read-only.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Start a search using the provided query.
   *
   * @param query A RegExp to be use to perform the search
   */
  async startQuery(query: RegExp): Promise<void> {
    this._query = query;
    this._next();
    return Promise.resolve();
  }

  /**
   * Clear current search.
   */
  private _clear(): void {
    this._query = undefined;
    this._currentMatchIndex = null;
    this._matchesCount = null;
    this.widget.content.searchAddon.clearDecorations();
  }

  /**
   * Convert a color to the '#rrggbb' format expected by xtermjs SearchAddon.
   *
   * @param color Color to convert.
   * @param backgroundColor Background color to mix with `color` if it is not opaque.
   * @returns Color string of form '#rrggbb'
   */
  private _colorToRRGGBB(color: string, backgroundColor: string): string {
    try {
      let converted = Color(color);
      const alpha = converted.alpha();
      if (alpha < 1) {
        converted = converted.mix(Color(backgroundColor), alpha);
      }
      return converted.hex();
    } catch (e) {
      // Return a valid color rather than propagate exception.
      return '#888888';
    }
  }

  private _next(): void {
    if (this._query !== undefined) {
      const { flags, source } = this._query;
      this.widget.content.searchAddon.findNext(
        source,
        this._searchOptions(flags)
      );
    }
  }

  /**
   * Update cached xtermjs search decoration options following a theme change.
   * If a search is currently displayed, rerun it to update the colors.
   */
  private _onThemeChanged() {
    const theme = this.widget.content.getXTermTheme();
    const { background } = theme;
    const activeMatchBackground = this._colorToRRGGBB(
      theme.activeMatchBackground,
      background
    );
    // matchBackground uses the theme's selectionBackground.
    const matchBackground = this._colorToRRGGBB(
      theme.selectionBackground,
      background
    );

    this._searchDecorationOptions = {
      // The following two need to be in string #rrggbb format to be acceptable to xtermjs.
      activeMatchBackground,
      matchBackground,
      // The following two are compulsory so they need to be set but we do not use them.
      matchOverviewRuler: '',
      activeMatchColorOverviewRuler: ''
    };

    if (this._query !== undefined) {
      // To update the displayed search colors, need to remove colors and rerun the search.
      this.widget.content.searchAddon.clearDecorations();
      this._next();
    }
  }

  private _previous(): void {
    if (this._query !== undefined) {
      const { flags, source } = this._query;
      this.widget.content.searchAddon.findPrevious(
        source,
        this._searchOptions(flags)
      );
    }
  }

  /**
   * Return xtermjs search options based on regex query flags and theme colors.
   *
   * @param flags Regex query flags.
   *
   * @returns xtermjs search options.
   */
  private _searchOptions(flags: string): ISearchOptions {
    return {
      caseSensitive: !flags.includes('i'),
      incremental: false,
      regex: true,
      wholeWord: false, // Dealt with by regex
      decorations: this._searchDecorationOptions
    };
  }

  readonly isReadOnly = true;

  private _query?: RegExp;
  private _currentMatchIndex: number | null = null;
  private _matchesCount: number | null = null;
  private _searchDecorationOptions?: ISearchDecorationOptions;
}
