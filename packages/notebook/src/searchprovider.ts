// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CellSearchProvider, ICellModel } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  IFilter,
  IFiltersType,
  ISearchMatch,
  ISearchProviderRegistry,
  ITextSearchMatch,
  SearchProvider
} from '@jupyterlab/documentsearch';
import {
  IObservableList,
  IObservableUndoableList
} from '@jupyterlab/observables';
import { ITranslator } from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import CodeMirror from 'codemirror';
import { NotebookPanel } from './panel';

interface ICellSearchPair {
  cell: Cell;
  searchEngine: CellSearchProvider;
}

export class NotebookSearchProvider extends SearchProvider<NotebookPanel> {
  constructor(
    protected translator: ITranslator,
    protected registry: ISearchProviderRegistry
  ) {
    super();
  }

  /**
   * Get the filters for the given provider.
   *
   * @returns The filters.
   */
  getFilters(): { [key: string]: IFilter } {
    const trans = this.translator.load('jupyterlab');

    return {
      output: {
        title: trans.__('Search Cell Outputs'),
        description: trans.__('Search in the cell outputs.'),
        default: true,
        supportReplace: false
      },
      selectedCells: {
        title: trans.__('Search Selected Cell(s)'),
        description: trans.__('Search only in the selected cell(s).'),
        default: false,
        supportReplace: true
      }
    };
  }

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(searchTarget: NotebookPanel): string {
    const activeCell = searchTarget.content.activeCell;
    const selection = (activeCell?.editor as
      | CodeMirrorEditor
      | undefined)?.doc.getSelection();
    // if there are newlines, just return empty string
    return selection?.search(/\r?\n|\r/g) === -1 ? selection : '';
  }

  startSearch(searchTarget: NotebookPanel): void {
    super.startSearch(searchTarget);
    this.widget!.model!.cells.changed.connect(this._onCellsChanged, this);
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
    filters: IFiltersType | undefined
  ): Promise<void> {
    if (!this.widget) {
      return;
    }
    let cells = this.widget.content.widgets;

    const finalFilters = {
      output: true,
      selectedCells: false,
      ...(filters ?? {})
    };

    if (finalFilters.selectedCells) {
      const selection = cells.filter(cell =>
        this.widget!.content.isSelectedOrActive(cell)
      );
      cells = selection.length > 0 ? selection : cells;

      // Trigger update if the active cell changes
      this.widget.content.activeCellChanged.connect(
        this._onSearchProviderChanged,
        this
      );
    }

    // For each cell, create a search provider
    this._searchProviders = await Promise.all(
      cells.map(async cell => {
        const cellSearchProvider = new CellSearchProvider(
          cell.model,
          this.widget!.content.rendermime,
          this.registry
        );

        await cellSearchProvider.startQuery(query, filters);

        return { cell, searchEngine: cellSearchProvider };
      })
    );

    this._currentProviderIndex = this.widget.content.activeCellIndex;

    await this.highlightNext();

    return Promise.resolve();
  }

  /**
   * Clears state of a search provider to prepare for startQuery to be called
   * in order to start a new query or refresh an existing one.
   *
   * @returns A promise that resolves when the search provider is ready to
   * begin a new search.
   */
  async endQuery(): Promise<void> {
    this.widget!.model!.cells.changed.connect(this._onCellsChanged, this);
    this.widget!.content.activeCellChanged.disconnect(
      this._onSearchProviderChanged,
      this
    );

    await Promise.all(
      this._searchProviders.map(({ searchEngine: provider }) => {
        provider.changed.disconnect(this._onSearchProviderChanged, this);

        return provider.endQuery();
      })
    );

    this._searchProviders.length = 0;
    this._currentProviderIndex = null;
  }

  /**
   * Resets UI state, removes all matches.
   *
   * @returns A promise that resolves when all state has been cleaned up.
   */
  async endSearch(): Promise<void> {
    const index = this.widget!.content.activeCellIndex;
    await this.endQuery();
    this.widget!.content.activeCellIndex = index;
    // TODO why...
    this.widget!.content.mode = 'edit';
    this.widget = null;
  }

  /**
   * Move the current match indicator to the next match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(loop: boolean = true): Promise<ISearchMatch | undefined> {
    this._currentMatch = await this._stepNext();
    return this._currentMatch;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(
    loop: boolean = true
  ): Promise<ISearchMatch | undefined> {
    this._currentMatch = await this._stepNext(true);
    return this._currentMatch;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string): Promise<boolean> {
    const notebook = this.widget!.content;
    const editor = notebook.activeCell!.editor as CodeMirrorEditor;
    let replaceOccurred = false;
    if (this._currentMatchIsSelected(editor)) {
      const { searchEngine } = this._searchProviders[
        this._currentProviderIndex!
      ];
      replaceOccurred = await searchEngine.replaceCurrentMatch(newText);
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
      const { searchEngine: provider } = this._searchProviders[index];
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
   * The current index of the selected match.
   */
  get currentMatchIndex(): number | null {
    let agg = 0;
    let found = false;
    for (let idx = 0; idx < this._searchProviders.length; idx++) {
      const provider = this._searchProviders[idx];
      const localMatch = provider.searchEngine.currentMatchIndex;
      if (localMatch !== null) {
        agg += localMatch;
        found = true;
        break;
      } else {
        agg += provider.searchEngine.matchesSize;
      }
    }
    return found ? agg : null;
  }

  /**
   * The number of matches.
   */
  get matchesSize(): number | null {
    return this._searchProviders.reduce(
      (sum, provider) => (sum += provider.searchEngine.matchesSize),
      0
    );
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable.  Will be used to determine whether to show
   * the replace option.
   */
  get isReadOnly(): boolean {
    return this.widget?.content.model?.readOnly ?? false;
  }

  private _onCellsChanged(
    cells: IObservableUndoableList<ICellModel>,
    changes: IObservableList.IChangedArgs<ICellModel>
  ): void {
    // TODO update search on cell list changes...?
    // It was removed in https://github.com/jupyterlab/jupyterlab/pull/7835
    switch (changes.type) {
      case 'add':
        changes.newValues.forEach((model, index) => {
          ArrayExt.insert(this._searchProviders, changes.newIndex + index, {
            cell: null,
            searchEngine: null
          });
        });
        break;
      case 'move':
        ArrayExt.move(
          this._searchProviders,
          changes.oldIndex,
          changes.newIndex
        );
        break;
      case 'remove':
        for (let index = 0; index < changes.oldValues.length; index++) {
          const provider = ArrayExt.removeAt(
            this._searchProviders,
            changes.oldIndex
          );
          provider?.searchEngine.dispose();
        }
        break;
    }
  }

  private async _stepNext(
    reverse = false,
    loop = false
  ): Promise<ISearchMatch | null> {
    if (this._currentProviderIndex === null) {
      this._currentProviderIndex = this.widget!.content.activeCellIndex;
    }

    const startIndex = this._currentProviderIndex;
    do {
      const { searchEngine } = this._searchProviders[
        this._currentProviderIndex
      ];

      const match = reverse
        ? await searchEngine.highlightPrevious(false)
        : await searchEngine.highlightNext(false);

      if (match) {
        this.widget!.content.activeCellIndex = this._currentProviderIndex;
        return match;
      } else {
        this._currentProviderIndex =
          this._currentProviderIndex + (reverse ? -1 : 1);

        if (loop) {
          // We loop on all cells, not hit found
          if (this._currentProviderIndex === startIndex) {
            break;
          }

          this._currentProviderIndex =
            (this._currentProviderIndex + this._searchProviders.length) %
            this._searchProviders.length;
        }
      }
    } while (
      0 <= this._currentProviderIndex &&
      this._currentProviderIndex < this._searchProviders.length
    );

    if (loop) {
      // Search a last time in the first provider as it may contain more
      // than one matches
      const { searchEngine } = this._searchProviders[
        this._currentProviderIndex
      ];
      const match = reverse
        ? await searchEngine.highlightPrevious(false)
        : await searchEngine.highlightNext(false);

      if (match) {
        this.widget!.content.activeCellIndex = this._currentProviderIndex;
        return match;
      }
    }

    this._currentProviderIndex = null;
    return null;
  }

  private _onSearchProviderChanged() {
    this.changed.emit();
  }

  private _searchProviders: ICellSearchPair[] = [];
  private _currentProviderIndex: number | null = null;
}
