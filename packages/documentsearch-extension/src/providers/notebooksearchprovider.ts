// import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchOptions, ISearchMatch } from '../index';

import { CodeMirrorSearchProvider } from './codemirrorsearchprovider';

import { NotebookPanel, Notebook } from '@jupyterlab/notebook';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Cell } from '@jupyterlab/cells';
import CodeMirror from 'codemirror';

interface ICellSearchPair {
  cell: Cell;
  provider: ISearchProvider;
}

export class NotebookSearchProvider implements ISearchProvider {
  startSearch(
    options: ISearchOptions,
    searchTarget: NotebookPanel
  ): Promise<ISearchMatch[]> {
    this._searchTarget = searchTarget;
    console.log(
      'notebook provider: startSearch on options, target: ',
      options,
      ', ',
      this._searchTarget
    );
    const cells = this._searchTarget.content.widgets;
    const activeCell = this._searchTarget.content.activeCell;
    const matchPromises: Promise<ISearchMatch[]>[] = [];
    let indexTotal = 0;
    cells.forEach((cell: Cell) => {
      const cmEditor = cell.editor as CodeMirrorEditor;
      const cmSearchProvider = new CodeMirrorSearchProvider();
      matchPromises.push(
        cmSearchProvider
          .startSearch(options, cmEditor)
          .then((matchesFromCell: ISearchMatch[]) => {
            matchesFromCell.forEach(match => {
              match.index = match.index + indexTotal;
            });

            if (activeCell === cell) {
              cmSearchProvider
                .highlightNext()
                .then((selectedMatch: ISearchMatch) => {
                  // this._highlightedIndex = selectedMatch.index + indexTotal;
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
    return Promise.all(matchPromises).then(matchesFromCells => {
      // this._matchesFromCells = matchesFromCells;
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
    return Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders,
      false
    );
    // const activeCell: Cell = this._searchTarget.content.activeCell;
    // const cellIndex = this._searchTarget.content.widgets.indexOf(activeCell);
    // const numCells = this._searchTarget.content.widgets.length;
    // console.log(
    //   'notebook provider: highlightNext, cellIndex: ',
    //   cellIndex,
    //   ' numCells: ',
    //   numCells
    // );
    // const { provider }: { provider: ISearchProvider } = this._cmSearchProviders[
    //   cellIndex
    // ];

    // return provider.highlightNext().then((match: ISearchMatch) => {
    //   console.log('new match before index set: ', match);
    //   if (!match) {
    //     console.log('no more matches in cell, check next cell');
    //     this._searchTarget.content.activeCellIndex = (cellIndex + 1) % numCells;
    //     const editor = this._searchTarget.content.activeCell
    //       .editor as CodeMirrorEditor;
    //     editor.setCursorPosition({ line: 0, column: 0 });
    //     return this.highlightNext();
    //   }
    //   const allMatches = Private.getMatchesFromCells(this._cmSearchProviders);
    //   match.index = allMatches[cellIndex].find(
    //     (matchTest: ISearchMatch) => match.column === matchTest.column
    //   ).index;
    //   console.log('matches in same cell: ', allMatches[cellIndex]);
    //   console.log('new match after index set: ', match);
    //   return match;
    // });
  }

  highlightPrevious(): Promise<ISearchMatch> {
    return Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders,
      true
    );
  }

  canSearchOn(domain: any): boolean {
    console.log('notebook provider: canSearchOn');
    return true;
  }

  get matches(): ISearchMatch[] {
    return [].concat(...Private.getMatchesFromCells(this._cmSearchProviders));
  }

  get currentMatchIndex(): number {
    console.log('notebook provider: currentMatchIndex');
    return 0;
  }

  private _searchTarget: NotebookPanel;
  private _cmSearchProviders: ICellSearchPair[] = [];
  // private _matchesFromCells: ISearchMatch[][];
  // private _highlightedIndex: number = 0;
  // private _currentMatch: ISearchMatch;
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
    reverse: boolean
  ): Promise<ISearchMatch> {
    const activeCell: Cell = notebook.activeCell;
    const cellIndex = notebook.widgets.indexOf(activeCell);
    const numCells = notebook.widgets.length;
    console.log(
      'notebook provider: highlightNext, cellIndex: ',
      cellIndex,
      ' numCells: ',
      numCells
    );
    const { provider }: { provider: ISearchProvider } = cmSearchProviders[
      cellIndex
    ];
    const nextPromise: Promise<ISearchMatch> = reverse
      ? provider.highlightPrevious()
      : provider.highlightNext();
    return nextPromise.then((match: ISearchMatch) => {
      if (!match) {
        console.log('no more matches in cell, check next cell');
        let nextCellIndex;
        if (reverse) {
          nextCellIndex = cellIndex - 1;
          if (nextCellIndex < 0) {
            nextCellIndex = numCells - 1;
          }
        } else {
          nextCellIndex = (cellIndex + 1) % numCells;
        }
        notebook.activeCellIndex = nextCellIndex;
        const editor = notebook.activeCell.editor as CodeMirrorEditor;
        // move the cursor of the next cell to the start/end of the cell so it can search
        if (reverse) {
          editor.state.search.posFrom = CodeMirror.Pos(editor.lastLine());
        } else {
          editor.state.search.posTo = CodeMirror.Pos(editor.firstLine(), 0);
        }
        return stepNext(notebook, cmSearchProviders, reverse);
      }
      const allMatches = Private.getMatchesFromCells(cmSearchProviders);
      match.index = allMatches[cellIndex].find(
        (matchTest: ISearchMatch) => match.column === matchTest.column
      ).index;
      return match;
    });
  }
}
