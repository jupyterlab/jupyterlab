import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchOptions, ISearchMatch } from '../index';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';

type MatchMap = { [key: number]: { [key: number]: ISearchMatch } };

export class CodeMirrorSearchProvider implements ISearchProvider {
  startSearch(
    options: ISearchOptions,
    searchTarget: CodeMirrorEditor
  ): Promise<ISearchMatch[]> {
    this._cm = searchTarget;
    console.log(
      'CodeMirror provider: startSearch on options, target: ',
      options,
      ', ',
      this._cm
    );
    Private.clearSearch(this._cm);

    const state = Private.getSearchState(this._cm);
    this._cm.operation(() => {
      state.queryText = options.query;
      state.query = Private.parseQuery(options.query);
      // clear search first?
      this._cm.removeOverlay(state.overlay);
      state.overlay = Private.searchOverlay(
        state.query,
        Private.queryCaseInsensitive(state.query),
        this._matchState
      );
      this._cm.addOverlay(state.overlay);
      // skips show matches on scroll bar here
      // state.posFrom = state.posTo = this._cm.getCursor();
      // Private.findNext(this._cm, false);
    });
    console.log('matchState: ', this._matchState);
    const matches = Private.parseMatchesFromState(this._matchState);
    console.log('matches: ', matches);
    return Promise.resolve(matches);
  }

  endSearch(): Promise<void> {
    Private.clearSearch(this._cm);
    return Promise.resolve();
  }

  highlightNext(): Promise<ISearchMatch> {
    console.log('codemirror search provider: highlightNext');
    console.log('cursor position: ', this._cm.getCursorPosition());
    const cursorMatch = Private.findNext(this._cm, false);
    if (!cursorMatch) {
      return Promise.resolve(null);
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    console.log('next match: ', match);
    return Promise.resolve(match);
  }

  highlightPrevious(): Promise<ISearchMatch> {
    console.log('codemirror search provider: highlightPrevious');
    const cursorMatch = Private.findNext(this._cm, true);
    if (!cursorMatch) {
      return Promise.resolve(null);
    }
    const match = this._matchState[cursorMatch.from.line][cursorMatch.from.ch];
    console.log('next match: ', match);
    return Promise.resolve(match);
  }

  canSearchOn(domain: any): boolean {
    console.log('codemirror search provider: canSearchOn');
    return false;
  }

  get matches(): ISearchMatch[] {
    console.log('codemirror search provider: matches');
    return Private.parseMatchesFromState(this._matchState);
  }

  get currentMatchIndex(): number {
    console.log('codemirror search provider: currentMatchIndex');
    return this._matchIndex;
  }

  clearSelection(): void {
    return null;
  }

  private _cm: CodeMirrorEditor;
  private _matchIndex: number;
  private _matchState: MatchMap = {};
}

class SearchState {
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
    reverse: boolean
  ): ICodeMirrorMatch {
    return cm.operation(() => {
      const state = getSearchState(cm);
      const position = reverse ? state.posFrom : state.posTo;
      const cursor: CodeMirror.SearchCursor = cm.getSearchCursor(
        state.query,
        position
      );
      console.log('filter: creating cursor from position: ', position);
      if (!cursor.find(reverse)) {
        console.log('------ nothing found');
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

  export function searchOverlay(
    queryIn: string | RegExp,
    caseInsensitive: boolean,
    matchState: MatchMap
  ) {
    let query: RegExp;
    if (typeof queryIn === 'string') {
      query = new RegExp(
        (queryIn as string).replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'),
        caseInsensitive ? 'gi' : 'g'
      );
    } else {
      let queryInReg: RegExp = queryIn as RegExp;
      if (!queryInReg.global) {
        query = new RegExp(
          queryInReg.source,
          queryInReg.ignoreCase ? 'gi' : 'g'
        );
      }
      query = queryInReg;
    }

    return {
      token: (stream: CodeMirror.StringStream) => {
        // console.log('stream: ', stream);
        const currentPos = stream.pos;
        query.lastIndex = currentPos;
        const lineText = stream.string;
        const match = query.exec(lineText);
        const line = (stream as any).lineOracle.line;
        // if starting at position 0, blow away everything on this line in the state
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

  export function parseString(str: string) {
    return str.replace(/\\(.)/g, (_, ch) => {
      if (ch === 'n') {
        return '\n';
      }
      if (ch === 'r') {
        return '\r';
      }
      return ch;
    });
  }

  export function parseQuery(query: string | RegExp) {
    const isRE = (query as string).match(/^\/(.*)\/([a-z]*)$/);
    let ret: string | RegExp;
    if (isRE) {
      try {
        ret = new RegExp(isRE[1], isRE[2].indexOf('i') === -1 ? '' : 'i');
        // tslint:disable-next-line:no-empty
      } catch (e) {} // Not a regular expression after all, do a string search
    } else {
      ret = parseString(query as string);
    }
    if (typeof query === 'string' ? query === '' : query.test('')) {
      ret = /x^/;
    }
    return ret;
  }

  export function queryCaseInsensitive(query: string | RegExp) {
    return typeof query === 'string' && query === query.toLowerCase();
  }

  export function parseMatchesFromState(state: MatchMap): ISearchMatch[] {
    let index = 0;
    const matches: ISearchMatch[] = Object.keys(state).reduce(
      (acc: ISearchMatch[], lineNumber: string) => {
        const lineKey: number = parseInt(lineNumber, 10); // ugh
        const lineMatches: { [key: number]: ISearchMatch } = state[lineKey];
        Object.keys(lineMatches).forEach((pos: string) => {
          const posKey: number = parseInt(pos, 10);
          const match: ISearchMatch = lineMatches[posKey];
          match.index = index;
          index += 1;
          acc.push(match);
        });
        return acc;
      },
      []
    );
    return matches;
  }
}
