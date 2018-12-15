import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchMatch } from '../index';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';

type MatchMap = { [key: number]: { [key: number]: ISearchMatch } };

export class CodeMirrorSearchProvider implements ISearchProvider {
  startSearch(
    query: RegExp,
    searchTarget: CodeMirrorEditor
  ): Promise<ISearchMatch[]> {
    this._query = query;
    this._cm = searchTarget;

    Private.clearSearch(this._cm);

    const state = Private.getSearchState(this._cm);
    this._cm.operation(() => {
      state.query = query;
      // clear search first
      this._cm.removeOverlay(state.overlay);
      state.overlay = Private.searchOverlay(state.query, this._matchState);
      this._cm.addOverlay(state.overlay);
      // skips show matches on scroll bar here
      state.posFrom = state.posTo = this._cm.getCursor();
      // Private.findNext(this._cm, false);
    });
    const matches = Private.parseMatchesFromState(this._matchState);
    return Promise.resolve(matches);
  }

  endSearch(): Promise<void> {
    Private.clearSearch(this._cm);
    return Promise.resolve();
  }

  highlightNext(): Promise<ISearchMatch> {
    const cursorMatch = Private.findNext(
      this._cm,
      false,
      this._query.ignoreCase
    );
    if (!cursorMatch) {
      return Promise.resolve(null);
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    return Promise.resolve(match);
  }

  highlightPrevious(): Promise<ISearchMatch> {
    console.log('codemirror search provider: highlightPrevious');
    const cursorMatch = Private.findNext(
      this._cm,
      true,
      this._query.ignoreCase
    );
    if (!cursorMatch) {
      return Promise.resolve(null);
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    return Promise.resolve(match);
  }

  canSearchOn(domain: any): boolean {
    console.log('codemirror search provider: canSearchOn');
    return false;
  }

  get matches(): ISearchMatch[] {
    return Private.parseMatchesFromState(this._matchState);
  }

  get currentMatchIndex(): number {
    return this._matchIndex;
  }

  clearSelection(): void {
    return null;
  }

  private _query: RegExp;
  private _cm: CodeMirrorEditor;
  private _matchIndex: number;
  private _matchState: MatchMap = {};
}

export class SearchState {
  public posFrom: number;
  public posTo: number;
  public lastQuery: string;
  public query: string;
}

namespace Private {
  interface ICodeMirrorMatch {
    from: CodeMirror.Position;
    to: CodeMirror.Position;
  }

  export function findNext(
    cm: CodeMirrorEditor,
    reverse: boolean,
    caseSensitive: boolean
  ): ICodeMirrorMatch {
    return cm.operation(() => {
      const state = getSearchState(cm);
      const position = reverse ? state.posFrom : state.posTo;
      console.log('search cursor query: ', state.query);
      const cursor: CodeMirror.SearchCursor = cm.getSearchCursor(
        state.query,
        position,
        !caseSensitive // replace with case sensitive flag (true = insensitive here)
      );
      if (!cursor.find(reverse)) {
        console.log('no match found, setting cursor position to: ', position);
        cm.setCursorPosition(position);
        return null;
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
        20
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

  export function searchOverlay(query: RegExp, matchState: MatchMap) {
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
        query.lastIndex = currentPos;
        const lineText = stream.string;
        const match = query.exec(lineText);
        const line = (stream as any).lineOracle.line;
        // If starting at position 0, the tokenization of this line has just started.
        // Blow away everything on this line in the state so it can be updated.
        if (
          stream.start === currentPos &&
          currentPos === 0 &&
          !!matchState[line] &&
          Object.keys(matchState[line]).length !== 0
        ) {
          matchState[line] = {};
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
          if (!matchState[line]) {
            matchState[line] = {};
          }
          matchState[line][currentPos] = matchObj;

          // move the stream along and return searching style for the token
          stream.pos += matchLength || 1;
          return 'searching';
        } else if (match) {
          // there's a match in the stream, advance the stream to its position
          stream.pos = match.index;
        } else {
          // no matches, consume the rest of the stream
          stream.skipToEnd();
        }
      }
    };
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
}
