import { ISearchProvider, ISearchMatch } from '../index';
import { CodeMirrorSearchProvider } from './codemirrorsearchprovider';

import { NotebookPanel, Notebook } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Cell, MarkdownCell } from '@jupyterlab/cells';

import { Signal, ISignal } from '@phosphor/signaling';

import CodeMirror from 'codemirror';

interface ICellSearchPair {
  cell: Cell;
  provider: ISearchProvider;
}

export class NotebookSearchProvider implements ISearchProvider {
  startSearch(
    query: RegExp,
    searchTarget: NotebookPanel
  ): Promise<ISearchMatch[]> {
    this._searchTarget = searchTarget;
    const cells = this._searchTarget.content.widgets;

    // Listen for cell model change to redo the search in case of
    // new/pasted/deleted cells
    const cellModel = this._searchTarget.model.cells;
    Signal.disconnectBetween(cellModel, this);
    cellModel.changed.connect(
      this._restartSearch.bind(this, query, searchTarget),
      this
    );

    const activeCell = this._searchTarget.content.activeCell;
    let indexTotal = 0;
    let matchPromise = Promise.resolve([]);
    const allMatches: ISearchMatch[] = [];
    // For each cell, create a search provider and collect the matches
    cells.forEach((cell: Cell) => {
      const cmEditor = cell.editor as CodeMirrorEditor;
      const cmSearchProvider = new CodeMirrorSearchProvider();
      cmSearchProvider.shouldLoop = false;

      // If a rendered MarkdownCell contains a match, unrender it so that
      // CodeMirror can show the match(es).  Keep track so that the cell
      // can be rerendered when the search is ended.
      let cellShouldReRender = false;
      if (cell instanceof MarkdownCell && cell.rendered) {
        cell.rendered = false;
        cellShouldReRender = true;
      }
      if (cell.inputHidden) {
        cell.inputHidden = false;
      }
      // chain promises to ensure indexing is sequential
      matchPromise = matchPromise.then(() =>
        cmSearchProvider
          .startSearch(query, cmEditor)
          .then((matchesFromCell: ISearchMatch[]) => {
            if (cell instanceof MarkdownCell) {
              if (matchesFromCell.length !== 0) {
                // un-render markdown cells with matches
                this._unRenderedMarkdownCells.push(cell);
              } else if (cellShouldReRender) {
                cell.rendered = true;
              }
            }

            // update the match indices to reflect the whole document index values
            matchesFromCell.forEach(match => {
              match.index = match.index + indexTotal;
            });
            indexTotal += matchesFromCell.length;

            // search has been initialized, connect the changed signal
            cmSearchProvider.changed.connect(
              this._onCmSearchProviderChanged,
              this
            );

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
            allMatches.concat(matchesFromCell);
          })
      );

      this._cmSearchProviders.push({
        cell: cell,
        provider: cmSearchProvider
      });
    });

    // Execute cell searches sequentially to ensure indexes are correct
    return matchPromise.then(() => allMatches);
  }

  endSearch(): Promise<void> {
    this._cmSearchProviders.forEach(({ provider }) => {
      provider.endSearch();
      provider.changed.disconnect(this._onCmSearchProviderChanged, this);
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

  static canSearchOn(domain: any): boolean {
    return domain instanceof NotebookPanel;
  }

  get matches(): ISearchMatch[] {
    return [].concat(...Private.getMatchesFromCells(this._cmSearchProviders));
  }

  get changed(): ISignal<this, void> {
    return this._changed;
  }

  get currentMatchIndex(): number {
    if (!this._currentMatch) {
      return 0;
    }
    return this._currentMatch.index;
  }

  private _restartSearch(query: RegExp, searchTarget: NotebookPanel) {
    this.endSearch();
    this.startSearch(query, searchTarget).then(() =>
      this._changed.emit(undefined)
    );
  }

  private _onCmSearchProviderChanged() {
    this._changed.emit(undefined);
  }

  private _searchTarget: NotebookPanel;
  private _cmSearchProviders: ICellSearchPair[] = [];
  private _currentMatch: ISearchMatch;
  private _unRenderedMarkdownCells: MarkdownCell[] = [];
  private _changed = new Signal<this, void>(this);
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
      // If there was no match in this cell, try the next cell
      if (!match) {
        let nextCellIndex = getNextCellIndex(
          notebook.widgets,
          cellIndex,
          reverse
        );
        notebook.activeCellIndex = nextCellIndex;
        const editor = notebook.activeCell.editor as CodeMirrorEditor;
        // move the cursor of the next cell to the start/end of the cell so it can
        // search the whole thing
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
