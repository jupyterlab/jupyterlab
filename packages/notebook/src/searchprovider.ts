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
import { IHighlightAdjacentMatchOptions } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IChangedArgs } from '@jupyterlab/coreutils';
import {
  IFilter,
  IFilters,
  IReplaceOptions,
  IReplaceOptionsSupport,
  ISearchMatch,
  ISearchProvider,
  SearchProvider,
  SelectionState
} from '@jupyterlab/documentsearch';
import { IObservableList, IObservableMap } from '@jupyterlab/observables';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { Widget } from '@lumino/widgets';
import { CellList } from './celllist';
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

    this._handleHighlightsAfterActiveCellChange =
      this._handleHighlightsAfterActiveCellChange.bind(this);
    this.widget.model!.cells.changed.connect(this._onCellsChanged, this);
    this.widget.content.activeCellChanged.connect(
      this._onActiveCellChanged,
      this
    );
    this.widget.content.selectionChanged.connect(
      this._onCellSelectionChanged,
      this
    );
    this.widget.content.stateChanged.connect(
      this._onNotebookStateChanged,
      this
    );
    this._observeActiveCell();
    this._filtersChanged.connect(this._setEnginesSelectionSearchMode, this);
  }

  private _onNotebookStateChanged(_: Notebook, args: IChangedArgs<any>) {
    if (args.name === 'mode') {
      // Delay the update to ensure that `document.activeElement` settled.
      window.setTimeout(() => {
        if (
          args.newValue === 'command' &&
          document.activeElement?.closest('.jp-DocumentSearch-overlay')
        ) {
          // Do not request updating mode when user switched focus to search overlay.
          return;
        }
        this._updateSelectionMode();
        this._filtersChanged.emit();
      }, 0);
    }
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

  getSelectionState(): SelectionState {
    const cellMode = this._selectionSearchMode === 'cells';
    const selectedCount = cellMode ? this._selectedCells : this._selectedLines;
    return selectedCount > 1
      ? 'multiple'
      : selectedCount === 1 && !cellMode
      ? 'single'
      : 'none';
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

    this.widget.content.stateChanged.disconnect(
      this._onNotebookStateChanged,
      this
    );
    this.widget.content.selectionChanged.disconnect(
      this._onCellSelectionChanged,
      this
    );
    this._stopObservingLastCell();

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
        disabledDescription: trans.__(
          'Search in the cell outputs (not available when replace options are shown).'
        ),
        default: false,
        supportReplace: false
      },
      selection: {
        title:
          this._selectionSearchMode === 'cells'
            ? trans._n(
                'Search in %1 Selected Cell',
                'Search in %1 Selected Cells',
                this._selectedCells
              )
            : trans._n(
                'Search in %1 Selected Line',
                'Search in %1 Selected Lines',
                this._selectedLines
              ),
        description: trans.__(
          'Search only in the selected cells or text (depending on edit/command mode).'
        ),
        default: false,
        supportReplace: true
      }
    };
  }

  /**
   * Update the search in selection mode; it should only be called when user
   * navigates the notebook (enters editing/command mode, changes selection)
   * but not when the searchbox gets focused (switching the notebook to command
   * mode) nor when search highlights a match (switching notebook to edit mode).
   */
  private _updateSelectionMode() {
    if (this._selectionLock) {
      return;
    }
    this._selectionSearchMode =
      this._selectedCells === 1 &&
      this.widget.content.mode === 'edit' &&
      this._selectedLines !== 0
        ? 'text'
        : 'cells';
  }

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(): string {
    // Get whatever is selected in the browser window.
    return window.getSelection()?.toString() || '';
  }

  /**
   * Clear currently highlighted match.
   */
  async clearHighlight(): Promise<void> {
    this._selectionLock = true;
    if (
      this._currentProviderIndex !== null &&
      this._currentProviderIndex < this._searchProviders.length
    ) {
      await this._searchProviders[this._currentProviderIndex].clearHighlight();
      this._currentProviderIndex = null;
    }
    this._selectionLock = false;
  }

  /**
   * Highlight the next match.
   *
   * @param loop Whether to loop within the matches list.
   *
   * @returns The next match if available.
   */
  async highlightNext(
    loop: boolean = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    const match = await this._stepNext(false, loop, options);
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
    loop: boolean = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    const match = await this._stepNext(true, loop, options);
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
    this._searchActive = true;
    let cells = this.widget.content.widgets;

    this._query = query;
    this._filters = {
      output: false,
      selection: false,
      ...(filters ?? {})
    };

    this._onSelection = this._filters.selection;

    const currentProviderIndex = this.widget.content.activeCellIndex;

    // For each cell, create a search provider
    this._searchProviders = await Promise.all(
      cells.map(async (cell, index) => {
        const cellSearchProvider = createCellSearchProvider(cell);

        await cellSearchProvider.setIsActive(
          !this._filters!.selection ||
            this.widget.content.isSelectedOrActive(cell)
        );

        if (
          this._onSelection &&
          this._selectionSearchMode === 'text' &&
          index === currentProviderIndex
        ) {
          if (this._textSelection) {
            await cellSearchProvider.setSearchSelection(this._textSelection);
          }
        }

        await cellSearchProvider.startQuery(query, this._filters);

        return cellSearchProvider;
      })
    );
    this._currentProviderIndex = currentProviderIndex;

    // We do not want to show the first "current" closest to cursor as depending
    // on which way the user dragged the selection it would be:
    // - the first or last match when searching in selection
    // - the next match when starting search using ctrl + f
    // `scroll` and `select` are disabled because `startQuery` is also used as
    // "restartQuery" after each text change and if those were enabled, we would
    // steal the cursor.
    await this.highlightNext(true, {
      from: 'selection-start',
      scroll: false,
      select: false
    });

    return Promise.resolve();
  }

  /**
   * Stop the search and clear all internal state.
   */
  async endQuery(): Promise<void> {
    await Promise.all(
      this._searchProviders.map(provider => {
        return provider.endQuery().then(() => {
          provider.dispose();
        });
      })
    );

    this._searchActive = false;
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
      if (searchEngine.currentMatchIndex === null) {
        // switch to next cell
        await this.highlightNext(loop, { from: 'previous-match' });
      }
    }

    // TODO: markdown unrendering/highlighting sequence is likely incorrect
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
          'Searching outputs requires you to run all cells and render their outputs. Are you sure you want to search in the cell outputs?'
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

    ArrayExt.insert(this._searchProviders, index, cellSearchProvider);

    void cellSearchProvider
      .setIsActive(
        !(this._filters?.selection ?? false) ||
          this.widget.content.isSelectedOrActive(cell)
      )
      .then(() => {
        if (this._searchActive) {
          void cellSearchProvider.startQuery(this._query, this._filters);
        }
      });
  }

  private _removeCellProvider(index: number) {
    const provider = ArrayExt.removeAt(this._searchProviders, index);
    provider?.dispose();
  }

  private async _onCellsChanged(
    cells: CellList,
    changes: IObservableList.IChangedArgs<ICellModel>
  ): Promise<void> {
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
    this._stateChanged.emit();
  }

  private async _stepNext(
    reverse = false,
    loop = false,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | null> {
    const activateNewMatch = async (match: ISearchMatch) => {
      const shouldScroll = options?.scroll ?? true;
      if (!shouldScroll) {
        // do not activate the match if scrolling was disabled
        return;
      }

      this._selectionLock = true;
      if (this.widget.content.activeCellIndex !== this._currentProviderIndex!) {
        this.widget.content.activeCellIndex = this._currentProviderIndex!;
      }
      if (this.widget.content.activeCellIndex === -1) {
        console.warn('No active cell (no cells or no model), aborting search');
        this._selectionLock = false;
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
        this._selectionLock = false;
        // It will not be possible the cell is not in the view
        return;
      }

      await activeCell.ready;
      const editor = activeCell.editor!;
      editor.revealPosition(editor.getPositionAt(match.position)!);
      this._selectionLock = false;
    };

    if (this._currentProviderIndex === null) {
      this._currentProviderIndex = this.widget.content.activeCellIndex;
    }

    // When going to previous match in cell mode and there is no current we
    // want to skip the active cell and go to the previous cell; in edit mode
    // the appropriate behaviour is induced by searching from nearest cursor.
    if (reverse && this.widget.content.mode === 'command') {
      const searchEngine = this._searchProviders[this._currentProviderIndex];
      const currentMatch = searchEngine.getCurrentMatch();
      if (!currentMatch) {
        this._currentProviderIndex -= 1;
      }
      if (loop) {
        this._currentProviderIndex =
          (this._currentProviderIndex + this._searchProviders.length) %
          this._searchProviders.length;
      }
    }

    // If we're looking for the next match after the previous match,
    // and we've reached the end of the current cell, start at the next one, if possible
    const from = options?.from ?? '';
    const atEndOfCurrentCell =
      from === 'previous-match' &&
      this._searchProviders[this._currentProviderIndex].currentMatchIndex ===
        null;

    const startIndex = this._currentProviderIndex;
    // If we need to move to the next cell or loop, reset the position of the current search provider.
    if (atEndOfCurrentCell) {
      void this._searchProviders[this._currentProviderIndex].clearHighlight();
    }

    // If we're at the end of the last cell in the provider list and we need to loop, do so
    if (
      loop &&
      atEndOfCurrentCell &&
      this._currentProviderIndex + 1 >= this._searchProviders.length
    ) {
      this._currentProviderIndex = 0;
    } else {
      this._currentProviderIndex += atEndOfCurrentCell ? 1 : 0;
    }
    do {
      const searchEngine = this._searchProviders[this._currentProviderIndex];

      const match = reverse
        ? await searchEngine.highlightPrevious(false, options)
        : await searchEngine.highlightNext(false, options);

      if (match) {
        await activateNewMatch(match);
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

    if (loop) {
      // try the first provider again
      const searchEngine = this._searchProviders[startIndex];
      const match = reverse
        ? await searchEngine.highlightPrevious(false, options)
        : await searchEngine.highlightNext(false, options);
      if (match) {
        await activateNewMatch(match);
        return match;
      }
    }

    this._currentProviderIndex = null;
    return null;
  }

  private async _onActiveCellChanged() {
    if (this._delayedActiveCellChangeHandler !== null) {
      // Prevent handler from running twice if active cell is changed twice
      // within the same task of the event loop.
      clearTimeout(this._delayedActiveCellChangeHandler);
      this._delayedActiveCellChangeHandler = null;
    }

    if (this.widget.content.activeCellIndex !== this._currentProviderIndex) {
      // At this time we cannot handle the change of active cell, because
      // `activeCellChanged` is also emitted in the middle of cell selection
      // change, and if selection is getting extended, we do not want to clear
      // highlights just to re-apply them shortly after, which has side effects
      // impacting the functionality and performance.
      this._delayedActiveCellChangeHandler = window.setTimeout(() => {
        this.delayedActiveCellChangeHandlerReady =
          this._handleHighlightsAfterActiveCellChange();
      }, 0);
    }
    this._observeActiveCell();
  }

  private async _handleHighlightsAfterActiveCellChange() {
    if (this._onSelection) {
      const previousProviderCell =
        this._currentProviderIndex !== null &&
        this._currentProviderIndex < this.widget.content.widgets.length
          ? this.widget.content.widgets[this._currentProviderIndex]
          : null;

      const previousProviderInCurrentSelection =
        previousProviderCell &&
        this.widget.content.isSelectedOrActive(previousProviderCell);

      if (!previousProviderInCurrentSelection) {
        await this._updateCellSelection();
        // Clear highlight from previous provider
        await this.clearHighlight();
        // If we are searching in all cells, we should not change the active
        // provider when switching active cell to preserve current match;
        // if we are searching within selected cells we should update
        this._currentProviderIndex = this.widget.content.activeCellIndex;
      }
    }

    await this._ensureCurrentMatch();
  }

  /**
   * If there are results but no match is designated as current,
   * mark a result as current and highlight it.
   */
  private async _ensureCurrentMatch() {
    if (this._currentProviderIndex !== null) {
      const searchEngine = this._searchProviders[this._currentProviderIndex];
      if (!searchEngine) {
        // This can happen when `startQuery()` has not finished yet.
        return;
      }
      const currentMatch = searchEngine.getCurrentMatch();
      if (!currentMatch && this.matchesCount) {
        // Select a match as current by highlighting next (with looping) from
        // the selection start, to prevent "current" match from jumping around.
        await this.highlightNext(true, {
          from: 'start',
          scroll: false,
          select: false
        });
      }
    }
  }

  private _observeActiveCell() {
    const editor = this.widget.content.activeCell?.editor;
    if (!editor) {
      return;
    }
    this._stopObservingLastCell();

    editor.model.selections.changed.connect(this._setSelectedLines, this);
    this._editorSelectionsObservable = editor.model.selections;
  }

  private _stopObservingLastCell() {
    if (this._editorSelectionsObservable) {
      this._editorSelectionsObservable.changed.disconnect(
        this._setSelectedLines,
        this
      );
    }
  }

  private _setSelectedLines() {
    const editor = this.widget.content.activeCell?.editor;
    if (!editor) {
      return;
    }

    const selection = editor.getSelection();
    const { start, end } = selection;

    const newLines =
      end.line === start.line && end.column === start.column
        ? 0
        : end.line - start.line + 1;

    this._textSelection = selection;

    if (newLines !== this._selectedLines) {
      this._selectedLines = newLines;
      this._updateSelectionMode();
    }
    this._filtersChanged.emit();
  }

  private _textSelection: CodeEditor.IRange | null = null;

  /**
   * Set whether the engines should search within selection only or full text.
   */
  private async _setEnginesSelectionSearchMode() {
    let textMode: boolean;

    if (!this._onSelection) {
      // When search in selection is off we always search full text
      textMode = false;
    } else {
      // When search in selection is off we either search in full cells
      // (toggling off isActive flag on search engines of non-selected cells)
      // or in selected text of the active cell.
      textMode = this._selectionSearchMode === 'text';
    }

    if (this._selectionLock) {
      return;
    }

    // Clear old selection restrictions or if relevant, set current restrictions for active provider.
    await Promise.all(
      this._searchProviders.map((provider, index) => {
        const isCurrent = this.widget.content.activeCellIndex === index;
        provider.setProtectSelection(isCurrent && this._onSelection);
        return provider.setSearchSelection(
          isCurrent && textMode ? this._textSelection : null
        );
      })
    );
  }

  private async _onCellSelectionChanged() {
    if (this._delayedActiveCellChangeHandler !== null) {
      // Avoid race condition due to `activeCellChanged` and `selectionChanged`
      // signals firing in short sequence when selection gets extended, with
      // handling of the former having potential to undo selection set by the latter.
      clearTimeout(this._delayedActiveCellChangeHandler);
      this._delayedActiveCellChangeHandler = null;
    }
    await this._updateCellSelection();
    if (this._currentProviderIndex === null) {
      // For consistency we set the first cell in selection as current provider.
      const firstSelectedCellIndex = this.widget.content.widgets.findIndex(
        cell => this.widget.content.isSelectedOrActive(cell)
      );
      this._currentProviderIndex = firstSelectedCellIndex;
    }
    await this._ensureCurrentMatch();
  }

  private async _updateCellSelection() {
    const cells = this.widget.content.widgets;
    let selectedCells = 0;
    await Promise.all(
      cells.map(async (cell, index) => {
        const provider = this._searchProviders[index];
        const isSelected = this.widget.content.isSelectedOrActive(cell);
        if (isSelected) {
          selectedCells += 1;
        }
        if (provider && this._onSelection) {
          await provider.setIsActive(isSelected);
        }
      })
    );

    if (selectedCells !== this._selectedCells) {
      this._selectedCells = selectedCells;
      this._updateSelectionMode();
    }

    this._filtersChanged.emit();
  }

  // used for testing only
  protected delayedActiveCellChangeHandlerReady: Promise<void>;
  private _currentProviderIndex: number | null = null;
  private _delayedActiveCellChangeHandler: number | null = null;
  private _filters: IFilters | undefined;
  private _onSelection = false;
  private _selectedCells: number = 1;
  private _selectedLines: number = 0;
  private _query: RegExp | null = null;
  private _searchProviders: CellSearchProvider[] = [];
  private _editorSelectionsObservable: IObservableMap<
    CodeEditor.ITextSelection[]
  > | null = null;
  private _selectionSearchMode: 'cells' | 'text' = 'cells';
  private _selectionLock: boolean = false;
  private _searchActive: boolean = false;
}
