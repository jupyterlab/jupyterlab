// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ISearchProvider, ISearchMatch } from '../index';
import { CodeMirrorSearchProvider } from './codemirrorsearchprovider';
import { GenericSearchProvider } from './genericsearchprovider';

import { Cell, MarkdownCell, CodeCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { NotebookPanel } from '@jupyterlab/notebook';

import { ArrayExt } from '@lumino/algorithm';
import { Signal, ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import CodeMirror from 'codemirror';

interface ICellSearchPair {
  cell: Cell;
  provider: CodeMirrorSearchProvider | GenericSearchProvider;
}

export interface INotebookFilters {
  /**
   * Should cell output be searched?
   */
  output: boolean;
}

export class NotebookSearchProvider implements ISearchProvider<NotebookPanel> {
  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(searchTarget: NotebookPanel): unknown {
    const activeCell = searchTarget.content.activeCell;
    const selection = (activeCell?.editor as
      | CodeMirrorEditor
      | undefined)?.doc.getSelection();
    // if there are newlines, just return empty string
    return selection?.search(/\r?\n|\r/g) === -1 ? selection : '';
  }

  /**
   * Initialize the search using the provided options. Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   * @param filters Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(
    query: RegExp,
    searchTarget: NotebookPanel,
    filters: INotebookFilters | undefined
  ): Promise<ISearchMatch[]> {
    this._searchTarget = searchTarget;
    const cells = this._searchTarget.content.widgets;

    this._filters =
      !filters || Object.entries(filters).length === 0
        ? { output: true }
        : filters;

    // hide the current notebook widget to prevent expensive layout re-calculation operations
    this._searchTarget.hide();

    let indexTotal = 0;
    const allMatches: ISearchMatch[] = [];
    // For each cell, create a search provider and collect the matches

    for (const cell of cells) {
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
          // was rendered previously, no need to refresh
          cell.rendered = true;
        }
      }
      if (matchesFromCell.length !== 0) {
        cmSearchProvider.refreshOverlay();
        this._cellsWithMatches.push(cell);
      }

      // update the match indices to reflect the whole document index values
      matchesFromCell.forEach(match => {
        match.index = match.index + indexTotal;
      });
      indexTotal += matchesFromCell.length;

      // search has been initialized, connect the changed signal
      cmSearchProvider.changed.connect(this._onSearchProviderChanged, this);

      allMatches.concat(matchesFromCell);

      this._searchProviders.push({
        cell: cell,
        provider: cmSearchProvider
      });

      if (cell instanceof CodeCell && this._filters.output) {
        const outputProivder = new GenericSearchProvider();
        outputProivder.isSubProvider = true;
        const matchesFromOutput = await outputProivder.startQuery(
          query,
          cell.outputArea
        );
        matchesFromOutput.map(match => {
          match.index = match.index + indexTotal;
        });
        indexTotal += matchesFromOutput.length;

        allMatches.concat(matchesFromOutput);

        outputProivder.changed.connect(this._onSearchProviderChanged, this);

        this._searchProviders.push({
          cell: cell,
          provider: outputProivder
        });
      }
    }

    // show the widget again, recalculation of layout will matter again
    // and so that the next step will scroll correctly to the first match
    this._searchTarget.show();

    this._currentMatch = await this._stepNext(
      this._updatedCurrentProvider(false)!
    );
    this._refreshCurrentCellEditor();

    this._refreshCellsEditorsInBackground(this._cellsWithMatches);

    return allMatches;
  }

  /**
   * Gradually refresh cells in the background so that the user will not
   * experience frozen interface, `n` cells at a time.
   */
  private _refreshCellsEditorsInBackground(cells: Cell[], n: number = 5) {
    let i = 0;

    const refreshNextNCells = () => {
      for (let stop = i + n; i < stop && i < cells.length; i++) {
        cells[i].editor.refresh();
      }
      if (i < cells.length) {
        window.setTimeout(refreshNextNCells, 0);
      }
    };
    window.setTimeout(refreshNextNCells, 0);
  }

  /**
   * Refresh the editor in the cell for the current match.
   */
  private _refreshCurrentCellEditor() {
    const notebook = this._searchTarget!.content;
    notebook.activeCell!.editor.refresh();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  async endQuery(): Promise<void> {
    this._searchTarget!.hide();

    const queriesEnded: Promise<void>[] = [];
    this._searchProviders.forEach(({ provider }) => {
      queriesEnded.push(provider.endQuery());
      provider.changed.disconnect(this._onSearchProviderChanged, this);
    });
    Signal.disconnectBetween(this._searchTarget!.model!.cells, this);

    this._searchProviders = [];
    this._currentProvider = null;
    this._unRenderedMarkdownCells.forEach((cell: MarkdownCell) => {
      // Guard against the case where markdown cells have been deleted
      if (!cell.isDisposed) {
        cell.rendered = true;
      }
    });
    this._unRenderedMarkdownCells = [];
    await Promise.all(queriesEnded);
    this._searchTarget!.show();

    this._refreshCurrentCellEditor();
    // re-render all non-markdown cells with matches (which were rendered, thus do not need refreshing)
    this._refreshCellsEditorsInBackground(
      this._cellsWithMatches.filter(
        (cell: Cell) => !(cell instanceof MarkdownCell)
      )
    );
    this._cellsWithMatches = [];
  }

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    this._searchTarget!.hide();
    Signal.disconnectBetween(this._searchTarget!.model!.cells, this);

    const index = this._searchTarget!.content.activeCellIndex;
    const searchEnded: Promise<void>[] = [];
    this._searchProviders.forEach(({ provider }) => {
      searchEnded.push(provider.endSearch());
      provider.changed.disconnect(this._onSearchProviderChanged, this);
    });

    this._searchProviders = [];
    this._currentProvider = null;
    this._unRenderedMarkdownCells.forEach((cell: MarkdownCell) => {
      cell.rendered = true;
    });
    this._unRenderedMarkdownCells = [];

    this._searchTarget!.content.activeCellIndex = index;
    this._searchTarget!.content.mode = 'edit';
    this._currentMatch = null;
    await Promise.all(searchEnded);
    this._searchTarget!.show();
    this._refreshCurrentCellEditor();
    this._searchTarget = null;

    // re-render all non-markdown cells with matches (which were rendered, thus do not need refreshing)
    this._refreshCellsEditorsInBackground(
      this._cellsWithMatches.filter(
        (cell: Cell) => !(cell instanceof MarkdownCell)
      )
    );
    this._cellsWithMatches = [];
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(): Promise<ISearchMatch | undefined> {
    this._currentMatch = await this._stepNext(
      this._updatedCurrentProvider(false)!
    );
    return this._currentMatch;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._currentMatch = await this._stepNext(
      this._updatedCurrentProvider(true)!,
      true
    );
    return this._currentMatch;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string): Promise<boolean> {
    const notebook = this._searchTarget!.content;
    const editor = notebook.activeCell!.editor as CodeMirrorEditor;
    let replaceOccurred = false;
    if (this._currentMatchIsSelected(editor)) {
      const { provider } = this._currentProvider!;
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
    for (const index in this._searchProviders) {
      const { provider } = this._searchProviders[index];
      const singleReplaceOccurred = await provider.replaceAllMatches(newText);
      replaceOccurred = singleReplaceOccurred ? true : replaceOccurred;
    }
    this._currentMatch = null;
    return replaceOccurred;
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static canSearchOn(domain: Widget): domain is NotebookPanel {
    // check to see if the CMSearchProvider can search on the
    // first cell, false indicates another editor is present
    return domain instanceof NotebookPanel;
  }

  /**
   * The same list of matches provided by the startQuery promise resolution
   */
  get matches(): ISearchMatch[] {
    return ([] as ISearchMatch[]).concat(...this._getMatchesFromCells());
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
  get currentMatchIndex(): number | null {
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

  readonly hasOutputs = true;

  private _updatedCurrentProvider(reverse: boolean) {
    if (
      this._currentProvider &&
      this._currentProvider.cell === this._searchTarget!.content.activeCell
    ) {
      return this._currentProvider;
    }
    let provider;
    if (!this._currentProvider) {
      const find = reverse ? ArrayExt.findLastValue : ArrayExt.findFirstValue;
      provider = find(
        this._searchProviders,
        provider => this._searchTarget!.content.activeCell === provider.cell
      );
    } else {
      const currentProviderIndex = ArrayExt.firstIndexOf(
        this._searchProviders,
        this._currentProvider
      );
      const nextProviderIndex =
        ((reverse ? currentProviderIndex - 1 : currentProviderIndex + 1) +
          this._searchProviders.length) %
        this._searchProviders.length;
      provider = this._searchProviders[nextProviderIndex];
    }
    this._currentProvider = provider;
    return provider;
  }

  private async _stepNext(
    currentSearchPair: ICellSearchPair,
    reverse = false,
    steps = 0
  ): Promise<ISearchMatch | undefined> {
    const { provider } = currentSearchPair;

    // highlightNext/Previous will not be able to search rendered MarkdownCells or
    // hidden code cells, but that is okay here because in startQuery, we unrendered
    // all cells with matches and unhide all cells
    const match = reverse
      ? await provider.highlightPrevious()
      : await provider.highlightNext();
    // If there was no match in this cell, try the next cell
    if (!match) {
      const providerIndex = this._searchProviders.indexOf(currentSearchPair);
      const numProviders = this._searchProviders.length;
      // We have looped around the whole notebook and have searched the original
      // cell once more and found no matches.  Do not proceed with incrementing the
      // active cell index so that the active cell doesn't change
      if (steps === numProviders) {
        return undefined;
      }
      const nextIndex =
        ((reverse ? providerIndex - 1 : providerIndex + 1) + numProviders) %
        numProviders;
      const nextSearchPair = this._searchProviders[nextIndex];
      if (nextSearchPair.provider instanceof CodeMirrorSearchProvider) {
        const editor = nextSearchPair.provider.editor;
        // move the cursor of the next cell to the start/end of the cell so it can
        // search the whole thing (but don't scroll because we haven't found anything yet)
        const newPosCM = reverse
          ? CodeMirror.Pos(editor.lastLine())
          : CodeMirror.Pos(editor.firstLine(), 0);
        const newPos = {
          line: newPosCM.line,
          column: newPosCM.ch
        };
        editor.setCursorPosition(newPos, { scroll: false });
      }
      this._currentProvider = nextSearchPair;
      return this._stepNext(nextSearchPair, reverse, steps + 1);
    }

    const notebook = this._searchTarget!.content;
    notebook.activeCellIndex = notebook.widgets.indexOf(currentSearchPair.cell);
    return match;
  }

  private _getMatchesFromCells(): ISearchMatch[][] {
    let indexTotal = 0;
    const result: ISearchMatch[][] = [];
    this._searchProviders.forEach(({ provider }) => {
      const cellMatches = provider.matches;
      cellMatches.forEach(match => {
        match.index = match.index + indexTotal;
      });
      indexTotal += cellMatches.length;
      result.push(cellMatches);
    });
    return result;
  }

  private _onSearchProviderChanged() {
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

  private _searchTarget: NotebookPanel | undefined | null;
  private _filters: INotebookFilters;
  private _searchProviders: ICellSearchPair[] = [];
  private _currentProvider: ICellSearchPair | null | undefined;
  private _currentMatch: ISearchMatch | undefined | null;
  private _unRenderedMarkdownCells: MarkdownCell[] = [];
  private _cellsWithMatches: Cell[] = [];
  private _changed = new Signal<this, void>(this);
}
