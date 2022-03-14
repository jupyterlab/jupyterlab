// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Cell,
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
  ISearchProvider,
  SearchProvider
} from '@jupyterlab/documentsearch';
import {
  IObservableList,
  IObservableUndoableList
} from '@jupyterlab/observables';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { Widget } from '@lumino/widgets';
import { NotebookPanel } from './panel';
import { Notebook } from './widget';

/**
 * Notebook document search provider
 */
export class NotebookSearchProvider extends SearchProvider<NotebookPanel> {
  /**
   * Constructor
   *
   * @param widget The widget to search in
   * @param translator Application translator
   */
  constructor(
    widget: NotebookPanel,
    protected translator: ITranslator = nullTranslator
  ) {
    super(widget);

    this.widget.model!.cells.changed.connect(this._onCellsChanged, this);
    this.widget.content.activeCellChanged.connect(
      this._onActiveCellChanged,
      this
    );
    this.widget.content.placeholderCellRendered.connect(
      this._onPlaceholderRendered,
      this
    );
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   *
   * @param domain Widget to test
   * @returns Search ability
   */
  static canSearchOn(domain: Widget): domain is NotebookPanel {
    // check to see if the CMSearchProvider can search on the
    // first cell, false indicates another editor is present
    return domain instanceof NotebookPanel;
  }

  /**
   * Instantiate a search provider for the notebook panel.
   *
   * #### Notes
   * The widget provided is always checked using `canSearchOn` before calling
   * this factory.
   *
   * @param widget The widget to search on
   * @param translator [optional] The translator object
   *
   * @returns The search provider on the notebook panel
   */
  static createSearchProvider(
    widget: NotebookPanel,
    translator?: ITranslator
  ): ISearchProvider<NotebookPanel> {
    return new NotebookSearchProvider(widget, translator);
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

  /**
   * Dispose of the resources held by the search provider.
   *
   * #### Notes
   * If the object's `dispose` method is called more than once, all
   * calls made after the first will be a no-op.
   *
   * #### Undefined Behavior
   * It is undefined behavior to use any functionality of the object
   * after it has been disposed unless otherwise explicitly noted.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    this.widget.content.placeholderCellRendered.disconnect(
      this._onPlaceholderRendered,
      this
    );
    this.widget.content.activeCellChanged.disconnect(
      this._onActiveCellChanged,
      this
    );
    this.widget.model?.cells.changed.disconnect(this._onCellsChanged, this);

    const index = this.widget.content.activeCellIndex;
    this.endQuery()
      .then(() => {
        if (!this.widget.isDisposed) {
          this.widget.content.activeCellIndex = index;
        }
      })
      .catch(reason => {
        console.error(`Fail to end search query in notebook:\n${reason}`);
      });
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
        default: false,
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
  getInitialQuery(): string {
    const activeCell = this.widget.content.activeCell;
    const selection = (activeCell?.editor as
      | CodeMirrorEditor
      | undefined)?.doc.getSelection();
    // if there are newlines, just return empty string
    return selection?.search(/\r?\n|\r/g) === -1 ? selection : '';
  }

  /**
   * Clear currently highlighted match.
   */
  clearHighlight(): void {
    if (this._currentProviderIndex !== null) {
      this._searchProviders[this._currentProviderIndex].clearHighlight();
      this._currentProviderIndex = null;
    }
  }

  /**
   * Highlight the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The next match if available.
   */
  async highlightNext(loop: boolean = true): Promise<ISearchMatch | undefined> {
    const match = await this._stepNext(false, loop);
    return match ?? undefined;
  }

  /**
   * Highlight the previous match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The previous match if available.
   */
  async highlightPrevious(
    loop: boolean = true
  ): Promise<ISearchMatch | undefined> {
    const match = await this._stepNext(true, loop);
    return match ?? undefined;
  }

  /**
   * Search for a regular expression with optional filters.
   *
   * @param query A regular expression to test for
   * @param filters Filter parameters to pass to provider
   *
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
      output: false,
      selectedCells: false,
      ...(filters ?? {})
    };

    this._onSelectedCells = this._filters.selectedCells;
    if (this._filters.selectedCells) {
      this.widget.content.selectionChanged.connect(
        this._onSelectionChanged,
        this
      );
    }

    // For each cell, create a search provider
    this._searchProviders = await Promise.all(
      cells.map(async cell => {
        const cellSearchProvider = createCellSearchProvider(cell);
        cellSearchProvider.changed.connect(this._onSearchProviderChanged, this);

        await cellSearchProvider.setIsActive(
          !this._filters!.selectedCells ||
            this.widget.content.isSelectedOrActive(cell)
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
   * Stop the search and clear all internal state.
   */
  async endQuery(): Promise<void> {
    await Promise.all(
      this._searchProviders.map(provider => {
        provider.changed.disconnect(this._onSearchProviderChanged, this);

        return provider.endQuery().then(() => {
          provider.dispose();
        });
      })
    );

    this._searchProviders.length = 0;
    this._currentProviderIndex = null;
  }

  /**
   * Replace the currently selected match with the provided text
   *
   * @param newText The replacement text.
   * @param loop Whether to loop within the matches list.
   *
   * @returns A promise that resolves with a boolean indicating whether a replace occurred.
   */
  async replaceCurrentMatch(newText: string, loop = true): Promise<boolean> {
    let replaceOccurred = false;

    const unrenderMarkdownCell = async (
      highlightNext = false
    ): Promise<void> => {
      // Unrendered markdown cell
      const activeCell = this.widget?.content.activeCell;
      if (
        activeCell?.model.type === 'markdown' &&
        (activeCell as MarkdownCell).rendered
      ) {
        (activeCell as MarkdownCell).rendered = false;
        if (highlightNext) {
          await this.highlightNext(loop);
        }
      }
    };

    if (this._currentProviderIndex !== null) {
      await unrenderMarkdownCell();

      const searchEngine = this._searchProviders[this._currentProviderIndex];
      replaceOccurred = await searchEngine.replaceCurrentMatch(newText);
    }

    await this.highlightNext(loop);
    // Force highlighting the first hit in the unrendered cell
    await unrenderMarkdownCell(true);
    return replaceOccurred;
  }

  /**
   * Replace all matches in the notebook with the provided text
   *
   * @param newText The replacement text.
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

  private _addCellProvider(index: number) {
    const cell = this.widget.content.widgets[index];
    const cellSearchProvider = createCellSearchProvider(cell);
    cellSearchProvider.changed.connect(this._onSearchProviderChanged, this);

    ArrayExt.insert(this._searchProviders, index, cellSearchProvider);

    cellSearchProvider
      .setIsActive(
        !(this._filters?.selectedCells ?? false) ||
          this.widget.content.isSelectedOrActive(cell)
      )
      .then(() => {
        cellSearchProvider.startQuery(this._query, this._filters);
      });
  }

  private _removeCellProvider(index: number) {
    const provider = ArrayExt.removeAt(this._searchProviders, index);
    provider?.changed.disconnect(this._onSearchProviderChanged, this);
    provider?.dispose();
  }

  private _onCellsChanged(
    cells: IObservableUndoableList<ICellModel>,
    changes: IObservableList.IChangedArgs<ICellModel>
  ): void {
    this.clearHighlight();

    switch (changes.type) {
      case 'add':
        changes.newValues.forEach((model, index) => {
          this._addCellProvider(changes.newIndex + index);
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
          this._removeCellProvider(changes.oldIndex);
        }
        break;
      case 'set':
        changes.newValues.forEach((model, index) => {
          this._addCellProvider(changes.newIndex + index);
          this._removeCellProvider(changes.newIndex + index + 1);
        });

        break;
    }
    this.changed.emit();
  }

  private _onPlaceholderRendered(
    panel: Notebook,
    renderedCell: Cell<ICellModel>
  ): void {
    const index = panel.widgets.findIndex(cell => cell.id === renderedCell.id);
    if (index >= 0) {
      this._onCellsChanged(panel.model!.cells, {
        newIndex: index,
        newValues: [renderedCell.model],
        oldIndex: index,
        oldValues: [renderedCell.model],
        type: 'set'
      });
    }
  }

  private async _stepNext(
    reverse = false,
    loop = false
  ): Promise<ISearchMatch | null> {
    const activateNewMatch = () => {
      if (this.widget.content.activeCellIndex !== this._currentProviderIndex!) {
        this.widget.content.activeCellIndex = this._currentProviderIndex!;
      }
      const activeCell = this.widget.content.activeCell!;
      // Unhide cell
      if (activeCell.inputHidden) {
        activeCell.inputHidden = false;
      }
      // scroll to newly activate highlight
      const containerRect = this.widget.content.node.getBoundingClientRect();
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
      this._currentProviderIndex = this.widget.content.activeCellIndex;
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

    if (this.widget.content.activeCellIndex !== this._currentProviderIndex) {
      this.clearHighlight();
    }
  }

  private _onSearchProviderChanged() {
    this.changed.emit();
  }

  private async _onSelectionChanged() {
    if (this._onSelectedCells) {
      const cells = this.widget.content.widgets;
      await Promise.all(
        this._searchProviders.map((provider, index) =>
          provider.setIsActive(
            this.widget.content.isSelectedOrActive(cells[index])
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
