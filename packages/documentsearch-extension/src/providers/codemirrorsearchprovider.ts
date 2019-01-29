import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchMatch } from '../index';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

type MatchMap = { [key: number]: { [key: number]: ISearchMatch } };

export class CodeMirrorSearchProvider implements ISearchProvider {
  startSearch(query: RegExp, domain: any): Promise<ISearchMatch[]> {
    this._query = query;
    if (domain instanceof CodeMirrorEditor) {
      this._cm = domain;
    } else {
      this._cm = domain.content.editor;
    }
    Private.clearSearch(this._cm);

    CodeMirror.on(this._cm.doc, 'change', (instance: any, changeObj: any) => {
      // If we get newlines added/removed, the line numbers across the
      // match state are all shifted, so here we need to recalcualte it
      if (changeObj.text.length > 1 || changeObj.removed.length > 1) {
        this._setInitialMatches(this._query);
      }
    });
    this._refreshOverlay(query);
    this._setInitialMatches(query);

    const matches = Private.parseMatchesFromState(this._matchState);
    if (matches.length === 0) {
      return Promise.resolve([]);
    }
    if (this._shouldLoop) {
      const cursorMatch = Private.findNext(
        this._cm,
        false,
        this._query.ignoreCase,
        this._shouldLoop
      );
      const match = this._matchState[cursorMatch.from.line][
        cursorMatch.from.ch
      ];
      this._matchIndex = match.index;
    }
    return Promise.resolve(matches);
  }

  endSearch(): Promise<void> {
    this._matchState = {};
    this._matchIndex = 0;
    if (this._cm) {
      Private.clearSearch(this._cm);
    }
    return Promise.resolve();
  }

  highlightNext(): Promise<ISearchMatch> {
    const cursorMatch = Private.findNext(
      this._cm,
      false,
      this._query.ignoreCase,
      this._shouldLoop
    );
    if (!cursorMatch) {
      return Promise.resolve(null);
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    this._matchIndex = match.index;
    return Promise.resolve(match);
  }

  highlightPrevious(): Promise<ISearchMatch> {
    const cursorMatch = Private.findNext(
      this._cm,
      true,
      this._query.ignoreCase,
      this._shouldLoop
    );
    if (!cursorMatch) {
      return Promise.resolve(null);
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    this._matchIndex = match.index;
    return Promise.resolve(match);
  }

  static canSearchOn(domain: any): boolean {
    return domain.content && domain.content.editor instanceof CodeMirrorEditor;
  }

  get matches(): ISearchMatch[] {
    return Private.parseMatchesFromState(this._matchState);
  }

  get changed(): ISignal<this, void> {
    return this._changed;
  }

  get currentMatchIndex(): number {
    return this._matchIndex;
  }

  set shouldLoop(shouldLoop: boolean) {
    this._shouldLoop = shouldLoop;
  }

  clearSelection(): void {
    return null;
  }

  private _refreshOverlay(query: RegExp) {
    const state = Private.getSearchState(this._cm);
    this._cm.operation(() => {
      state.query = query;
      // clear search first
      this._cm.removeOverlay(state.overlay);
      state.overlay = this._getSearchOverlay();
      this._cm.addOverlay(state.overlay);
      // skips show matches on scroll bar here
      state.posFrom = state.posTo = this._cm.getCursor();
      this._changed.emit(null);
    });
  }

  /**
   * This manually constructs the initial match state across the whole
   * document. This must be done manually because the codemirror overlay
   * is lazy-loaded, so it will only tokenize lines that are in or near
   * the viewport.  This is sufficient for efficiently maintaining the
   * state when changes are made to the document, as changes occur in or
   * near the viewport, but to scan the whole document, a manual search
   * across the entire content is required.
   * @param query The search term
   */
  private _setInitialMatches(query: RegExp) {
    this._matchState = {};

    const start = CodeMirror.Pos(this._cm.doc.firstLine(), 0);
    const end = CodeMirror.Pos(this._cm.doc.lastLine());
    const content = this._cm.doc.getRange(start, end);
    const lines = content.split('\n');
    let totalMatchIndex = 0;
    lines.forEach((line, lineNumber) => {
      query.lastIndex = 0;
      let match = query.exec(line);
      while (match) {
        const col = match.index;
        const matchObj: ISearchMatch = {
          text: match[0],
          line: lineNumber,
          column: col,
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
       * when the overlay is intially created, it's called on all lines;
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
          !!this._matchState[line] &&
          Object.keys(this._matchState[line]).length !== 0
        ) {
          this._matchState[line] = {};
        }
        if (match && match.index === currentPos) {
          // found match, add it to state
          const matchLength = match[0].length;
          const matchObj: ISearchMatch = {
            text: lineText.substr(currentPos, matchLength),
            line: line,
            column: currentPos,
            fragment: lineText,
            index: 0 // fill in index when flattening, later
          };
          if (!this._matchState[line]) {
            this._matchState[line] = {};
          }
          this._matchState[line][currentPos] = matchObj;
          // move the stream along and return searching style for the token
          stream.pos += matchLength || 1;
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

  private _query: RegExp;
  private _cm: CodeMirrorEditor;
  private _matchIndex: number;
  private _matchState: MatchMap = {};
  private _shouldLoop: boolean = true;
  private _changed = new Signal<this, void>(this);
}

export class SearchState {
  public posFrom: CodeMirror.Position;
  public posTo: CodeMirror.Position;
  public lastQuery: string;
  public query: RegExp;
}

namespace Private {
  interface ICodeMirrorMatch {
    from: CodeMirror.Position;
    to: CodeMirror.Position;
  }

  export function findNext(
    cm: CodeMirrorEditor,
    reverse: boolean,
    caseSensitive: boolean,
    shouldLoop: boolean
  ): ICodeMirrorMatch {
    return cm.operation(() => {
      const state = getSearchState(cm);
      const cursorToGet = reverse ? 'from' : 'to';
      const lastPosition = cm.getCursor(cursorToGet);
      const position = toEditorPos(lastPosition);
      let cursor: CodeMirror.SearchCursor = cm.getSearchCursor(
        state.query,
        lastPosition,
        !caseSensitive
      );
      if (!cursor.find(reverse)) {
        // if we don't want to loop, no more matches found, reset the cursor and exit
        if (!shouldLoop) {
          cm.setCursorPosition(position);
          return null;
        }

        // if we do want to loop, try searching from the bottom/top
        const startOrEnd = reverse
          ? CodeMirror.Pos(cm.lastLine())
          : CodeMirror.Pos(cm.firstLine(), 0);
        cursor = cm.getSearchCursor(state.query, startOrEnd, !caseSensitive);
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

      cm.setSelection(selRange);
      cm.scrollIntoView(
        {
          from: fromPos,
          to: toPos
        },
        100
      );
      state.posFrom = fromPos;
      state.posTo = toPos;
      return {
        from: fromPos,
        to: toPos
      };
    });
  }

  export function getSearchState(cm: CodeMirrorEditor) {
    if (!cm.state.search) {
      cm.state.search = new SearchState();
    }
    return cm.state.search;
  }

  export function clearSearch(cm: CodeMirrorEditor) {
    const state = getSearchState(cm);
    state.lastQuery = state.query;
    if (!state.query) {
      return;
    }
    state.query = state.queryText = null;
    cm.removeOverlay(state.overlay);
    if (state.annotate) {
      state.annotate.clear();
      state.annotate = null;
    }
  }

  export function parseMatchesFromState(state: MatchMap): ISearchMatch[] {
    let index = 0;
    // Flatten state map and update the index of each match
    const matches: ISearchMatch[] = Object.keys(state).reduce(
      (result: ISearchMatch[], lineNumber: string) => {
        const lineKey = parseInt(lineNumber, 10);
        const lineMatches: { [key: number]: ISearchMatch } = state[lineKey];
        Object.keys(lineMatches).forEach((pos: string) => {
          const posKey = parseInt(pos, 10);
          const match: ISearchMatch = lineMatches[posKey];
          match.index = index;
          index += 1;
          result.push(match);
        });
        return result;
      },
      []
    );
    return matches;
  }

  function toEditorPos(posIn: CodeMirror.Position): CodeEditor.IPosition {
    return {
      line: posIn.line,
      column: posIn.ch
    };
  }
}
