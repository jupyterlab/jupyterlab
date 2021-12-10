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

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  IBaseSearchProvider,
  ITextSearchMatch
} from '@jupyterlab/documentsearch';
import { ObservableList } from '@jupyterlab/observables';
import { ISignal, Signal } from '@lumino/signaling';
import * as CodeMirror from 'codemirror';
import { CodeMirrorEditor } from './editor';

type MatchMap = { [key: number]: { [key: number]: ITextSearchMatch } };

export class CodeMirrorSearchProvider implements IBaseSearchProvider {
  constructor(editor: CodeMirrorEditor) {
    this.editor = editor;
  }
  /**
   * Initialize the search using a CodeMirrorEditor object.
   */
  async startQuery(query: RegExp): Promise<void> {
    if (!this.editor) {
      return Promise.resolve();
    }
    return this._startQuery(query, false);
  }

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

    CodeMirror.on(this.editor.doc, 'change', this._onDocChanged.bind(this));
    if (refreshOverlay) {
      this._refreshOverlay();
    }
    this._setInitialMatches(query);

    const matches = this._parseMatchesFromState();
    if (matches.length === 0) {
      return Promise.resolve();
    }

    return Promise.resolve();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  async endQuery(removeOverlay = true): Promise<void> {
    this._matchState = {};
    this._currentMatch = null;

    if (removeOverlay) {
      this.editor.removeOverlay(this._overlay);
    }
    const from = this.editor.getCursor('from');
    const to = this.editor.getCursor('to');
    // Setting a reverse selection to allow search-as-you-type to maintain the
    // current selected match.  See comment in _findNext for more details.
    if (from !== to) {
      this.editor.setSelection({
        start: this._toEditorPos(to),
        end: this._toEditorPos(from)
      });
    }
    CodeMirror.off(this.editor.doc, 'change', this._onDocChanged.bind(this));
  }

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    if (!this.isSubProvider) {
      this.editor.focus();
    }
    return this.endQuery();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(): Promise<ITextSearchMatch | undefined> {
    const cursorMatch = this._findNext(false);
    if (!cursorMatch) {
      return;
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    this._currentMatch = match;
    return match;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(): Promise<ITextSearchMatch | undefined> {
    const cursorMatch = this._findNext(true);
    if (!cursorMatch) {
      return;
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    this._currentMatch = match;
    return match;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string): Promise<boolean> {
    // If the current selection exactly matches the current match,
    // replace it.  Otherwise, just select the next match after the cursor.
    let replaceOccurred = false;
    if (this._currentMatchIsSelected()) {
      const cursor = this.editor.getSearchCursor(
        this._query,
        this.editor.getCursor('from'),
        !this._query.ignoreCase
      );
      if (!cursor.findNext()) {
        return replaceOccurred;
      }
      replaceOccurred = true;
      cursor.replace(newText);
    }
    await this.highlightNext();
    return replaceOccurred;
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    let replaceOccurred = false;
    return new Promise((resolve, _) => {
      this.editor.operation(() => {
        const cursor = this.editor.getSearchCursor(
          this._query,
          undefined,
          !this._query.ignoreCase
        );
        while (cursor.findNext()) {
          replaceOccurred = true;
          cursor.replace(newText);
        }
        this._matchState = {};
        this._currentMatch = null;
        resolve(replaceOccurred);
      });
    });
  }

  /**
   * The same list of matches provided by the startQuery promise resolution
   */
  get matches(): ITextSearchMatch[] {
    return this._parseMatchesFromState();
  }

  /**
   * The number of matches.
   */
  get matchesSize(): number | null {
    let size = 0;
    for (const line in this._matchState) {
      size += Object.keys(this._matchState[line]).length;
    }
    return size;
  }

  get currentMatch(): ITextSearchMatch | null {
    return this._currentMatch;
  }

  /**
   * Signal indicating that something in the search has changed, so the UI should update
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    if (!this._currentMatch) {
      return null;
    }
    return this._currentMatch.index;
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  readonly isReadOnly = false;

  /**
   * Set whether or not the CodemirrorSearchProvider will wrap to the beginning
   * or end of the document on invocations of highlightNext or highlightPrevious, respectively
   */
  isSubProvider = false;

  private _onDocChanged(_: any, changeObj: CodeMirror.EditorChange) {
    // If we get newlines added/removed, the line numbers across the
    // match state are all shifted, so here we need to recalculate it
    if (changeObj.text.length > 1 || (changeObj.removed?.length ?? 0) > 1) {
      this._setInitialMatches(this._query);
      this._changed.emit(undefined);
    }
  }

  private _refreshOverlay() {
    this.editor.operation(() => {
      // clear search first
      this.editor.removeOverlay(this._overlay);
      this._overlay = this._getSearchOverlay();
      this.editor.addOverlay(this._overlay);
      this._changed.emit(undefined);
    });
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
  private _setInitialMatches(query: RegExp) {
    this._matchState = {};

    const start = CodeMirror.Pos(this.editor.doc.firstLine(), 0);
    const end = CodeMirror.Pos(this.editor.doc.lastLine());
    const content = this.editor.doc.getRange(start, end);
    const lines = content.split('\n');
    const totalMatchIndex = 0;
    lines.forEach((line, lineNumber) => {
      query.lastIndex = 0;
      let match = query.exec(line);
      while (match) {
        const col = match.index;
        const matchObj: ITextSearchMatch = {
          text: match[0],
          line: lineNumber,
          position: col,
          fragment: line,
          index: totalMatchIndex
        };
        if (!this._matchState[lineNumber]) {
          this._matchState[lineNumber] = {};
        }
        this._matchState[lineNumber][col] = matchObj;
        match = query.exec(line);
      }
    });
  }

  private _getSearchOverlay() {
    return {
      /**
       * Token function is called when a line needs to be processed -
       * when the overlay is initially created, it's called on all lines;
       * when a line is modified and needs to be re-evaluated, it's called
       * on just that line.
       *
       * This implementation of the token function both constructs/maintains
       * the overlay and keeps track of the match state as the document is
       * updated while a search is active.
       */
      token: (stream: CodeMirror.StringStream) => {
        const currentPos = stream.pos;
        this._query.lastIndex = currentPos;
        const lineText = stream.string;
        const match = this._query.exec(lineText);
        const line = (stream as any).lineOracle.line;

        // If starting at position 0, the tokenization of this line has just started.
        // Blow away everything on this line in the state so it can be updated.
        if (
          stream.start === currentPos &&
          currentPos === 0 &&
          !!this._matchState[line]
        ) {
          this._matchState[line] = {};
        }
        if (match && match.index === currentPos) {
          // found match, add it to state
          const matchLength = match[0].length;
          const matchObj: ITextSearchMatch = {
            text: lineText.substr(currentPos, matchLength),
            line: line,
            position: currentPos,
            fragment: lineText,
            index: 0 // fill in index when flattening, later
          };
          if (!this._matchState[line]) {
            this._matchState[line] = {};
          }
          this._matchState[line][currentPos] = matchObj;
          // move the stream along and return searching style for the token
          stream.pos += matchLength || 1;

          // if the last thing on the line was a match, make sure we still
          // emit the changed signal so the display can pick up the updates
          if (stream.eol()) {
            this._changed.emit(undefined);
          }
          return 'searching';
        } else if (match) {
          // there's a match in the stream, advance the stream to its position
          stream.pos = match.index;
        } else {
          // no matches, consume the rest of the stream
          this._changed.emit(undefined);
          stream.skipToEnd();
        }
      }
    };
  }

  private _findNext(reverse: boolean): Private.ICodeMirrorMatch | null {
    return this.editor.operation(() => {
      const caseSensitive = this._query.ignoreCase;

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

      const cursorToGet = reverse ? 'anchor' : 'head';
      const lastPosition = this.editor.getCursor(cursorToGet);
      const position = this._toEditorPos(lastPosition);
      let cursor: CodeMirror.SearchCursor = this.editor.getSearchCursor(
        this._query,
        lastPosition,
        !caseSensitive
      );
      if (!cursor.find(reverse)) {
        // if we don't want to loop, no more matches found, reset the cursor and exit
        if (this.isSubProvider) {
          this.editor.setCursorPosition(position, { scroll: false });
          this._currentMatch = null;
          return null;
        }

        // if we do want to loop, try searching from the bottom/top
        const startOrEnd = reverse
          ? CodeMirror.Pos(this.editor.lastLine())
          : CodeMirror.Pos(this.editor.firstLine(), 0);
        cursor = this.editor.getSearchCursor(
          this._query,
          startOrEnd,
          !caseSensitive
        );
        if (!cursor.find(reverse)) {
          return null;
        }
      }
      const fromPos: CodeMirror.Position = cursor.from();
      const toPos: CodeMirror.Position = cursor.to();
      const selRange: CodeEditor.IRange = {
        start: {
          line: fromPos.line,
          column: fromPos.ch
        },
        end: {
          line: toPos.line,
          column: toPos.ch
        }
      };

      this.editor.setSelection(selRange);
      this.editor.scrollIntoView(
        {
          from: fromPos,
          to: toPos
        },
        100
      );
      return {
        from: fromPos,
        to: toPos
      };
    });
  }

  private _parseMatchesFromState(): ITextSearchMatch[] {
    let index = 0;
    // Flatten state map
    const matches = new Array<ITextSearchMatch>();

    for (const lineKey in this._matchState) {
      const lineMatches = this._matchState[lineKey];
      for (const posKey in lineMatches) {
        const match = lineMatches[posKey];
        match.index = index++;
        matches.push(match);
      }
    }

    return matches;
  }

  private _toEditorPos(posIn: CodeMirror.Position): CodeEditor.IPosition {
    return {
      line: posIn.line,
      column: posIn.ch
    };
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
      this._currentMatch.line === currentSelection.start.line &&
      this._currentMatch.position === currentSelection.start.column &&
      this._currentMatch.text.length === currentSelectionLength &&
      selectionIsOneLine
    );
  }

  protected editor: CodeMirrorEditor;
  private _query: RegExp;
  private _currentMatch: ITextSearchMatch | null;
  private _matchState: MatchMap = {};
  private _changed = new Signal<this, void>(this);
  private _overlay: any;
}

export class CodeMirrorSearchHighlighter {
  /**
   *
   * @param editor
   * @param matches
   *
   * ### Notes
   * `matches` must be stored by (line, position)
   */
  constructor(
    editor: CodeMirrorEditor,
    matches: ObservableList<ITextSearchMatch>
  ) {
    this._cm = editor;
    this._matches = matches;
  }

  refreshOverlay(): void {
    this._refreshOverlay();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  endQuery(removeOverlay = true): Promise<void> {
    this._currentMatchIndex = null;

    if (removeOverlay) {
      this._cm.removeOverlay(this._overlay);
    }
    const from = this._cm.getCursor('from');
    const to = this._cm.getCursor('to');
    // Setting a reverse selection to allow search-as-you-type to maintain the
    // current selected match.  See comment in _findNext for more details.
    if (from !== to) {
      this._cm.setSelection({
        start: this._toEditorPos(to),
        end: this._toEditorPos(from)
      });
    }

    return Promise.resolve();
  }

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    return this.endQuery();
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightNext(): Promise<ITextSearchMatch | undefined> {
    this._findNext(false);
    return Promise.resolve(this.currentMatch ?? undefined);
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  highlightPrevious(): Promise<ITextSearchMatch | undefined> {
    this._findNext(true);
    return Promise.resolve(this.currentMatch ?? undefined);
  }

  get currentMatch(): ITextSearchMatch | null {
    return this._currentMatchIndex !== null
      ? this._matches.get(this._currentMatchIndex)
      : null;
  }

  /**
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    return this._currentMatchIndex;
  }

  get editor(): CodeMirrorEditor {
    return this._cm;
  }

  private _refreshOverlay() {
    this._cm.operation(() => {
      // clear search first
      this._cm.removeOverlay(this._overlay);
      this._overlay = this._getSearchOverlay();
      this._cm.addOverlay(this._overlay);
    });
  }

  private _getSearchOverlay() {
    let lastMatchIndex = 0;

    return {
      /**
       * Token function is called when a line needs to be processed -
       * when the overlay is initially created, it's called on all lines;
       * when a line is modified and needs to be re-evaluated, it's called
       * on just that line.
       *
       * This implementation of the token function both constructs/maintains
       * the overlay and keeps track of the match state as the document is
       * updated while a search is active.
       */
      token: (stream: CodeMirror.StringStream) => {
        const line = (stream as any).lineOracle.line;

        let found = Utils.find(
          this._matches,
          line,
          lastMatchIndex,
          this._matches.length - 1
        );

        if (found !== null) {
          lastMatchIndex = found;
          let match: ITextSearchMatch;
          while ((match = this._matches.get(found)).position < stream.pos) {
            found += 1;
            if (
              found >= this._matches.length ||
              this._matches.get(found).line !== line
            ) {
              // no matches, consume the rest of the stream
              stream.skipToEnd();
              return null;
            }
          }

          if (stream.pos === match.position) {
            // move the stream along and return searching style for the token
            stream.pos += match.text.length || 1;
            return 'searching';
          } else {
            stream.pos = match.position;
          }
        } else {
          // no matches, consume the rest of the stream
          stream.skipToEnd();
        }
        return null;
      }
    };
  }

  private _findNext(reverse: boolean): void {
    if (this._matches.length === 0) {
      // No-op
      return;
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

    const cursorToGet = reverse ? 'anchor' : 'head';
    const lastPosition = this._cm.getCursor(cursorToGet);
    const position = this._toEditorPos(lastPosition);

    let found = Utils.findNext(
      this._matches,
      position.line,
      0,
      this._matches.length - 1
    );

    let match: ITextSearchMatch;
    if (found !== null) {
      while (
        (match = this._matches.get(found)).line === position.line &&
        match.position < position.column
      ) {
        found += 1;
        if (found >= this._matches.length) {
          found = null;
          break;
        }
      }
    }

    if (found === null) {
      // Don't loop
      return;
    }

    if (reverse) {
      found -= 1;
      if (found < 0) {
        // Don't loop
        return;
      }
    }

    match = this._matches.get(found);

    this._cm.operation(() => {
      const fromPos: CodeMirror.Position = {
        line: match.line,
        ch: match.position
      };
      const toPos: CodeMirror.Position = {
        line: match.line,
        ch: match.position + match.text.length
      };

      const selRange: CodeEditor.IRange = {
        start: {
          line: fromPos.line,
          column: fromPos.ch
        },
        end: {
          line: toPos.line,
          column: toPos.ch
        }
      };

      this._cm.setSelection(selRange);
      this._cm.scrollIntoView(
        {
          from: fromPos,
          to: toPos
        },
        100
      );
    });
  }

  private _toEditorPos(posIn: CodeMirror.Position): CodeEditor.IPosition {
    return {
      line: posIn.line,
      column: posIn.ch
    };
  }

  private _cm: CodeMirrorEditor;
  private _currentMatchIndex: number | null;
  private _matches: ObservableList<ITextSearchMatch>;
  private _overlay: any;
}

export class SearchState {
  posFrom: CodeMirror.Position;
  posTo: CodeMirror.Position;
  lastQuery: string;
  query: RegExp;
}

namespace Private {
  export interface ICodeMirrorMatch {
    from: CodeMirror.Position;
    to: CodeMirror.Position;
  }
}

export namespace Utils {
  export function find(
    matches: ObservableList<ITextSearchMatch>,
    line: number,
    lowerBound = 0,
    higherBound = Infinity
  ): number | null {
    higherBound = Math.min(matches.length, higherBound);

    while (lowerBound <= higherBound) {
      let middle = lowerBound + Math.floor(0.5 * (lowerBound + higherBound));
      const currentLine = matches.get(middle).line;

      if (currentLine === line) {
        // find the first match for line (multiple matches are available on the same line)
        do {
          middle -= 1;
        } while (matches.get(middle).line === line && middle > 0);
        return middle + 1;
      } else if (currentLine < line) {
        lowerBound = middle + 1;
        if (line < matches.get(lowerBound).line) {
          // No match for line
          return null;
        }
      } else if (currentLine > line) {
        higherBound = middle - 1;
        if (line > matches.get(higherBound).line) {
          // No match for line
          return null;
        }
      }
    }

    const position = lowerBound > 0 ? lowerBound - 1 : 0;
    const match = matches.get(position);
    return match.line === line ? position : null;
  }

  export function findNext(
    matches: ObservableList<ITextSearchMatch>,
    line: number,
    lowerBound = 0,
    higherBound = Infinity
  ): number | null {
    higherBound = Math.min(matches.length, higherBound);

    while (lowerBound <= higherBound) {
      let middle = lowerBound + Math.floor(0.5 * (lowerBound + higherBound));
      const currentLine = matches.get(middle).line;

      if (currentLine === line) {
        // find the first match for line (multiple matches are available on the same line)
        do {
          middle -= 1;
        } while (matches.get(middle).line === line && middle > 0);
        return middle + 1;
      } else if (currentLine < line) {
        lowerBound = middle + 1;
        if (line < matches.get(lowerBound).line) {
          // No match for line
          return lowerBound;
        }
      } else if (currentLine > line) {
        higherBound = middle - 1;
        if (line > matches.get(higherBound).line) {
          // No match for line
          return middle;
        }
      }
    }

    const position = lowerBound > 0 ? lowerBound - 1 : 0;
    const match = matches.get(position);
    return match.line >= line ? position : null;
  }
}
