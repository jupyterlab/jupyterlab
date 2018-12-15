// import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchMatch } from '../index';

import {
  CodeMirrorSearchProvider,
  SearchState
} from './codemirrorsearchprovider';

import { NotebookPanel, Notebook } from '@jupyterlab/notebook';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Cell, MarkdownCell } from '@jupyterlab/cells';
import CodeMirror from 'codemirror';

interface ICellSearchPair {
  cell: Cell;
  provider: ISearchProvider;
}

// TODO: re-examine indexing of cells

export class NotebookSearchProvider implements ISearchProvider {
  startSearch(
    query: RegExp,
    searchTarget: NotebookPanel
  ): Promise<ISearchMatch[]> {
    this._searchTarget = searchTarget;
    console.log(
      'notebook provider: startSearch on query, target: ',
      query,
      ', ',
      this._searchTarget
    );
    const cells = this._searchTarget.content.widgets.filter(cell =>
      Private.isSearchableCell(cell)
    );
    console.log('widgets length: ', this._searchTarget.content.widgets.length);
    console.log('filtered cells length: ', cells.length);
    const activeCell = this._searchTarget.content.activeCell;
    const matchPromises: Promise<ISearchMatch[]>[] = [];
    let indexTotal = 0;
    // For each cell, create a search provider and collect the matches
    cells.forEach((cell: Cell) => {
      const cmEditor = cell.editor as CodeMirrorEditor;
      const cmSearchProvider = new CodeMirrorSearchProvider();
      matchPromises.push(
        cmSearchProvider
          .startSearch(query, cmEditor)
          .then((matchesFromCell: ISearchMatch[]) => {
            // update the match indices to reflec the whole document index values
            matchesFromCell.forEach(match => {
              match.index = match.index + indexTotal;
            });
            indexTotal += matchesFromCell.length;

            // In the active cell, select the next match after the cursor
            if (activeCell === cell) {
              return cmSearchProvider
                .highlightNext()
                .then((match: ISearchMatch) => {
                  this._currentMatch = match;
                  return matchesFromCell;
                });
            }

            indexTotal += matchesFromCell.length;
            return matchesFromCell;
          })
      );

      this._cmSearchProviders.push({
        cell: cell,
        provider: cmSearchProvider
      });
    });

    // Flatten matches into one array
    return Promise.all(matchPromises).then(matchesFromCells => {
      let result: ISearchMatch[] = [];
      matchesFromCells.forEach((cellMatches: ISearchMatch[]) => {
        result.concat(cellMatches);
      });
      return result;
    });
  }

  endSearch(): Promise<void> {
    console.log('notebook provider: endSearch');
    this._cmSearchProviders.forEach(({ provider }) => {
      provider.endSearch();
    });
    this._cmSearchProviders = [];
    this._searchTarget = null;
    return Promise.resolve();
  }

  highlightNext(): Promise<ISearchMatch> {
    console.log('nbsp highlightNext');
    const steps = 0;
    return Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders,
      steps,
      false
    ).then((match: ISearchMatch) => {
      this._currentMatch = match;
      return match;
    });
  }

  highlightPrevious(): Promise<ISearchMatch> {
    console.log('nbsp highlightPrevious');
    const steps = 0;
    return Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders,
      steps,
      true
    ).then((match: ISearchMatch) => {
      this._currentMatch = match;
      return match;
    });
  }

  canSearchOn(domain: any): boolean {
    console.log('notebook provider: canSearchOn');
    return true;
  }

  get matches(): ISearchMatch[] {
    return [].concat(...Private.getMatchesFromCells(this._cmSearchProviders));
  }

  get currentMatchIndex(): number {
    if (!this._currentMatch) {
      return 0;
    }
    return this._currentMatch.index;
  }

  private _searchTarget: NotebookPanel;
  private _cmSearchProviders: ICellSearchPair[] = [];
  // private _highlightedIndex: number = 0;
  private _currentMatch: ISearchMatch;
}

namespace Private {
  export function getMatchesFromCells(
    cmSearchProviders: ICellSearchPair[]
  ): ISearchMatch[][] {
    let indexTotal = 0;
    const result: ISearchMatch[][] = [];
    cmSearchProviders.forEach(({ provider }) => {
      const cellMatches = provider.matches;
      cellMatches.forEach(match => {
        match.index = match.index + indexTotal;
      });
      indexTotal += cellMatches.length;
      result.push(cellMatches);
    });
    return result;
  }

  export function stepNext(
    notebook: Notebook,
    cmSearchProviders: ICellSearchPair[],
    steps: number,
    reverse: boolean
  ): Promise<ISearchMatch> {
    const activeCell: Cell = notebook.activeCell;
    const cellIndex = notebook.widgets.indexOf(activeCell);
    const numCells = notebook.widgets.length;
    if (steps === numCells) {
      // searched all cells, found no matches
      return null;
    }
    const { provider }: { provider: ISearchProvider } = cmSearchProviders[
      cellIndex
    ];
    const nextPromise: Promise<ISearchMatch> = reverse
      ? provider.highlightPrevious()
      : provider.highlightNext();
    return nextPromise.then((match: ISearchMatch) => {
      if (!match) {
        console.log('no more matches in cell, check next cell');
        let nextCellIndex = getNextCellIndex(
          notebook.widgets,
          cellIndex,
          reverse
        );
        notebook.activeCellIndex = nextCellIndex;
        const editor = notebook.activeCell.editor as CodeMirrorEditor;
        // move the cursor of the next cell to the start/end of the cell so it can search
        const state: any = getSearchState(editor);
        if (reverse) {
          state.posFrom = CodeMirror.Pos(editor.lastLine());
        } else {
          state.posTo = CodeMirror.Pos(editor.firstLine(), 0);
        }
        return stepNext(notebook, cmSearchProviders, steps + 1, reverse);
      }
      const allMatches = Private.getMatchesFromCells(cmSearchProviders);
      match.index = allMatches[cellIndex].find(
        (matchTest: ISearchMatch) => match.column === matchTest.column
      ).index;
      return match;
    });
  }

  function getNextCellIndex(
    cells: ReadonlyArray<Cell>,
    currentIndex: number,
    reverse: boolean
  ): number {
    let nextCellIndex = currentIndex;
    const numCells = cells.length;
    let invalidCell = true;
    do {
      console.log('curr index: ', nextCellIndex);
      nextCellIndex = reverse ? nextCellIndex - 1 : nextCellIndex + 1;
      if (nextCellIndex < 0) {
        nextCellIndex = numCells - 1;
      }
      if (nextCellIndex > numCells - 1) {
        nextCellIndex = 0;
      }
      console.log('nextCellIndex: ', nextCellIndex);
      const nextCell = cells[nextCellIndex];
      console.log('instanceof: ', nextCell instanceof MarkdownCell);
      console.log(
        'instanceof and rendered: ',
        nextCell instanceof MarkdownCell && (nextCell as MarkdownCell).rendered
      );
      console.log('inputhidden: ', nextCell.inputHidden);
      invalidCell = isSearchableCell(nextCell);
      console.log('invalid? ', invalidCell);
    } while (invalidCell);
    return nextCellIndex;
  }

  export function isSearchableCell(cell: Cell) {
    return !(
      (cell instanceof MarkdownCell && (cell as MarkdownCell).rendered) ||
      cell.inputHidden
    );
  }

  function getSearchState(cm: CodeMirrorEditor) {
    if (!cm.state.search) {
      cm.state.search = new SearchState();
    }
    return cm.state.search;
  }
}
