// import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchMatch } from '../index';

import { CodeMirrorSearchProvider } from './codemirrorsearchprovider';

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
    const cells = this._searchTarget.content.widgets;
    const activeCell = this._searchTarget.content.activeCell;
    const matchPromises: Promise<ISearchMatch[]>[] = [];
    let indexTotal = 0;
    // For each cell, create a search provider and collect the matches
    cells.forEach((cell: Cell) => {
      const cmEditor = cell.editor as CodeMirrorEditor;
      const cmSearchProvider = new CodeMirrorSearchProvider();
      cmSearchProvider.shouldLoop = false;
      let reRenderPlease = false;
      if (cell instanceof MarkdownCell && cell.rendered) {
        cell.rendered = false;
        reRenderPlease = true;
      }
      if (cell.inputHidden) {
        cell.inputHidden = false;
      }
      matchPromises.push(
        cmSearchProvider
          .startSearch(query, cmEditor)
          .then((matchesFromCell: ISearchMatch[]) => {
            // update the match indices to reflect the whole document index values
            if (cell instanceof MarkdownCell) {
              if (matchesFromCell.length !== 0) {
                // un-render markdown cells with matches
                this._unRenderedMarkdownCells.push(cell);
              } else if (reRenderPlease) {
                cell.rendered = true;
              }
            }
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
    this._cmSearchProviders.forEach(({ provider }) => {
      provider.endSearch();
    });
    this._cmSearchProviders = [];
    this._unRenderedMarkdownCells.forEach((cell: MarkdownCell) => {
      cell.rendered = true;
    });
    this._unRenderedMarkdownCells = [];
    this._searchTarget = null;
    return Promise.resolve();
  }

  highlightNext(): Promise<ISearchMatch> {
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
    return domain instanceof NotebookPanel;
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
  private _currentMatch: ISearchMatch;
  private _unRenderedMarkdownCells: MarkdownCell[] = [];
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
        let nextCellIndex = getNextCellIndex(
          notebook.widgets,
          cellIndex,
          reverse
        );
        notebook.activeCellIndex = nextCellIndex;
        const editor = notebook.activeCell.editor as CodeMirrorEditor;
        // move the cursor of the next cell to the start/end of the cell so it can search
        const newPosCM = reverse
          ? CodeMirror.Pos(editor.lastLine())
          : CodeMirror.Pos(editor.firstLine(), 0);
        const newPos = {
          line: newPosCM.line,
          column: newPosCM.ch
        };
        editor.setCursorPosition(newPos);
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
    nextCellIndex = reverse ? nextCellIndex - 1 : nextCellIndex + 1;
    if (nextCellIndex < 0) {
      nextCellIndex = numCells - 1;
    }
    if (nextCellIndex > numCells - 1) {
      nextCellIndex = 0;
    }
    return nextCellIndex;
  }
}
