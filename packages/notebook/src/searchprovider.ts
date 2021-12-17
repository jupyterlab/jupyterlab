// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CellSearchProvider,
  createCellSearchProvider,
  ICellModel,
  MarkdownCell,
  SELECTED_HIGHLIGHT_CLASS
} from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  IFilter,
  IFiltersType,
  ISearchMatch,
  ISearchProviderRegistry,
  SearchProvider
} from '@jupyterlab/documentsearch';
import {
  IObservableList,
  IObservableUndoableList
} from '@jupyterlab/observables';
import { ITranslator } from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { Widget } from '@lumino/widgets';
import { NotebookPanel } from './panel';

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
    this.widget!.content.activeCellChanged.connect(
      this._onActiveCellChanged,
      this
    );
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

    this._query = query;
    this._filters = {
      output: true,
      selectedCells: false,
      ...(filters ?? {})
    };

    if (this._filters.selectedCells) {
      this._onSelectedCells = this._filters.selectedCells;
      this.widget!.content.selectionChanged.connect(
        this._onSelectionChanged,
        this
      );
    }

    // For each cell, create a search provider
    this._searchProviders = await Promise.all(
      cells.map(async cell => {
        const cellSearchProvider = createCellSearchProvider(
          cell,
          this.widget!.content.rendermime,
          this.registry
        );
        cellSearchProvider.changed.connect(this._onSearchProviderChanged, this);

        await cellSearchProvider.setIsActive(
          !this._filters!.selectedCells ||
            this.widget!.content.isSelectedOrActive(cell)
        );
        await cellSearchProvider.startQuery(query, this._filters);

        return cellSearchProvider;
      })
    );

    this._currentProviderIndex = this.widget.content.activeCellIndex;

    await this.highlightNext(false);

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
    await Promise.all(
      this._searchProviders.map(provider => {
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
    this.widget!.model!.cells.changed.disconnect(this._onCellsChanged, this);
    this.widget!.content.activeCellChanged.disconnect(
      this._onActiveCellChanged,
      this
    );

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
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightNext(loop: boolean = true): Promise<ISearchMatch | undefined> {
    const match = await this._stepNext(false, loop);
    return match ?? undefined;
  }

  /**
   * Move the current match indicator to the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves once the action has completed.
   */
  async highlightPrevious(
    loop: boolean = true
  ): Promise<ISearchMatch | undefined> {
    const match = await this._stepNext(true, loop);
    return match ?? undefined;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string, loop = true): Promise<boolean> {
    let replaceOccurred = false;

    if (this._currentProviderIndex !== null) {
      // Unrendered markdown cell
      const activeCell = this.widget?.content.activeCell;
      if (
        activeCell?.model.type === 'markdown' &&
        (activeCell as MarkdownCell).rendered
      ) {
        (activeCell as MarkdownCell).rendered = false;
      }

      const searchEngine = this._searchProviders[this._currentProviderIndex];
      replaceOccurred = await searchEngine.replaceCurrentMatch(newText);
    }
    if (!replaceOccurred) {
      await this.highlightNext(loop);
    }

    // Unrendered markdown cell
    const activeCell = this.widget?.content.activeCell;
    if (
      activeCell?.model.type === 'markdown' &&
      (activeCell as MarkdownCell).rendered
    ) {
      (activeCell as MarkdownCell).rendered = false;
    }
    return replaceOccurred;
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceAllMatches(newText: string): Promise<boolean> {
    const replacementOccurred = await Promise.all(
      this._searchProviders.map(provider => {
        return provider.replaceAllMatches(newText);
      })
    );
    return replacementOccurred.includes(true);
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
      const localMatch = provider.currentMatchIndex;
      if (localMatch !== null) {
        agg += localMatch;
        found = true;
        break;
      } else {
        agg += provider.matchesSize;
      }
    }
    return found ? agg : null;
  }

  /**
   * The number of matches.
   */
  get matchesSize(): number | null {
    return this._searchProviders.reduce(
      (sum, provider) => (sum += provider.matchesSize),
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
    // It was removed in https://github.com/jupyterlab/jupyterlab/pull/7835
    this._clearSelection();

    const addCellProvider = (index: number) => {
      const cell = this.widget!.content.widgets[index];
      const cellSearchProvider = createCellSearchProvider(
        cell,
        this.widget!.content.rendermime,
        this.registry
      );
      cellSearchProvider.changed.connect(this._onSearchProviderChanged, this);

      ArrayExt.insert(this._searchProviders, index, cellSearchProvider);

      cellSearchProvider
        .setIsActive(
          !(this._filters?.selectedCells ?? false) ||
            this.widget!.content.isSelectedOrActive(cell)
        )
        .then(() => {
          cellSearchProvider.startQuery(this._query, this._filters);
        });
    };

    const removeCellProvider = (index: number) => {
      const provider = ArrayExt.removeAt(this._searchProviders, index);
      provider?.changed.disconnect(this._onSearchProviderChanged, this);
      provider?.dispose();
    };

    switch (changes.type) {
      case 'add':
        changes.newValues.forEach((model, index) => {
          addCellProvider(changes.newIndex + index);
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
          removeCellProvider(changes.oldIndex);
        }
        break;
      case 'set':
        changes.newValues.forEach((model, index) => {
          addCellProvider(changes.newIndex + index);
          removeCellProvider(changes.newIndex + index + 1);
        });

        break;
    }
    this.changed.emit();
  }

  private async _stepNext(
    reverse = false,
    loop = false
  ): Promise<ISearchMatch | null> {
    const activateNewMatch = () => {
      if (
        this.widget!.content.activeCellIndex !== this._currentProviderIndex!
      ) {
        this.widget!.content.activeCellIndex = this._currentProviderIndex!;
      }
      const activeCell = this.widget!.content.activeCell!;
      // Unhide cell
      if (activeCell.inputHidden) {
        activeCell.inputHidden = false;
      }
      // scroll to newly activate highlight
      const containerRect = this.widget!.content.node.getBoundingClientRect();
      const element =
        activeCell.node.querySelector(`.${SELECTED_HIGHLIGHT_CLASS}`) ??
        activeCell.node.querySelector('.CodeMirror-selected');
      if (element) {
        const elementRect = element.getBoundingClientRect();
        if (
          elementRect.top < containerRect.top ||
          elementRect.top > containerRect.bottom
        ) {
          element.scrollIntoView({ block: 'center' });
        }
      }
    };

    if (this._currentProviderIndex === null) {
      this._currentProviderIndex = this.widget!.content.activeCellIndex;
    }

    const startIndex = this._currentProviderIndex;
    do {
      const searchEngine = this._searchProviders[this._currentProviderIndex];

      const match = reverse
        ? await searchEngine.highlightPrevious()
        : await searchEngine.highlightNext();

      if (match) {
        activateNewMatch();
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
      const searchEngine = this._searchProviders[this._currentProviderIndex];
      const match = reverse
        ? await searchEngine.highlightPrevious()
        : await searchEngine.highlightNext();

      if (match) {
        activateNewMatch();
        return match;
      }
    }

    this._currentProviderIndex = null;
    return null;
  }

  private async _onActiveCellChanged() {
    await this._onSelectionChanged();

    if (this.widget!.content.activeCellIndex !== this._currentProviderIndex) {
      this._clearSelection();
    }
  }

  private _clearSelection() {
    if (this._currentProviderIndex !== null) {
      this._searchProviders[this._currentProviderIndex].clearSelection();
      this._currentProviderIndex = null;
    }
  }

  private _onSearchProviderChanged() {
    this.changed.emit();
  }

  private async _onSelectionChanged() {
    if (this._onSelectedCells) {
      const cells = this.widget!.content.widgets;
      await Promise.all(
        this._searchProviders.map((provider, index) =>
          provider.setIsActive(
            this.widget!.content.isSelectedOrActive(cells[index])
          )
        )
      );

      this.changed.emit();
    }
  }

  private _currentProviderIndex: number | null = null;
  private _filters: IFiltersType | undefined;
  private _onSelectedCells = false;
  private _query: RegExp | null = null;
  private _searchProviders: CellSearchProvider[] = [];
}
