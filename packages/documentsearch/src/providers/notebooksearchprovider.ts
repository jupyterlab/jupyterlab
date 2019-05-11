// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ISearchProvider, ISearchMatch } from '../index';
import { CodeMirrorSearchProvider } from './codemirrorsearchprovider';

import { NotebookPanel } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Cell, MarkdownCell } from '@jupyterlab/cells';

import { Signal, ISignal } from '@phosphor/signaling';

import CodeMirror from 'codemirror';

interface ICellSearchPair {
  cell: Cell;
  provider: CodeMirrorSearchProvider;
}

export class NotebookSearchProvider implements ISearchProvider {
  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(searchTarget: NotebookPanel): any {
    const activeCell = searchTarget.content.activeCell;
    const selection = (activeCell.editor as CodeMirrorEditor).doc.getSelection();
    // if there are newlines, just return empty string
    return selection.search(/\r?\n|\r/g) === -1 ? selection : '';
  }

  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(
    query: RegExp,
    searchTarget: NotebookPanel
  ): Promise<ISearchMatch[]> {
    this._searchTarget = searchTarget;
    const cells = this._searchTarget.content.widgets;

    this._query = query;
    // Listen for cell model change to redo the search in case of
    // new/pasted/deleted cells
    const cellList = this._searchTarget.model.cells;
    cellList.changed.connect(
      this._restartQuery.bind(this),
      this
    );

    let indexTotal = 0;
    const allMatches: ISearchMatch[] = [];
    // For each cell, create a search provider and collect the matches

    for (let cell of cells) {
      const cmEditor = cell.editor as CodeMirrorEditor;
      const cmSearchProvider = new CodeMirrorSearchProvider();
      cmSearchProvider.isSubProvider = true;

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
      const matchesFromCell = await cmSearchProvider.startQueryCodeMirror(
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

    this._currentMatch = await this._stepNext();

    return allMatches;
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  async endQuery(): Promise<void> {
    const queriesEnded: Promise<void>[] = [];
    this._cmSearchProviders.forEach(({ provider }) => {
      queriesEnded.push(provider.endQuery());
      provider.changed.disconnect(this._onCmSearchProviderChanged, this);
    });
    Signal.disconnectBetween(this._searchTarget.model.cells, this);

    this._cmSearchProviders = [];
    this._unRenderedMarkdownCells.forEach((cell: MarkdownCell) => {
      // Guard against the case where markdown cells have been deleted
      if (!cell.isDisposed) {
        cell.rendered = true;
      }
    });
    this._unRenderedMarkdownCells = [];
    await Promise.all(queriesEnded);
  }

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    Signal.disconnectBetween(this._searchTarget.model.cells, this);

    const index = this._searchTarget.content.activeCellIndex;
    const searchEnded: Promise<void>[] = [];
    this._cmSearchProviders.forEach(({ provider }) => {
      searchEnded.push(provider.endSearch());
      provider.changed.disconnect(this._onCmSearchProviderChanged, this);
    });

    this._cmSearchProviders = [];
    this._unRenderedMarkdownCells.forEach((cell: MarkdownCell) => {
      cell.rendered = true;
    });
    this._unRenderedMarkdownCells = [];

    this._searchTarget.content.activeCellIndex = index;
    this._searchTarget.content.mode = 'edit';
    this._searchTarget = null;
    this._currentMatch = null;
    await Promise.all(searchEnded);
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    this._currentMatch = await this._stepNext();
    return this._currentMatch;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._currentMatch = await this._stepNext(true);
    return this._currentMatch;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string): Promise<boolean> {
    const notebook = this._searchTarget.content;
    const editor = notebook.activeCell.editor as CodeMirrorEditor;
    let replaceOccurred = false;
    if (this._currentMatchIsSelected(editor)) {
      const cellIndex = notebook.widgets.indexOf(notebook.activeCell);
      const { provider } = this._cmSearchProviders[cellIndex];
      replaceOccurred = await provider.replaceCurrentMatch(newText);
      if (replaceOccurred) {
        this._currentMatch = provider.currentMatch;
        // If there was a replacement and there is another match, then the CodeMirrorSearchProvider
        // already highlighted the next match, so we can return early to avoid skipping a match.
        if (this._currentMatch) {
          return replaceOccurred;
        }
      }
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
    for (let index in this._cmSearchProviders) {
      const { provider } = this._cmSearchProviders[index];
      const singleReplaceOccurred = await provider.replaceAllMatches(newText);
      replaceOccurred = singleReplaceOccurred ? true : replaceOccurred;
    }
    this._currentMatch = null;
    return replaceOccurred;
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static canSearchOn(domain: any): boolean {
    // check to see if the CMSearchProvider can search on the
    // first cell, false indicates another editor is present
    return domain instanceof NotebookPanel;
  }

  /**
   * The same list of matches provided by the startQuery promise resoluton
   */
  get matches(): ISearchMatch[] {
    return [].concat(...this._getMatchesFromCells());
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
  get currentMatchIndex(): number {
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

  private async _stepNext(
    reverse = false,
    steps = 0
  ): Promise<ISearchMatch | undefined> {
    const notebook = this._searchTarget.content;
    const activeCell: Cell = notebook.activeCell;
    const cellIndex = notebook.widgets.indexOf(activeCell);
    const numCells = notebook.widgets.length;
    const { provider } = this._cmSearchProviders[cellIndex];

    // highlightNext/Previous will not be able to search rendered MarkdownCells or
    // hidden code cells, but that is okay here because in startQuery, we unrendered
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
      return this._stepNext(reverse, steps + 1);
    }

    return match;
  }

  private async _restartQuery() {
    await this.endQuery();
    await this.startQuery(this._query, this._searchTarget);
    this._changed.emit(undefined);
  }

  private _getMatchesFromCells(): ISearchMatch[][] {
    let indexTotal = 0;
    const result: ISearchMatch[][] = [];
    this._cmSearchProviders.forEach(({ provider }) => {
      const cellMatches = provider.matches;
      cellMatches.forEach(match => {
        match.index = match.index + indexTotal;
      });
      indexTotal += cellMatches.length;
      result.push(cellMatches);
    });
    return result;
  }

  private _onCmSearchProviderChanged() {
    this._changed.emit(undefined);
  }

  private _currentMatchIsSelected(cm: CodeMirrorEditor): boolean {
    if (!this._currentMatch) {
      return false;
    }
    const currentSelection = cm.getSelection();
    const currentSelectionLength =
      currentSelection.end.column - currentSelection.start.column;
    const selectionIsOneLine =
      currentSelection.start.line === currentSelection.end.line;
    return (
      this._currentMatch.line === currentSelection.start.line &&
      this._currentMatch.column === currentSelection.start.column &&
      this._currentMatch.text.length === currentSelectionLength &&
      selectionIsOneLine
    );
  }

  private _searchTarget: NotebookPanel;
  private _query: RegExp;
  private _cmSearchProviders: ICellSearchPair[] = [];
  private _currentMatch: ISearchMatch;
  private _unRenderedMarkdownCells: MarkdownCell[] = [];
  private _changed = new Signal<this, void>(this);
}
