// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*
  Parts of the implementation of the search in this file were derived from
  CodeMirror's search at:
  https://github.com/codemirror/CodeMirror/blob/c2676685866c571a1c9c82cb25018cc08b4d42b2/addon/search/search.js
  which is licensed with the following license:

  MIT License

  Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

import { ISearchMatch } from '@jupyterlab/documentsearch';
import { JSONExt } from '@lumino/coreutils';
import { CodeMirrorEditor } from './editor';
import { StateEffect, StateEffectType, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  GenericSearchProvider,
  IBaseSearchProvider,
  IFilters,
  IReplaceOptions,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import { ISignal, Signal } from '@lumino/signaling';
import { ISharedText, SourceChange } from '@jupyter/ydoc';

/**
 * Search provider for editors.
 */
export abstract class EditorSearchProvider<
  T extends CodeEditor.IModel = CodeEditor.IModel
> implements IBaseSearchProvider
{
  /**
   * Constructor
   */
  constructor() {
    this.currentIndex = null;
    this._stateChanged = new Signal<IBaseSearchProvider, void>(this);
  }
  /**
   * CodeMirror search highlighter
   */
  protected get cmHandler(): CodeMirrorSearchHighlighter {
    if (!this._cmHandler) {
      this._cmHandler = new CodeMirrorSearchHighlighter(
        this.editor as CodeMirrorEditor
      );
    }
    return this._cmHandler;
  }

  /**
   * Text editor
   */
  protected abstract get editor(): CodeEditor.IEditor | null;
  /**
   * Editor content model
   */
  protected abstract get model(): T;

  /**
   * Changed signal to be emitted when search matches change.
   */
  get stateChanged(): ISignal<IBaseSearchProvider, void> {
    return this._stateChanged;
  }

  /**
   * Current match index
   */
  get currentMatchIndex(): number | null {
    return this.isActive ? this.currentIndex : null;
  }

  /**
   * Whether the cell search is active.
   *
   * This is used when applying search only on selected cells.
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Whether the search provider is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Number of matches in the cell.
   */
  get matchesCount(): number {
    return this.isActive ? this.cmHandler.matches.length : 0;
  }

  /**
   * Clear currently highlighted match
   */
  clearHighlight(): Promise<void> {
    this.currentIndex = null;
    this.cmHandler.clearHighlight();

    return Promise.resolve();
  }

  /**
   * Dispose the search provider
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    if (this.isActive) {
      this.endQuery().catch(reason => {
        console.error(`Failed to end search query on cells.`, reason);
      });
    }
  }

  /**
   * Set `isActive` status.
   *
   * #### Notes
   * It will start or end the search
   *
   * @param v New value
   */
  async setIsActive(v: boolean): Promise<void> {
    if (this._isActive !== v) {
      this._isActive = v;
    }
    if (this._isActive) {
      if (this.query !== null) {
        await this.startQuery(this.query, this.filters);
      }
    } else {
      await this.endQuery();
    }
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" the first match.
   *
   * @param query A RegExp to be use to perform the search
   * @param filters Filter parameters to pass to provider
   */
  async startQuery(query: RegExp | null, filters?: IFilters): Promise<void> {
    this.query = query;
    this.filters = filters;

    // Search input
    const content = this.model.sharedModel.getSource();
    await this.updateCodeMirror(content);
    this.model.sharedModel.changed.connect(this.onSharedModelChanged, this);
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    await this.cmHandler.endQuery();
    this.currentIndex = null;
  }

  /**
   * Highlight the next match.
   *
   * @returns The next match if there is one.
   */
  async highlightNext(loop = true): Promise<ISearchMatch | undefined> {
    if (this.matchesCount === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      // This starts from the cursor position
      let match = await this.cmHandler.highlightNext();
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        this.currentIndex = loop ? 0 : null;
      }
      return match;
    }

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Highlight the previous match.
   *
   * @returns The previous match if there is one.
   */
  async highlightPrevious(loop = true): Promise<ISearchMatch | undefined> {
    if (this.matchesCount === 0 || !this.isActive) {
      this.currentIndex = null;
    } else {
      // This starts from the cursor position
      let match = await this.cmHandler.highlightPrevious();
      if (match) {
        this.currentIndex = this.cmHandler.currentIndex;
      } else {
        this.currentIndex = loop ? this.matchesCount - 1 : null;
      }
      return match;
    }

    return Promise.resolve(this.getCurrentMatch());
  }

  /**
   * Replace the currently selected match with the provided text.
   *
   * If no match is selected, it won't do anything.
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (!this.isActive) {
      return Promise.resolve(false);
    }

    let occurred = false;

    if (
      this.currentIndex !== null &&
      this.currentIndex < this.cmHandler.matches.length
    ) {
      const editor = this.editor as CodeMirrorEditor;
      const selection = editor.state.sliceDoc(
        editor.state.selection.main.from,
        editor.state.selection.main.to
      );
      const match = this.getCurrentMatch();
      // If cursor is not on a selection, highlight the next match
      if (selection !== match?.text) {
        this.currentIndex = null;
        // The next will be highlighted as a consequence of this returning false
      } else {
        this.cmHandler.matches.splice(this.currentIndex, 1);
        this.currentIndex = null;
        const substitutedText = options?.regularExpression
          ? match!.text.replace(this.query!, newText)
          : newText;
        const insertText = options?.preserveCase
          ? GenericSearchProvider.preserveCase(match.text, substitutedText)
          : substitutedText;
        this.model.sharedModel.updateSource(
          match!.position,
          match!.position + match!.text.length,
          insertText
        );
        occurred = true;
      }
    }

    return Promise.resolve(occurred);
  }

  /**
   * Replace all matches in the cell source with the provided text
   *
   * @param newText The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (!this.isActive) {
      return Promise.resolve(false);
    }

    let occurred = this.cmHandler.matches.length > 0;
    let src = this.model.sharedModel.getSource();
    let lastEnd = 0;
    const finalSrc = this.cmHandler.matches.reduce((agg, match) => {
      const start = match.position as number;
      const end = start + match.text.length;
      const substitutedText = options?.regularExpression
        ? match!.text.replace(this.query!, newText)
        : newText;
      const insertText = options?.preserveCase
        ? GenericSearchProvider.preserveCase(match.text, substitutedText)
        : substitutedText;
      const newStep = `${agg}${src.slice(lastEnd, start)}${insertText}`;
      lastEnd = end;
      return newStep;
    }, '');

    if (occurred) {
      this.cmHandler.matches = [];
      this.currentIndex = null;
      this.model.sharedModel.setSource(`${finalSrc}${src.slice(lastEnd)}`);
    }
    return Promise.resolve(occurred);
  }

  /**
   * Get the current match if it exists.
   *
   * @returns The current match
   */
  protected getCurrentMatch(): ISearchMatch | undefined {
    if (this.currentIndex === null) {
      return undefined;
    } else {
      let match: ISearchMatch | undefined = undefined;
      if (this.currentIndex < this.cmHandler.matches.length) {
        match = this.cmHandler.matches[this.currentIndex];
      }
      return match;
    }
  }

  /**
   * Callback on source change
   *
   * @param emitter Source of the change
   * @param changes Source change
   */
  protected async onSharedModelChanged(
    emitter: ISharedText,
    changes: SourceChange
  ): Promise<void> {
    if (changes.sourceChange) {
      await this.updateCodeMirror(emitter.getSource());
      this._stateChanged.emit();
    }
  }

  /**
   * Update matches
   */
  protected async updateCodeMirror(content: string) {
    if (this.query !== null && this.isActive) {
      this.cmHandler.matches = await TextSearchEngine.search(
        this.query,
        content
      );
    } else {
      this.cmHandler.matches = [];
    }
  }

  /**
   * Current match index
   */
  protected currentIndex: number | null = null;
  /**
   * Current search filters
   */
  protected filters: IFilters | undefined;
  /**
   * Current search query
   */
  protected query: RegExp | null = null;
  // Needs to be protected so subclass can emit the signal too.
  protected _stateChanged: Signal<IBaseSearchProvider, void>;
  private _isActive = true;
  private _isDisposed = false;
  private _cmHandler: CodeMirrorSearchHighlighter | null = null;
}

/**
 * Helper class to highlight texts in a code mirror editor.
 *
 * Highlighted texts (aka `matches`) must be provided through
 * the `matches` attributes.
 */
export class CodeMirrorSearchHighlighter {
  /**
   * Constructor
   *
   * @param editor The CodeMirror editor
   */
  constructor(editor: CodeMirrorEditor | null) {
    this._cm = editor;
    this._matches = new Array<ISearchMatch>();
    this._currentIndex = null;

    this._highlightEffect = StateEffect.define<{ matches: ISearchMatch[] }>({
      map: (value, mapping) => ({
        matches: value.matches.map(v => ({
          text: v.text,
          position: mapping.mapPos(v.position)
        }))
      })
    });
    this._highlightMark = Decoration.mark({ class: 'cm-searching' });

    this._highlightField = StateField.define<DecorationSet>({
      create: () => {
        return Decoration.none;
      },
      update: (highlights, transaction) => {
        highlights = highlights.map(transaction.changes);
        for (let ef of transaction.effects) {
          if (ef.is(this._highlightEffect)) {
            const e = ef as StateEffect<{ matches: ISearchMatch[] }>;
            if (e.value.matches.length) {
              highlights = highlights.update({
                add: e.value.matches.map(m =>
                  this._highlightMark.range(
                    m.position,
                    m.position + m.text.length
                  )
                ),
                // filter out old marks
                filter: () => false
              });
            } else {
              highlights = Decoration.none;
            }
          }
        }
        return highlights;
      },
      provide: f => EditorView.decorations.from(f)
    });
  }

  /**
   * The current index of the selected match.
   */
  get currentIndex(): number | null {
    return this._currentIndex;
  }

  /**
   * The list of matches
   */
  get matches(): ISearchMatch[] {
    return this._matches;
  }
  set matches(v: ISearchMatch[]) {
    if (!JSONExt.deepEqual(this._matches as any, v as any)) {
      this._matches = v;
    }
    this._refresh();
  }

  /**
   * Clear all highlighted matches
   */
  clearHighlight(): void {
    this._currentIndex = null;
    this._highlightCurrentMatch();
  }

  /**
   * Clear the highlighted matches.
   */
  endQuery(): Promise<void> {
    this._currentIndex = null;
    this._matches = [];

    if (this._cm) {
      this._cm.editor.dispatch({
        effects: this._highlightEffect.of({ matches: [] })
      });

      const selection = this._cm.state.selection.main;
      const from = selection.from;
      const to = selection.to;
      // Setting a reverse selection to allow search-as-you-type to maintain the
      // current selected match. See comment in _findNext for more details.
      if (from !== to) {
        this._cm.editor.dispatch({ selection: { anchor: to, head: from } });
      }
    }

    return Promise.resolve();
  }

  /**
   * Highlight the next match
   *
   * @returns The next match if available
   */
  highlightNext(): Promise<ISearchMatch | undefined> {
    this._currentIndex = this._findNext(false);
    this._highlightCurrentMatch();
    return Promise.resolve(
      this._currentIndex !== null
        ? this._matches[this._currentIndex]
        : undefined
    );
  }

  /**
   * Highlight the previous match
   *
   * @returns The previous match if available
   */
  highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._currentIndex = this._findNext(true);
    this._highlightCurrentMatch();
    return Promise.resolve(
      this._currentIndex !== null
        ? this._matches[this._currentIndex]
        : undefined
    );
  }

  /**
   * Set the editor
   *
   * @param editor Editor
   */
  setEditor(editor: CodeMirrorEditor): void {
    if (this._cm) {
      throw new Error('CodeMirrorEditor already set.');
    } else {
      this._cm = editor;
      this._refresh();
      if (this._currentIndex !== null) {
        this._highlightCurrentMatch();
      }
    }
  }

  private _highlightCurrentMatch(): void {
    if (!this._cm) {
      // no-op
      return;
    }

    // Highlight the current index
    if (this._currentIndex !== null) {
      const match = this.matches[this._currentIndex];
      this._cm.editor.focus();
      this._cm.editor.dispatch({
        selection: {
          anchor: match.position,
          head: match.position + match.text.length
        },
        scrollIntoView: true
      });
    } else {
      // Set cursor to remove any selection
      this._cm.editor.dispatch({ selection: { anchor: 0 } });
    }
  }

  private _refresh(): void {
    if (!this._cm) {
      // no-op
      return;
    }

    let effects: StateEffect<unknown>[] = [
      this._highlightEffect.of({ matches: this.matches })
    ];
    if (!this._cm!.state.field(this._highlightField, false)) {
      effects.push(StateEffect.appendConfig.of([this._highlightField]));
    }
    this._cm!.editor.dispatch({ effects });
  }

  private _findNext(reverse: boolean): number | null {
    if (this._matches.length === 0) {
      // No-op
      return null;
    }
    // In order to support search-as-you-type, we needed a way to allow the first
    // match to be selected when a search is started, but prevent the selected
    // search to move for each new keypress.  To do this, when a search is ended,
    // the cursor is reversed, putting the head at the 'from' position.  When a new
    // search is started, the cursor we want is at the 'from' position, so that the same
    // match is selected when the next key is entered (if it is still a match).
    //
    // When toggling through a search normally, the cursor is always set in the forward
    // direction, so head is always at the 'to' position.  That way, if reverse = false,
    // the search proceeds from the 'to' position during normal toggling.  If reverse = true,
    // the search always proceeds from the 'anchor' position, which is at the 'from'.

    const cursor = this._cm!.state.selection.main;
    let lastPosition = reverse ? cursor.anchor : cursor.head;
    if (lastPosition === 0 && reverse && this.currentIndex === null) {
      // The default position is (0, 0) but we want to start from the end in that case
      lastPosition = this._cm!.doc.length;
    }

    const position = lastPosition;

    let found = Utils.findNext(
      this._matches,
      position,
      0,
      this._matches.length - 1
    );

    if (found === null) {
      // Don't loop
      return reverse ? this._matches.length - 1 : null;
    }

    if (reverse) {
      found -= 1;
      if (found < 0) {
        // Don't loop
        return null;
      }
    }

    return found;
  }

  private _cm: CodeMirrorEditor | null;
  private _currentIndex: number | null;
  private _matches: ISearchMatch[];
  private _highlightEffect: StateEffectType<{ matches: ISearchMatch[] }>;
  private _highlightMark: Decoration;
  private _highlightField: StateField<DecorationSet>;
}

/**
 * Helpers namespace
 */
namespace Utils {
  /**
   * Find the closest match at `position` just after it.
   *
   * #### Notes
   * Search is done using a binary search algorithm
   *
   * @param matches List of matches
   * @param position Searched position
   * @param lowerBound Lower range index
   * @param higherBound High range index
   * @returns The next match or null if none exists
   */
  export function findNext(
    matches: ISearchMatch[],
    position: number,
    lowerBound = 0,
    higherBound = Infinity
  ): number | null {
    higherBound = Math.min(matches.length - 1, higherBound);

    while (lowerBound <= higherBound) {
      let middle = Math.floor(0.5 * (lowerBound + higherBound));
      const currentPosition = matches[middle].position;

      if (currentPosition < position) {
        lowerBound = middle + 1;
        if (
          lowerBound < matches.length &&
          matches[lowerBound].position > position
        ) {
          return lowerBound;
        }
      } else if (currentPosition > position) {
        higherBound = middle - 1;
        if (higherBound > 0 && matches[higherBound].position < position) {
          return middle;
        }
      } else {
        return middle;
      }
    }

    // Next could be the first item
    const first = lowerBound > 0 ? lowerBound - 1 : 0;
    const match = matches[first];
    return match.position >= position ? first : null;
  }
}
