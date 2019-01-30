// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
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
  async startSearch(
    query: RegExp,
    searchTarget: NotebookPanel
  ): Promise<ISearchMatch[]> {
    this._searchTarget = searchTarget;
    const cells = this._searchTarget.content.widgets;

    // Listen for cell model change to redo the search in case of
    // new/pasted/deleted cells
    const cellList = this._searchTarget.model.cells;
    cellList.changed.connect(
      this._restartSearch.bind(this, query, searchTarget),
      this
    );

    let indexTotal = 0;
    const allMatches: ISearchMatch[] = [];
    // For each cell, create a search provider and collect the matches

    for (let cell of cells) {
      const cmEditor = cell.editor as CodeMirrorEditor;
      const cmSearchProvider = new CodeMirrorSearchProvider();
      cmSearchProvider.shouldLoop = false;

      // If a rendered MarkdownCell contains a match, unrender it so that
      // CodeMirror can show the match(es).  If the MarkdownCell is not
      // rendered, putting CodeMirror on the page, CodeMirror will not run
      // the mode, which will prevent the search from occurring.
      // Keep track so that the cell can be rerendered when the search is ended
      // or if there are no matches
      let cellShouldReRender = false;
      if (cell instanceof MarkdownCell && cell.rendered) {
        cell.rendered = false;
        cellShouldReRender = true;
      }

      // Unhide hidden cells for the same reason as above
      if (cell.inputHidden) {
        cell.inputHidden = false;
      }
      // chain promises to ensure indexing is sequential
      const matchesFromCell = await cmSearchProvider.startSearch(
        query,
        cmEditor
      );
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

      allMatches.concat(matchesFromCell);

      this._cmSearchProviders.push({
        cell: cell,
        provider: cmSearchProvider
      });
    }

    this._currentMatch = await Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders
    );

    return allMatches;
  }

  async endSearch(): Promise<void> {
    Signal.disconnectBetween(this._searchTarget.model.cells, this);
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
    this._currentMatch = null;
  }

  async highlightNext(): Promise<ISearchMatch | undefined> {
    this._currentMatch = await Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders
    );
    return this._currentMatch;
  }

  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._currentMatch = await Private.stepNext(
      this._searchTarget.content,
      this._cmSearchProviders,
      true
    );
    return this._currentMatch;
  }

  static canSearchOn(domain: any): boolean {
    // check to see if the CMSearchProvider can search on the
    // first cell, false indicates another editor is present
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

  private async _restartSearch(query: RegExp, searchTarget: NotebookPanel) {
    await this.endSearch();
    await this.startSearch(query, searchTarget);
    this._changed.emit(undefined);
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

  export async function stepNext(
    notebook: Notebook,
    cmSearchProviders: ICellSearchPair[],
    reverse = false,
    steps = 0
  ): Promise<ISearchMatch | undefined> {
    const activeCell: Cell = notebook.activeCell;
    const cellIndex = notebook.widgets.indexOf(activeCell);
    const numCells = notebook.widgets.length;
    const { provider } = cmSearchProviders[cellIndex];

    // highlightNext/Previous will not be able to search rendered MarkdownCells or
    // hidden code cells, but that is okay here because in startSearch, we unrendered
    // all cells with matches and unhid all cells
    const match = reverse
      ? await provider.highlightPrevious()
      : await provider.highlightNext();
    // If there was no match in this cell, try the next cell
    if (!match) {
      // We have looped around the whole notebook and have searched the original
      // cell once more and found no matches.  Do not proceed with incrementing the
      // active cell index so that the active cell doesn't change
      if (steps === numCells) {
        return undefined;
      }
      notebook.activeCellIndex =
        ((reverse ? cellIndex - 1 : cellIndex + 1) + numCells) % numCells;
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
      return stepNext(notebook, cmSearchProviders, reverse, steps + 1);
    }

    return match;
  }
}
