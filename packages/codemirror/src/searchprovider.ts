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

import {
  GenericSearchProvider,
  IBaseSearchProvider,
  IReplaceOptions,
  ISearchMatch,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import { JSONExt } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { CodeMirrorEditor } from './editor';
import { RegExpCursor } from '@codemirror/search';
import {
  ChangeSpec,
  Compartment,
  StateEffect,
  StateEffectType,
  StateField
} from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate
} from '@codemirror/view';

type MatchMap = { [key: number]: { [key: number]: ISearchMatch } };

/**
 * CodeMirror search provider for file editor
 */
export class CodeMirrorSearchProvider implements IBaseSearchProvider {
  constructor(editor: CodeMirrorEditor) {
    this.editor = editor;
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
                )
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

    this._listener = new Compartment();
    this.editor.injectExtension(this._listener.of([]));
  }

  /**
   * Whether the search provider is disposed or not.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Dispose the search provider
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    Signal.clearData(this);
  }

  /**
   * Initialize the search using a CodeMirrorEditor object.
   *
   * @param query the search regular expression
   */
  async startQuery(query: RegExp): Promise<void> {
    if (!this.editor) {
      return Promise.resolve();
    }
    return this._startQuery(query);
  }

  /**
   * Refresh the search highlight overlay
   */
  refreshOverlay(): void {
    this._refreshOverlay();
  }

  private async _startQuery(
    query: RegExp,
    refreshOverlay: boolean = true
  ): Promise<void> {
    // no point in removing overlay in the middle of the search
    await this.endQuery(false);

    this._query = query;

    this.editor.editor.dispatch({
      effects: this._listener.reconfigure(
        EditorView.updateListener.of((v: ViewUpdate) => {
          if (v.docChanged) {
            this._onDocChanged(v);
          }
        })
      )
    });

    await this._setInitialMatches(query);

    if (refreshOverlay) {
      this._refreshOverlay();
    }

    const matches = this._parseMatchesFromState();
    if (matches.length === 0) {
      return Promise.resolve();
    }
    const cursorMatch = this._findNext(false);
    const match =
      cursorMatch &&
      this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    this._currentMatch = match;

    await this._highlightCurrentMatch(cursorMatch);
    return Promise.resolve();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @param removeOverlay Whether to remove the search highlight overlay or not.
   */
  async endQuery(removeOverlay = true): Promise<void> {
    this._matchState = {};
    this._currentMatch = null;

    const from = this.editor.getPositionAt(
      this.editor.state.selection.main.from
    );
    const to = this.editor.getPositionAt(this.editor.state.selection.main.to);
    // Setting a reverse selection to allow search-as-you-type to maintain the
    // current selected match.  See comment in _findNext for more details.
    if (from !== to) {
      this.editor.setSelection({
        start: to,
        end: from
      });
    }
    this.editor.editor.dispatch({
      effects: this._listener.reconfigure([])
    });
  }

  /**
   * Clear currently highlighted match.
   */
  clearHighlight(): Promise<void> {
    this._currentMatch = null;
    const cursor = this.editor.getCursorPosition();
    // Reset cursor position to remove any selection
    this.editor.setCursorPosition(cursor);

    return Promise.resolve();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(loop?: boolean): Promise<ISearchMatch | undefined> {
    return this._highlightCurrentMatch(this._findNext(false));
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(loop?: boolean): Promise<ISearchMatch | undefined> {
    return this._highlightCurrentMatch(this._findNext(true));
  }

  private async _highlightCurrentMatch(
    cursorMatch: Private.ICodeMirrorMatch | null
  ): Promise<ISearchMatch | undefined> {
    // Highlight the current index
    if (!cursorMatch) {
      // Set cursor to remove any selection
      this.editor.editor.dispatch({ selection: { anchor: 0 } });
      return;
    }

    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    this._currentMatch = match;
    this.editor.editor.focus();
    this.editor.editor.dispatch({
      selection: {
        anchor: match.position,
        head: match.position + match.text.length
      },
      scrollIntoView: true
    });
    return match;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @param newText The replacement text
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    // If the current selection exactly matches the current match,
    // replace it.  Otherwise, just select the next match after the cursor.
    let replaceOccurred = false;
    if (this._currentMatchIsSelected()) {
      const cursor = new RegExpCursor(
        this.editor.doc,
        this._query.source,
        { ignoreCase: !this._query.ignoreCase },
        this.editor.state.selection.main.from
      ).next();
      if (cursor.done) {
        return replaceOccurred;
      }
      const value = cursor.value;
      replaceOccurred = true;
      const insertText = options?.preserveCase
        ? GenericSearchProvider.preserveCase(
            this.editor.doc.sliceString(cursor.value.from, cursor.value.to),
            newText
          )
        : newText;
      this.editor.editor.dispatch({
        changes: { from: value.from, to: value.to, insert: insertText }
      });
    }
    await this.highlightNext();
    return replaceOccurred;
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @param newText The replacement text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    let replaceOccurred = false;
    return new Promise((resolve, _) => {
      let cursor = new RegExpCursor(this.editor.doc, this._query.source, {
        ignoreCase: !this._query.ignoreCase
      }).next();
      let changeSpec: ChangeSpec[] = [];
      while (!cursor.done) {
        replaceOccurred = true;
        const insertText = options?.preserveCase
          ? GenericSearchProvider.preserveCase(
              this.editor.doc.sliceString(cursor.value.from, cursor.value.to),
              newText
            )
          : newText;
        changeSpec.push({
          from: cursor.value.from,
          to: cursor.value.to,
          insert: insertText
        });
        cursor = cursor.next();
      }
      this.editor.editor.dispatch({ changes: changeSpec });
      this._matchState = {};
      this._currentMatch = null;
      resolve(replaceOccurred);
    });
  }

  /**
   * The list of matches
   */
  get matches(): ISearchMatch[] {
    return this._parseMatchesFromState();
  }

  /**
   * The number of matches.
   */
  get matchesCount(): number | null {
    let size = 0;
    for (const line in this._matchState) {
      size += Object.keys(this._matchState[line]).length;
    }
    return size;
  }

  /**
   * The current match
   */
  get currentMatch(): ISearchMatch | null {
    return this._currentMatch;
  }

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  get stateChanged(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    if (!this._currentMatch) {
      return null;
    }

    // TODO make it more efficient
    return this.matches.indexOf(this._currentMatch);
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = false;

  private _onDocChanged(update: ViewUpdate): void {
    // TODO: CM6 migration
    if (update.changes.length) {
      this._setInitialMatches(this._query)
        .then(() => {
          this._changed.emit(undefined);
        })
        .catch(reason => {
          console.error(
            `Fail to reapply search on CodeMirror document change:\n${reason}`
          );
        });
    }
  }

  private _refreshOverlay() {
    let effects: StateEffect<unknown>[] = [
      this._highlightEffect.of({ matches: this.matches })
    ];
    if (!this.editor.state.field(this._highlightField, false)) {
      effects.push(StateEffect.appendConfig.of([this._highlightField]));
    }
    this.editor.editor.dispatch({ effects });
    this._changed.emit(undefined);
  }

  /**
   * Do a full search on the entire document.
   *
   * This manually constructs the initial match state across the whole
   * document. This must be done manually because the codemirror overlay
   * is lazy-loaded, so it will only tokenize lines that are in or near
   * the viewport.  This is sufficient for efficiently maintaining the
   * state when changes are made to the document, as changes occur in or
   * near the viewport, but to scan the whole document, a manual search
   * across the entire content is required.
   *
   * @param query The search term
   */
  private async _setInitialMatches(query: RegExp) {
    this._matchState = {};

    const content = this.editor.doc.toString();
    const matches = await TextSearchEngine.search(query, content);

    matches.forEach(match => {
      const { line, ch } = this._getPosition(match.position);
      if (!this._matchState[line]) {
        this._matchState[line] = {};
      }
      this._matchState[line][ch] = match;
    });
  }

  private _findNext(reverse: boolean): Private.ICodeMirrorMatch | null {
    const caseSensitive = this._query.ignoreCase;
    const state = this.editor.state;

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

    const lastPosition = reverse
      ? state.selection.main.anchor
      : state.selection.main.head;
    let cursor = new RegExpCursor(
      this.editor.doc,
      this._query.source,
      { ignoreCase: !caseSensitive },
      lastPosition
    ).next();
    if (cursor.done) {
      const startOrEnd = reverse ? this.editor.doc.length : 0;
      cursor = new RegExpCursor(
        this.editor.doc,
        this._query.source,
        { ignoreCase: !caseSensitive },
        startOrEnd
      ).next();
      if (cursor.done) {
        return null;
      }
    }
    return {
      from: this._getPosition(cursor.value.from),
      to: this._getPosition(cursor.value.to)
    };
  }

  // TODO: remove this when Position API are removed and we work with
  // offsets only. Contrary to the functions in CodeMirrorEditor,
  // these functions work with CM6 position (i.e. line number starting at 1).
  private _getPosition(offset: number): { line: number; ch: number } {
    const line = this.editor.doc.lineAt(offset);
    return { line: line.number, ch: offset - line.from };
  }

  private _parseMatchesFromState(): ISearchMatch[] {
    // Flatten state map
    const matches = new Array<ISearchMatch>();

    for (const lineKey in this._matchState) {
      const lineMatches = this._matchState[lineKey];
      for (const posKey in lineMatches) {
        matches.push(lineMatches[posKey]);
      }
    }

    return matches;
  }

  private _currentMatchIsSelected(): boolean {
    if (!this._currentMatch) {
      return false;
    }
    const currentSelection = this.editor.getSelection();
    const currentSelectionLength =
      currentSelection.end.column - currentSelection.start.column;
    const selectionIsOneLine =
      currentSelection.start.line === currentSelection.end.line;
    return (
      selectionIsOneLine &&
      this._currentMatch.text.length === currentSelectionLength &&
      this._currentMatch.position ===
        this.editor.doc.line(currentSelection.start.line).from +
          currentSelection.start.column
    );
  }

  protected editor: CodeMirrorEditor;
  private _query: RegExp;
  private _currentMatch: ISearchMatch | null;
  private _matchState: MatchMap = {};
  private _changed = new Signal<this, void>(this);
  private _disposed = false;
  private _highlightEffect: StateEffectType<{ matches: ISearchMatch[] }>;
  private _highlightMark: Decoration;
  private _highlightField: StateField<DecorationSet>;
  private _listener: Compartment;
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
                )
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

namespace Private {
  export interface ICodeMirrorMatch {
    from: { line: number; ch: number };
    to: { line: number; ch: number };
  }
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
