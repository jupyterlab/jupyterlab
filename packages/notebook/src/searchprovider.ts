// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import {
  CellSearchProvider,
  CodeCell,
  createCellSearchProvider,
  ICellModel,
  MarkdownCell
} from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  IFilter,
  IFilters,
  IReplaceOptions,
  IReplaceOptionsSupport,
  ISearchMatch,
  ISearchProvider,
  SearchProvider
} from '@jupyterlab/documentsearch';
import { IObservableList } from '@jupyterlab/observables';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { Widget } from '@lumino/widgets';
import { CellList } from './celllist';
import { NotebookPanel } from './panel';

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
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   *
   * @param domain Widget to test
   * @returns Search ability
   */
  static isApplicable(domain: Widget): domain is NotebookPanel {
    // check to see if the CMSearchProvider can search on the
    // first cell, false indicates another editor is present
    return domain instanceof NotebookPanel;
  }

  /**
   * Instantiate a search provider for the notebook panel.
   *
   * #### Notes
   * The widget provided is always checked using `isApplicable` before calling
   * this factory.
   *
   * @param widget The widget to search on
   * @param translator [optional] The translator object
   *
   * @returns The search provider on the notebook panel
   */
  static createNew(
    widget: NotebookPanel,
    translator?: ITranslator
  ): ISearchProvider {
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
      if (this._currentProviderIndex == idx) {
        const localMatch = provider.currentMatchIndex;
        if (localMatch === null) {
          return null;
        }
        agg += localMatch;
        found = true;
        break;
      } else {
        agg += provider.matchesCount;
      }
    }
    return found ? agg : null;
  }

  /**
   * The number of matches.
   */
  get matchesCount(): number | null {
    return this._searchProviders.reduce(
      (sum, provider) => (sum += provider.matchesCount),
      0
    );
  }

  /**
   * Set to true if the widget under search is read-only, false
   * if it is editable. Will be used to determine whether to show
   * the replace option.
   */
  get isReadOnly(): boolean {
    return this.widget?.content.model?.readOnly ?? false;
  }

  /**
   * Support for options adjusting replacement behavior.
   */
  get replaceOptionsSupport(): IReplaceOptionsSupport {
    return {
      preserveCase: true
    };
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

    this.widget.content.activeCellChanged.disconnect(
      this._onActiveCellChanged,
      this
    );
    this.widget.model?.cells.changed.disconnect(this._onCellsChanged, this);

    super.dispose();

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
    const editor = activeCell?.editor as CodeMirrorEditor | undefined;
    if (!editor) {
      return '';
    }
    const selection = editor.state.sliceDoc(
      editor.state.selection.main.from,
      editor.state.selection.main.to
    );
    return selection;
  }

  /**
   * Clear currently highlighted match.
   */
  async clearHighlight(): Promise<void> {
    if (this._currentProviderIndex !== null) {
      await this._searchProviders[this._currentProviderIndex].clearHighlight();
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
    filters: IFilters | undefined
  ): Promise<void> {
    if (!this.widget) {
      return;
    }
    await this.endQuery();
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
        cellSearchProvider.stateChanged.connect(
          this._onSearchProviderChanged,
          this
        );

        await cellSearchProvider.setIsActive(
          !this._filters!.selectedCells ||
            this.widget.content.isSelectedOrActive(cell)
        );
        await cellSearchProvider.startQuery(query, this._filters);

        return cellSearchProvider;
      })
    );

    this._currentProviderIndex = this.widget.content.activeCellIndex;

    if (!this._documentHasChanged) {
      await this.highlightNext(false);
    }
    this._documentHasChanged = false;

    return Promise.resolve();
  }

  /**
   * Stop the search and clear all internal state.
   */
  async endQuery(): Promise<void> {
    await Promise.all(
      this._searchProviders.map(provider => {
        provider.stateChanged.disconnect(this._onSearchProviderChanged, this);

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
  async replaceCurrentMatch(
    newText: string,
    loop = true,
    options?: IReplaceOptions
  ): Promise<boolean> {
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
      replaceOccurred = await searchEngine.replaceCurrentMatch(
        newText,
        false,
        options
      );
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
  async replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    const replacementOccurred = await Promise.all(
      this._searchProviders.map(provider => {
        return provider.replaceAllMatches(newText, options);
      })
    );
    return replacementOccurred.includes(true);
  }

  async validateFilter(name: string, value: boolean): Promise<boolean> {
    if (name !== 'output') {
      // Bail early
      return value;
    }

    // If value is true and some cells have never been rendered, ask confirmation.
    if (
      value &&
      this.widget.content.widgets.some(
        w => w instanceof CodeCell && w.isPlaceholder()
      )
    ) {
      const trans = this.translator.load('jupyterlab');

      const reply = await showDialog({
        title: trans.__('Confirmation'),
        body: trans.__(
          'Searching outputs is expensive and requires to first rendered all outputs. Are you sure you want to search in the cell outputs?'
        ),
        buttons: [
          Dialog.cancelButton({ label: trans.__('Cancel') }),
          Dialog.okButton({ label: trans.__('Ok') })
        ]
      });
      if (reply.button.accept) {
        this.widget.content.widgets.forEach((w, i) => {
          if (w instanceof CodeCell && w.isPlaceholder()) {
            this.widget.content.renderCellOutputs(i);
          }
        });
      } else {
        return false;
      }
    }

    return value;
  }

  private _addCellProvider(index: number) {
    const cell = this.widget.content.widgets[index];
    const cellSearchProvider = createCellSearchProvider(cell);
    cellSearchProvider.stateChanged.connect(
      this._onSearchProviderChanged,
      this
    );

    ArrayExt.insert(this._searchProviders, index, cellSearchProvider);

    void cellSearchProvider
      .setIsActive(
        !(this._filters?.selectedCells ?? false) ||
          this.widget.content.isSelectedOrActive(cell)
      )
      .then(() => {
        void cellSearchProvider.startQuery(this._query, this._filters);
      });
  }

  private _removeCellProvider(index: number) {
    const provider = ArrayExt.removeAt(this._searchProviders, index);
    provider?.stateChanged.disconnect(this._onSearchProviderChanged, this);
    provider?.dispose();
  }

  private async _onCellsChanged(
    cells: CellList,
    changes: IObservableList.IChangedArgs<ICellModel>
  ): Promise<void> {
    await this.clearHighlight();

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
    this._onSearchProviderChanged();
  }

  private async _stepNext(
    reverse = false,
    loop = false
  ): Promise<ISearchMatch | null> {
    const activateNewMatch = async () => {
      if (this.widget.content.activeCellIndex !== this._currentProviderIndex!) {
        this.widget.content.activeCellIndex = this._currentProviderIndex!;
      }
      if (this.widget.content.activeCellIndex === -1) {
        console.warn('No active cell (no cells or no model), aborting search');
        return;
      }
      const activeCell = this.widget.content.activeCell!;

      if (!activeCell.inViewport) {
        try {
          await this.widget.content.scrollToItem(this._currentProviderIndex!);
        } catch (error) {
          // no-op
        }
      }

      // Unhide cell
      if (activeCell.inputHidden) {
        activeCell.inputHidden = false;
      }

      if (!activeCell.inViewport) {
        // It will not be possible the cell is not in the view
        return;
      }

      await activeCell.ready;
      const editor = activeCell.editor! as CodeMirrorEditor;
      editor.revealSelection(editor.getSelection());
    };

    if (this._currentProviderIndex === null) {
      this._currentProviderIndex = this.widget.content.activeCellIndex;
    }

    const startIndex = this._currentProviderIndex;
    do {
      const searchEngine = this._searchProviders[this._currentProviderIndex];

      const match = reverse
        ? await searchEngine.highlightPrevious(false)
        : await searchEngine.highlightNext(false);

      if (match) {
        await activateNewMatch();
        return match;
      } else {
        this._currentProviderIndex =
          this._currentProviderIndex + (reverse ? -1 : 1);

        if (loop) {
          this._currentProviderIndex =
            (this._currentProviderIndex + this._searchProviders.length) %
            this._searchProviders.length;
        }
      }
    } while (
      loop
        ? // We looped on all cells, no hit found
          this._currentProviderIndex !== startIndex
        : 0 <= this._currentProviderIndex &&
          this._currentProviderIndex < this._searchProviders.length
    );

    this._currentProviderIndex = null;
    return null;
  }

  private async _onActiveCellChanged() {
    await this._onSelectionChanged();

    if (this.widget.content.activeCellIndex !== this._currentProviderIndex) {
      await this.clearHighlight();
    }
  }

  private _onSearchProviderChanged() {
    // Don't highlight the next occurrence when the query
    // follows a document change
    this._documentHasChanged = true;
    this._stateChanged.emit();
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

      this._onSearchProviderChanged();
    }
  }

  private _currentProviderIndex: number | null = null;
  private _filters: IFilters | undefined;
  private _onSelectedCells = false;
  private _query: RegExp | null = null;
  private _searchProviders: CellSearchProvider[] = [];
  private _documentHasChanged = false;
}
