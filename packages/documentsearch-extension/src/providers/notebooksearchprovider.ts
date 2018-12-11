// import * as CodeMirror from 'codemirror';

import { ISearchProvider, ISearchOptions, ISearchMatch } from '../index';

import { CodeMirrorSearchProvider } from './codemirrorsearchprovider';

import { NotebookPanel } from '@jupyterlab/notebook';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Cell } from '@jupyterlab/cells';

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
    console.log('notebook provider: highlightNext');
    const activeCell: Cell = this._searchTarget.content.activeCell;
    const cellIndex = this._searchTarget.content.widgets.indexOf(activeCell);
    const { provider }: { provider: ISearchProvider } = this._cmSearchProviders[
      cellIndex
    ];
    return provider.highlightNext().then((match: ISearchMatch) => {
      const allMatches = Private.getMatchesFromCells(this._cmSearchProviders);
      console.log('new match before index set: ', match);
      match.index = allMatches[cellIndex].find(
        (matchTest: ISearchMatch) => match.column === matchTest.column
      ).index;
      console.log('matches in same line: ', allMatches[cellIndex]);
      console.log('new match after index set: ', match);
      return match;
    });
  }

  highlightPrevious(): Promise<ISearchMatch> {
    console.log('notebook provider: highlightPrevious');
    return Promise.resolve({
      text: '',
      line: 0,
      column: 0,
      fragment: '',
      index: 0
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
}
