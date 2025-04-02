// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOMUtils } from '@jupyterlab/apputils';
import {
  Cell,
  CodeCell,
  ICellModel,
  ICodeCellModel,
  IMarkdownCellModel,
  IRawCellModel,
  MarkdownCell,
  RawCell
} from '@jupyterlab/cells';
import { CodeEditor, IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { IChangedArgs } from '@jupyterlab/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import { IObservableList } from '@jupyterlab/observables';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import type { IMapChange } from '@jupyter/ydoc';
import { TableOfContentsUtils } from '@jupyterlab/toc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { WindowedList } from '@jupyterlab/ui-components';
import { ArrayExt, findIndex } from '@lumino/algorithm';
import { MimeData } from '@lumino/coreutils';
import { ElementExt } from '@lumino/domutils';
import { Drag } from '@lumino/dragdrop';
import { Message } from '@lumino/messaging';
import { AttachedProperty } from '@lumino/properties';
import { ISignal, Signal } from '@lumino/signaling';
import { h, VirtualDOM } from '@lumino/virtualdom';
import { PanelLayout, Widget } from '@lumino/widgets';
import { NotebookActions } from './actions';
import { CellList } from './celllist';
import { DROP_SOURCE_CLASS, DROP_TARGET_CLASS } from './constants';
import { INotebookHistory } from './history';
import { INotebookModel } from './model';
import { NotebookViewModel, NotebookWindowedLayout } from './windowing';
import { NotebookFooter } from './notebookfooter';
import { CodeCellModel } from '../../cells/src/model';

/**
 * The data attribute added to a widget that has an active kernel.
 */
const KERNEL_USER = 'jpKernelUser';

/**
 * The data attribute added to a widget that can run code.
 */
const CODE_RUNNER = 'jpCodeRunner';

/**
 * The data attribute added to a widget that can undo.
 */
const UNDOER = 'jpUndoer';

/**
 * The class name added to notebook widgets.
 */
const NB_CLASS = 'jp-Notebook';

/**
 * The class name added to notebook widget cells.
 */
const NB_CELL_CLASS = 'jp-Notebook-cell';

/**
 * The class name added to a notebook in edit mode.
 */
const EDIT_CLASS = 'jp-mod-editMode';

/**
 * The class name added to a notebook in command mode.
 */
const COMMAND_CLASS = 'jp-mod-commandMode';

/**
 * The class name added to the active cell.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class name added to selected cells.
 */
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The class name added to the cell when dirty.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to an active cell when there are other selected cells.
 */
const OTHER_SELECTED_CLASS = 'jp-mod-multiSelected';

/**
 * The class name added to unconfined images.
 */
const UNCONFINED_CLASS = 'jp-mod-unconfined';

/**
 * The class name added to the notebook when an element within it is focused
 * and takes keyboard input, such as focused <input> or <div contenteditable>.
 *
 * This class is also effective when the focused element is in shadow DOM.
 */
const READ_WRITE_CLASS = 'jp-mod-readWrite';

/**
 * The class name added to drag images.
 */
const DRAG_IMAGE_CLASS = 'jp-dragImage';

/**
 * The class name added to singular drag images
 */
const SINGLE_DRAG_IMAGE_CLASS = 'jp-dragImage-singlePrompt';

/**
 * The class name added to the drag image cell content.
 */
const CELL_DRAG_CONTENT_CLASS = 'jp-dragImage-content';

/**
 * The class name added to the drag image cell content.
 */
const CELL_DRAG_PROMPT_CLASS = 'jp-dragImage-prompt';

/**
 * The class name added to the drag image cell content.
 */
const CELL_DRAG_MULTIPLE_BACK = 'jp-dragImage-multipleBack';

/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * Maximal remaining time for idle callback
 *
 * Ref: https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API#getting_the_most_out_of_idle_callbacks
 */
const MAXIMUM_TIME_REMAINING = 50;

/*
 * The rendering mode for the notebook.
 */
type RenderingLayout = 'default' | 'side-by-side';

/**
 * The class attached to the heading collapser button
 */
const HEADING_COLLAPSER_CLASS = 'jp-collapseHeadingButton';

/**
 * The class that controls the visibility of "heading collapser" and "show hidden cells" buttons.
 */
const HEADING_COLLAPSER_VISBILITY_CONTROL_CLASS =
  'jp-mod-showHiddenCellsButton';

const SIDE_BY_SIDE_CLASS = 'jp-mod-sideBySide';

/**
 * The interactivity modes for the notebook.
 */
export type NotebookMode = 'command' | 'edit';

if ((window as any).requestIdleCallback === undefined) {
  // On Safari, requestIdleCallback is not available, so we use replacement functions for `idleCallbacks`
  // See: https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API#falling_back_to_settimeout
  // eslint-disable-next-line @typescript-eslint/ban-types
  (window as any).requestIdleCallback = function (handler: Function) {
    let startTime = Date.now();
    return setTimeout(function () {
      handler({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50.0 - (Date.now() - startTime));
        }
      });
    }, 1);
  };

  (window as any).cancelIdleCallback = function (id: number) {
    clearTimeout(id);
  };
}

/**
 * A widget which renders static non-interactive notebooks.
 *
 * #### Notes
 * The widget model must be set separately and can be changed
 * at any time.  Consumers of the widget must account for a
 * `null` model, and may want to listen to the `modelChanged`
 * signal.
 */
export class StaticNotebook extends WindowedList<NotebookViewModel> {
  /**
   * Construct a notebook widget.
   */
  constructor(options: StaticNotebook.IOptions) {
    const cells = new Array<Cell>();
    const windowingActive =
      (options.notebookConfig?.windowingMode ??
        StaticNotebook.defaultNotebookConfig.windowingMode) === 'full';
    super({
      model: new NotebookViewModel(cells, {
        overscanCount:
          options.notebookConfig?.overscanCount ??
          StaticNotebook.defaultNotebookConfig.overscanCount,
        windowingActive
      }),
      layout: new NotebookWindowedLayout(),
      renderer: options.renderer ?? WindowedList.defaultRenderer,
      scrollbar: false
    });
    this.addClass(NB_CLASS);
    this.cellsArray = cells;

    this._idleCallBack = null;

    this._editorConfig = StaticNotebook.defaultEditorConfig;
    this._notebookConfig = StaticNotebook.defaultNotebookConfig;
    this._mimetype = IEditorMimeTypeService.defaultMimeType;
    this._notebookModel = null;
    this._modelChanged = new Signal<this, void>(this);
    this._modelContentChanged = new Signal<this, void>(this);

    this.node.dataset[KERNEL_USER] = 'true';
    this.node.dataset[UNDOER] = 'true';
    this.node.dataset[CODE_RUNNER] = 'true';
    this.rendermime = options.rendermime;
    this.translator = options.translator || nullTranslator;
    this.contentFactory = options.contentFactory;
    this.editorConfig =
      options.editorConfig || StaticNotebook.defaultEditorConfig;
    this.notebookConfig =
      options.notebookConfig || StaticNotebook.defaultNotebookConfig;
    this._updateNotebookConfig();
    this._mimetypeService = options.mimeTypeService;
    this.renderingLayout = options.notebookConfig?.renderingLayout;
    this.kernelHistory = options.kernelHistory;
  }

  get cellCollapsed(): ISignal<this, Cell> {
    return this._cellCollapsed;
  }

  get cellInViewportChanged(): ISignal<this, Cell> {
    return this._cellInViewportChanged;
  }

  /**
   * A signal emitted when the model of the notebook changes.
   */
  get modelChanged(): ISignal<this, void> {
    return this._modelChanged;
  }

  /**
   * A signal emitted when the model content changes.
   *
   * #### Notes
   * This is a convenience signal that follows the current model.
   */
  get modelContentChanged(): ISignal<this, void> {
    return this._modelContentChanged;
  }

  /**
   * A signal emitted when the rendering layout of the notebook changes.
   */
  get renderingLayoutChanged(): ISignal<this, RenderingLayout> {
    return this._renderingLayoutChanged;
  }

  /**
   * The cell factory used by the widget.
   */
  readonly contentFactory: StaticNotebook.IContentFactory;

  /**
   * The Rendermime instance used by the widget.
   */
  readonly rendermime: IRenderMimeRegistry;

  /**
   * Translator to be used by cell renderers
   */
  readonly translator: ITranslator;

  /**
   * The model for the widget.
   */
  get model(): INotebookModel | null {
    return this._notebookModel;
  }
  set model(newValue: INotebookModel | null) {
    newValue = newValue || null;
    if (this._notebookModel === newValue) {
      return;
    }
    const oldValue = this._notebookModel;
    this._notebookModel = newValue;
    // Trigger private, protected, and public changes.
    this._onModelChanged(oldValue, newValue);
    this.onModelChanged(oldValue, newValue);
    this._modelChanged.emit(void 0);

    // Trigger state change
    this.viewModel.itemsList = newValue?.cells ?? null;
  }

  /**
   * Get the mimetype for code cells.
   */
  get codeMimetype(): string {
    return this._mimetype;
  }

  /**
   * A read-only sequence of the widgets in the notebook.
   */
  get widgets(): ReadonlyArray<Cell> {
    return this.cellsArray as ReadonlyArray<Cell>;
  }

  /**
   * A configuration object for cell editor settings.
   */
  get editorConfig(): StaticNotebook.IEditorConfig {
    return this._editorConfig;
  }
  set editorConfig(value: StaticNotebook.IEditorConfig) {
    this._editorConfig = value;
    this._updateEditorConfig();
  }

  /**
   * A configuration object for notebook settings.
   */
  get notebookConfig(): StaticNotebook.INotebookConfig {
    return this._notebookConfig;
  }
  set notebookConfig(value: StaticNotebook.INotebookConfig) {
    this._notebookConfig = value;
    this._updateNotebookConfig();
  }

  get renderingLayout(): RenderingLayout | undefined {
    return this._renderingLayout;
  }
  set renderingLayout(value: RenderingLayout | undefined) {
    this._renderingLayout = value;
    if (this._renderingLayout === 'side-by-side') {
      this.node.classList.add(SIDE_BY_SIDE_CLASS);
    } else {
      this.node.classList.remove(SIDE_BY_SIDE_CLASS);
    }
    this._renderingLayoutChanged.emit(this._renderingLayout ?? 'default');
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._notebookModel = null;
    (this.layout as NotebookWindowedLayout).header?.dispose();
    super.dispose();
  }

  /**
   * Move cells preserving widget view state.
   *
   * #### Notes
   * This is required because at the model level a move is a deletion
   * followed by an insertion. Hence the view state is not preserved.
   *
   * @param from The index of the cell to move
   * @param to The new index of the cell
   * @param n Number of cells to move
   */
  moveCell(from: number, to: number, n = 1): void {
    if (!this.model) {
      return;
    }

    const boundedTo = Math.min(this.model.cells.length - 1, Math.max(0, to));

    if (boundedTo === from) {
      return;
    }

    const viewModel: { [k: string]: any }[] = new Array(n);
    let dirtyState: boolean[] = new Array(n);

    for (let i = 0; i < n; i++) {
      viewModel[i] = {};
      const oldCell = this.widgets[from + i];
      if (oldCell.model.type === 'markdown') {
        for (const k of ['rendered', 'headingCollapsed']) {
          // @ts-expect-error Cell has no index signature
          viewModel[i][k] = oldCell[k];
        }
      } else if (oldCell.model.type === 'code') {
        const oldCodeCell = oldCell.model as ICodeCellModel;
        dirtyState[i] = oldCodeCell.isDirty;
      }
    }

    this.model!.sharedModel.moveCells(from, boundedTo, n);

    for (let i = 0; i < n; i++) {
      const newCell = this.widgets[to + i];
      const view = viewModel[i];
      for (const state in view) {
        // @ts-expect-error Cell has no index signature
        newCell[state] = view[state];
      }

      if (from > to) {
        if (this.widgets[to + i].model.type === 'code') {
          (this.widgets[to + i].model as CodeCellModel).isDirty = dirtyState[i];
        }
      } else {
        if (this.widgets[to + i - n + 1].model.type === 'code') {
          (this.widgets[to + i - n + 1].model as CodeCellModel).isDirty =
            dirtyState[i];
        }
      }
    }
  }

  /**
   * Force rendering the cell outputs of a given cell if it is still a placeholder.
   *
   * #### Notes
   * The goal of this method is to allow search on cell outputs (that is based
   * on DOM tree introspection).
   *
   * @param index The cell index
   */
  renderCellOutputs(index: number): void {
    const cell = this.viewModel.widgetRenderer(index) as Cell;
    if (cell instanceof CodeCell && cell.isPlaceholder()) {
      cell.dataset.windowedListIndex = `${index}`;
      this.layout.insertWidget(index, cell);
      if (this.notebookConfig.windowingMode === 'full') {
        // We need to delay slightly the removal to let codemirror properly initialize
        requestAnimationFrame(() => {
          this.layout.removeWidget(cell);
        });
      }
    }
  }

  /**
   * Adds a message to the notebook as a header.
   */
  protected addHeader(): void {
    const trans = this.translator.load('jupyterlab');
    const info = new Widget();
    info.node.textContent = trans.__(
      'The notebook is empty. Click the + button on the toolbar to add a new cell.'
    );
    (this.layout as NotebookWindowedLayout).header = info;
  }

  /**
   * Removes the header.
   */
  protected removeHeader(): void {
    (this.layout as NotebookWindowedLayout).header?.dispose();
    (this.layout as NotebookWindowedLayout).header = null;
  }

  /**
   * Handle a new model.
   *
   * #### Notes
   * This method is called after the model change has been handled
   * internally and before the `modelChanged` signal is emitted.
   * The default implementation is a no-op.
   */
  protected onModelChanged(
    oldValue: INotebookModel | null,
    newValue: INotebookModel | null
  ): void {
    // No-op.
  }

  /**
   * Handle changes to the notebook model content.
   *
   * #### Notes
   * The default implementation emits the `modelContentChanged` signal.
   */
  protected onModelContentChanged(model: INotebookModel, args: void): void {
    this._modelContentChanged.emit(void 0);
  }

  /**
   * Handle changes to the notebook model metadata.
   *
   * #### Notes
   * The default implementation updates the mimetypes of the code cells
   * when the `language_info` metadata changes.
   */
  protected onMetadataChanged(sender: INotebookModel, args: IMapChange): void {
    switch (args.key) {
      case 'language_info':
        this._updateMimetype();
        break;
      default:
        break;
    }
  }

  /**
   * Handle a cell being inserted.
   *
   * The default implementation is a no-op
   */
  protected onCellInserted(index: number, cell: Cell): void {
    // This is a no-op.
  }

  /**
   * Handle a cell being removed.
   *
   * The default implementation is a no-op
   */
  protected onCellRemoved(index: number, cell: Cell): void {
    // This is a no-op.
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   *
   * #### Notes
   * The default implementation of this handler is a no-op.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.notebookConfig.windowingMode === 'defer') {
      void this._runOnIdleTime();
    } else {
      super.onUpdateRequest(msg);
    }
  }

  /**
   * Handle a new model on the widget.
   */
  private _onModelChanged(
    oldValue: INotebookModel | null,
    newValue: INotebookModel | null
  ): void {
    if (oldValue) {
      oldValue.contentChanged.disconnect(this.onModelContentChanged, this);
      oldValue.metadataChanged.disconnect(this.onMetadataChanged, this);
      oldValue.cells.changed.disconnect(this._onCellsChanged, this);
      while (this.cellsArray.length) {
        this._removeCell(0);
      }
    }
    if (!newValue) {
      this._mimetype = IEditorMimeTypeService.defaultMimeType;
      return;
    }
    this._updateMimetype();
    const cells = newValue.cells;
    const collab = newValue.collaborative ?? false;
    if (!collab && !cells.length) {
      newValue.sharedModel.insertCell(0, {
        cell_type: this.notebookConfig.defaultCell,
        metadata:
          this.notebookConfig.defaultCell === 'code'
            ? {
                // This is an empty cell created in empty notebook, thus is trusted
                trusted: true
              }
            : {}
      });
    }
    let index = -1;
    for (const cell of cells) {
      this._insertCell(++index, cell);
    }
    newValue.cells.changed.connect(this._onCellsChanged, this);
    newValue.metadataChanged.connect(this.onMetadataChanged, this);
    newValue.contentChanged.connect(this.onModelContentChanged, this);
  }

  /**
   * Handle a change cells event.
   */
  protected _onCellsChanged(
    sender: CellList,
    args: IObservableList.IChangedArgs<ICellModel>
  ): void {
    this.removeHeader();
    switch (args.type) {
      case 'add': {
        let index = 0;
        index = args.newIndex;
        for (const value of args.newValues) {
          this._insertCell(index++, value);
        }
        this._updateDataWindowedListIndex(
          args.newIndex,
          this.model!.cells.length,
          args.newValues.length
        );
        break;
      }
      case 'remove':
        for (let length = args.oldValues.length; length > 0; length--) {
          this._removeCell(args.oldIndex);
        }
        this._updateDataWindowedListIndex(
          args.oldIndex,
          this.model!.cells.length + args.oldValues.length,
          -1 * args.oldValues.length
        );
        // Add default cell if there are no cells remaining.
        if (!sender.length) {
          const model = this.model;
          // Add the cell in a new context to avoid triggering another
          // cell changed event during the handling of this signal.
          requestAnimationFrame(() => {
            if (model && !model.isDisposed && !model.sharedModel.cells.length) {
              model.sharedModel.insertCell(0, {
                cell_type: this.notebookConfig.defaultCell,
                metadata:
                  this.notebookConfig.defaultCell === 'code'
                    ? {
                        // This is an empty cell created in empty notebook, thus is trusted
                        trusted: true
                      }
                    : {}
              });
            }
          });
        }
        break;
      default:
        return;
    }

    if (!this.model!.sharedModel.cells.length) {
      this.addHeader();
    }

    this.update();
  }

  /**
   * Create a cell widget and insert into the notebook.
   */
  private _insertCell(index: number, cell: ICellModel): void {
    let widget: Cell;
    switch (cell.type) {
      case 'code':
        widget = this._createCodeCell(cell as ICodeCellModel);
        widget.model.mimeType = this._mimetype;
        break;
      case 'markdown':
        widget = this._createMarkdownCell(cell as IMarkdownCellModel);
        if (cell.sharedModel.getSource() === '') {
          (widget as MarkdownCell).rendered = false;
        }
        break;
      default:
        widget = this._createRawCell(cell as IRawCellModel);
    }
    widget.inViewportChanged.connect(this._onCellInViewportChanged, this);
    widget.addClass(NB_CELL_CLASS);

    ArrayExt.insert(this.cellsArray, index, widget);
    this.onCellInserted(index, widget);

    this._scheduleCellRenderOnIdle();
  }

  /**
   * Create a code cell widget from a code cell model.
   */
  private _createCodeCell(model: ICodeCellModel): CodeCell {
    const rendermime = this.rendermime;
    const contentFactory = this.contentFactory;
    const editorConfig = this.editorConfig.code;
    const options: CodeCell.IOptions = {
      contentFactory,
      editorConfig,
      inputHistoryScope: this.notebookConfig.inputHistoryScope,
      showInputPlaceholder: this.notebookConfig.showInputPlaceholder,
      maxNumberOutputs: this.notebookConfig.maxNumberOutputs,
      model,
      placeholder: this._notebookConfig.windowingMode !== 'none',
      rendermime,
      translator: this.translator
    };
    const cell = this.contentFactory.createCodeCell(options);
    cell.syncCollapse = true;
    cell.syncEditable = true;
    cell.syncScrolled = true;
    cell.outputArea.inputRequested.connect((_, stdin) => {
      this._onInputRequested(cell).catch(reason => {
        console.error('Failed to scroll to cell requesting input.', reason);
      });
      stdin.disposed.connect(() => {
        // The input field is removed from the DOM after the user presses Enter.
        // This causes focus to be lost if we don't explicitly re-focus
        // somewhere else.
        cell.node.focus();
      });
    });
    return cell;
  }

  /**
   * Create a markdown cell widget from a markdown cell model.
   */
  private _createMarkdownCell(model: IMarkdownCellModel): MarkdownCell {
    const rendermime = this.rendermime;
    const contentFactory = this.contentFactory;
    const editorConfig = this.editorConfig.markdown;
    const options: MarkdownCell.IOptions = {
      contentFactory,
      editorConfig,
      model,
      placeholder: this._notebookConfig.windowingMode !== 'none',
      rendermime,
      showEditorForReadOnlyMarkdown:
        this._notebookConfig.showEditorForReadOnlyMarkdown
    };
    const cell = this.contentFactory.createMarkdownCell(options);
    cell.syncCollapse = true;
    cell.syncEditable = true;
    // Connect collapsed signal for each markdown cell widget
    cell.headingCollapsedChanged.connect(this._onCellCollapsed, this);
    return cell;
  }

  /**
   * Create a raw cell widget from a raw cell model.
   */
  private _createRawCell(model: IRawCellModel): RawCell {
    const contentFactory = this.contentFactory;
    const editorConfig = this.editorConfig.raw;
    const options: RawCell.IOptions = {
      editorConfig,
      model,
      contentFactory,
      placeholder: this._notebookConfig.windowingMode !== 'none'
    };
    const cell = this.contentFactory.createRawCell(options);
    cell.syncCollapse = true;
    cell.syncEditable = true;
    return cell;
  }

  /**
   * Remove a cell widget.
   */
  private _removeCell(index: number): void {
    const widget = this.cellsArray[index];
    widget.parent = null;
    ArrayExt.removeAt(this.cellsArray, index);
    this.onCellRemoved(index, widget);
    widget.dispose();
  }

  /**
   * Update the mimetype of the notebook.
   */
  private _updateMimetype(): void {
    const info = this._notebookModel?.getMetadata('language_info');
    if (!info) {
      return;
    }
    this._mimetype = this._mimetypeService.getMimeTypeByLanguage(info);
    for (const widget of this.widgets) {
      if (widget.model.type === 'code') {
        widget.model.mimeType = this._mimetype;
      }
    }
  }

  /**
   * Callback when a cell collapsed status changes.
   *
   * @param cell Cell changed
   * @param collapsed New collapsed status
   */
  private _onCellCollapsed(cell: Cell, collapsed: boolean): void {
    NotebookActions.setHeadingCollapse(cell, collapsed, this);
    this._cellCollapsed.emit(cell);
  }

  /**
   * Callback when a cell viewport status changes.
   *
   * @param cell Cell changed
   */
  private _onCellInViewportChanged(cell: Cell): void {
    this._cellInViewportChanged.emit(cell);
  }

  /**
   * Ensure to load in the DOM a cell requesting an user input
   *
   * @param cell Cell requesting an input
   */
  private async _onInputRequested(cell: Cell): Promise<void> {
    if (!cell.inViewport) {
      const cellIndex = this.widgets.findIndex(c => c === cell);
      if (cellIndex >= 0) {
        await this.scrollToItem(cellIndex);

        const inputEl = cell.node.querySelector('.jp-Stdin');
        if (inputEl) {
          ElementExt.scrollIntoViewIfNeeded(this.node, inputEl);
          (inputEl as HTMLElement).focus();
        }
      }
    }
  }

  private _scheduleCellRenderOnIdle() {
    if (this.notebookConfig.windowingMode !== 'none' && !this.isDisposed) {
      if (!this._idleCallBack) {
        this._idleCallBack = requestIdleCallback(
          (deadline: IdleDeadline) => {
            this._idleCallBack = null;

            // In case of timeout, render for some time even if it means freezing the UI
            // This avoids the cells to never be loaded.
            void this._runOnIdleTime(
              deadline.didTimeout
                ? MAXIMUM_TIME_REMAINING
                : deadline.timeRemaining()
            );
          },
          {
            timeout: 3000
          }
        );
      }
    }
  }

  private _updateDataWindowedListIndex(
    start: number,
    end: number,
    delta: number
  ): void {
    for (
      let cellIdx = 0;
      cellIdx < this.viewportNode.childElementCount;
      cellIdx++
    ) {
      const cell = this.viewportNode.children[cellIdx];
      const globalIndex = parseInt(
        (cell as HTMLElement).dataset.windowedListIndex!,
        10
      );
      if (globalIndex >= start && globalIndex < end) {
        (cell as HTMLElement).dataset.windowedListIndex = `${
          globalIndex + delta
        }`;
      }
    }
  }

  /**
   * Update editor settings for notebook cells.
   */
  private _updateEditorConfig() {
    for (let i = 0; i < this.widgets.length; i++) {
      const cell = this.widgets[i];
      let config: Record<string, any> = {};
      switch (cell.model.type) {
        case 'code':
          config = this._editorConfig.code;
          break;
        case 'markdown':
          config = this._editorConfig.markdown;
          break;
        default:
          config = this._editorConfig.raw;
          break;
      }
      cell.updateEditorConfig({ ...config });
    }
  }

  private async _runOnIdleTime(
    remainingTime: number = MAXIMUM_TIME_REMAINING
  ): Promise<void> {
    const startTime = Date.now();
    let cellIdx = 0;
    while (
      Date.now() - startTime < remainingTime &&
      cellIdx < this.cellsArray.length
    ) {
      const cell = this.cellsArray[cellIdx];
      if (cell.isPlaceholder()) {
        if (['defer', 'full'].includes(this.notebookConfig.windowingMode)) {
          await this._updateForDeferMode(cell, cellIdx);
          if (this.notebookConfig.windowingMode === 'full') {
            // We need to delay slightly the removal to let codemirror properly initialize
            requestAnimationFrame(() => {
              this.viewModel.setEstimatedWidgetSize(
                cell.model.id,
                cell.node.getBoundingClientRect().height
              );
              this.layout.removeWidget(cell);
            });
          }
        }
      }
      cellIdx++;
    }

    // If the notebook is not fully rendered
    if (cellIdx < this.cellsArray.length) {
      // If we are deferring the cell rendering and the rendered cells do
      // not fill the viewport yet
      if (
        this.notebookConfig.windowingMode === 'defer' &&
        this.viewportNode.clientHeight < this.node.clientHeight
      ) {
        // Spend more time rendering cells to fill the viewport
        await this._runOnIdleTime();
      } else {
        this._scheduleCellRenderOnIdle();
      }
    } else {
      if (this._idleCallBack) {
        window.cancelIdleCallback(this._idleCallBack);
        this._idleCallBack = null;
      }
    }
  }

  private async _updateForDeferMode(
    cell: Cell<ICellModel>,
    cellIdx: number
  ): Promise<void> {
    cell.dataset.windowedListIndex = `${cellIdx}`;
    this.layout.insertWidget(cellIdx, cell);
    await cell.ready;
  }

  /**
   * Apply updated notebook settings.
   */
  private _updateNotebookConfig() {
    // Apply scrollPastEnd setting.
    this.toggleClass(
      'jp-mod-scrollPastEnd',
      this._notebookConfig.scrollPastEnd
    );
    // Control visibility of heading collapser UI
    this.toggleClass(
      HEADING_COLLAPSER_VISBILITY_CONTROL_CLASS,
      this._notebookConfig.showHiddenCellsButton
    );
    // Control editor visibility for read-only Markdown cells
    const showEditorForReadOnlyMarkdown =
      this._notebookConfig.showEditorForReadOnlyMarkdown;
    if (showEditorForReadOnlyMarkdown !== undefined) {
      for (const cell of this.cellsArray) {
        if (cell.model.type === 'markdown') {
          (cell as MarkdownCell).showEditorForReadOnly =
            showEditorForReadOnlyMarkdown;
        }
      }
    }

    this.viewModel.windowingActive =
      this._notebookConfig.windowingMode === 'full';
  }

  protected cellsArray: Array<Cell>;

  private _cellCollapsed = new Signal<this, Cell>(this);
  private _cellInViewportChanged = new Signal<this, Cell>(this);
  private _editorConfig: StaticNotebook.IEditorConfig;
  private _idleCallBack: number | null;
  private _mimetype: string;
  private _mimetypeService: IEditorMimeTypeService;
  readonly kernelHistory: INotebookHistory | undefined;
  private _modelChanged: Signal<this, void>;
  private _modelContentChanged: Signal<this, void>;
  private _notebookConfig: StaticNotebook.INotebookConfig;
  private _notebookModel: INotebookModel | null;
  private _renderingLayout: RenderingLayout | undefined;
  private _renderingLayoutChanged = new Signal<this, RenderingLayout>(this);
}

/**
 * The namespace for the `StaticNotebook` class statics.
 */
export namespace StaticNotebook {
  /**
   * An options object for initializing a static notebook.
   */
  export interface IOptions {
    /**
     * The rendermime instance used by the widget.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * A factory for creating content.
     */
    contentFactory: IContentFactory;

    /**
     * A configuration object for the cell editor settings.
     */
    editorConfig?: IEditorConfig;

    /**
     * A configuration object for notebook settings.
     */
    notebookConfig?: INotebookConfig;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * The kernel history retrieval object
     */
    kernelHistory?: INotebookHistory;

    /**
     * The renderer used by the underlying windowed list.
     */
    renderer?: WindowedList.IRenderer;
  }

  /**
   * A factory for creating notebook content.
   *
   * #### Notes
   * This extends the content factory of the cell itself, which extends the content
   * factory of the output area and input area. The result is that there is a single
   * factory for creating all child content of a notebook.
   */
  export interface IContentFactory extends Cell.IContentFactory {
    /**
     * Create a new code cell widget.
     */
    createCodeCell(options: CodeCell.IOptions): CodeCell;

    /**
     * Create a new markdown cell widget.
     */
    createMarkdownCell(options: MarkdownCell.IOptions): MarkdownCell;

    /**
     * Create a new raw cell widget.
     */
    createRawCell(options: RawCell.IOptions): RawCell;
  }

  /**
   * A config object for the cell editors.
   */
  export interface IEditorConfig {
    /**
     * Config options for code cells.
     */
    readonly code: Record<string, any>;
    /**
     * Config options for markdown cells.
     */
    readonly markdown: Record<string, any>;
    /**
     * Config options for raw cells.
     */
    readonly raw: Record<string, any>;
  }

  /**
   * Default configuration options for cell editors.
   */
  export const defaultEditorConfig: IEditorConfig = {
    code: {
      lineNumbers: false,
      lineWrap: false,
      matchBrackets: true,
      tabFocusable: false
    },
    markdown: {
      lineNumbers: false,
      lineWrap: true,
      matchBrackets: false,
      tabFocusable: false
    },
    raw: {
      lineNumbers: false,
      lineWrap: true,
      matchBrackets: false,
      tabFocusable: false
    }
  };

  /**
   * A config object for the notebook widget
   */
  export interface INotebookConfig {
    /**
     * The default type for new notebook cells.
     */
    defaultCell: nbformat.CellType;

    /**
     * Defines if the document can be undo/redo.
     */
    disableDocumentWideUndoRedo: boolean;

    /**
     * Whether to display notification if code cell is run while kernel is still initializing.
     */
    enableKernelInitNotification: boolean;

    /**
     * Defines the maximum number of outputs per cell.
     */
    maxNumberOutputs: number;

    /**
     * Show placeholder text for standard input
     */
    showInputPlaceholder: boolean;

    /**
     * Whether to split stdin line history by kernel session or keep globally accessible.
     */
    inputHistoryScope: 'global' | 'session';

    /**
     * Number of cells to render in addition to those
     * visible in the viewport.
     *
     * ### Notes
     * In 'full' windowing mode, this is the number of cells above and below the
     * viewport.
     * In 'defer' windowing mode, this is the number of cells to render initially
     * in addition to the one of the viewport.
     */
    overscanCount: number;

    /**
     * Should timing be recorded in metadata
     */
    recordTiming: boolean;

    /**
     * Defines the rendering layout to use.
     */
    renderingLayout: RenderingLayout;

    /**
     * Automatically render markdown when the cursor leaves a markdown cell
     */
    autoRenderMarkdownCells: boolean;

    /**
     * Enable scrolling past the last cell
     */
    scrollPastEnd: boolean;

    /**
     * Show hidden cells button if collapsed
     */
    showHiddenCellsButton: boolean;

    /**
     * Should an editor be shown for read-only markdown
     */
    showEditorForReadOnlyMarkdown?: boolean;

    /**
     * Override the side-by-side left margin.
     */
    sideBySideLeftMarginOverride: string;

    /**
     * Override the side-by-side right margin.
     */
    sideBySideRightMarginOverride: string;

    /**
     * Side-by-side output ratio.
     */
    sideBySideOutputRatio: number;

    /**
     * Windowing mode
     *
     * - 'defer': Wait for idle CPU cycles to attach out of viewport cells
     * - 'full': Attach to the DOM only cells in viewport
     * - 'none': Attach all cells to the viewport
     */
    windowingMode: 'defer' | 'full' | 'none';
    accessKernelHistory?: boolean;
  }

  /**
   * Default configuration options for notebooks.
   */
  export const defaultNotebookConfig: INotebookConfig = {
    enableKernelInitNotification: false,
    showHiddenCellsButton: true,
    scrollPastEnd: true,
    defaultCell: 'code',
    recordTiming: false,
    inputHistoryScope: 'global',
    maxNumberOutputs: 50,
    showEditorForReadOnlyMarkdown: true,
    disableDocumentWideUndoRedo: true,
    autoRenderMarkdownCells: false,
    renderingLayout: 'default',
    sideBySideLeftMarginOverride: '10px',
    sideBySideRightMarginOverride: '10px',
    sideBySideOutputRatio: 1,
    overscanCount: 1,
    windowingMode: 'full',
    accessKernelHistory: false,
    showInputPlaceholder: true
  };

  /**
   * The default implementation of an `IContentFactory`.
   */
  export class ContentFactory
    extends Cell.ContentFactory
    implements IContentFactory
  {
    /**
     * Create a new code cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createCodeCell(options: CodeCell.IOptions): CodeCell {
      return new CodeCell(options).initializeState();
    }

    /**
     * Create a new markdown cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createMarkdownCell(options: MarkdownCell.IOptions): MarkdownCell {
      return new MarkdownCell(options).initializeState();
    }

    /**
     * Create a new raw cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createRawCell(options: RawCell.IOptions): RawCell {
      return new RawCell(options).initializeState();
    }
  }

  /**
   * A namespace for the static notebook content factory.
   */
  export namespace ContentFactory {
    /**
     * Options for the content factory.
     */
    export interface IOptions extends Cell.ContentFactory.IOptions {}
  }
}

/**
 * A virtual scrollbar item representing a notebook cell.
 */
class ScrollbarItem implements WindowedList.IRenderer.IScrollbarItem {
  /**
   * Construct a scrollbar item.
   */
  constructor(options: { notebook: Notebook; model: ICellModel }) {
    // Note: there should be no DOM operations in the constructor
    this._model = options.model;
    this._notebook = options.notebook;
  }

  /**
   * Render the scrollbar item as an HTML element.
   */
  render = (props: { index: number }) => {
    if (!this._element) {
      this._element = this._createElement();
      this._notebook.activeCellChanged.connect(this._updateActive);
      this._notebook.selectionChanged.connect(this._updateSelection);
      if (this._model.type === 'code') {
        const model = this._model as ICodeCellModel;
        model.outputs.changed.connect(this._updatePrompt);
        model.stateChanged.connect(this._updateState);
      }
    }
    // Add cell type (code/markdown/raw)
    if (this._model.type != this._element.dataset.type) {
      this._element.dataset.type = this._model.type;
    }
    const source = this._model.sharedModel.source;
    const trimmedSource =
      source.length > 10000 ? source.substring(0, 10000) : source;
    if (trimmedSource !== this._source.textContent) {
      this._source.textContent = trimmedSource;
    }

    this._updateActive();
    this._updateSelection();
    this._updatePrompt();
    this._updateDirty();
    return this._element;
  };

  /**
   * Unique item key used for caching.
   */
  get key(): string {
    return this._model.id;
  }

  /**
   * Test whether the item has been disposed.
   */
  get isDisposed(): boolean {
    // Ensure the state is up-to-date in case if the model was disposed
    // (the model can be disposed when cells are moved/recreated).
    if (!this._isDisposed && this._model.isDisposed) {
      this.dispose();
    }
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the item.
   */
  dispose = () => {
    this._isDisposed = true;
    this._notebook.activeCellChanged.disconnect(this._updateActive);
    this._notebook.selectionChanged.disconnect(this._updateSelection);
    if (this._model.type === 'code') {
      const model = this._model as ICodeCellModel;
      if (model.outputs) {
        model.outputs.changed.disconnect(this._updatePrompt);
        model.stateChanged.disconnect(this._updateState);
      }
    }
  };

  private _updateState = (
    _: ICellModel,
    change: IChangedArgs<
      any,
      any,
      'trusted' | 'isDirty' | 'executionCount' | 'executionState'
    >
  ) => {
    switch (change.name) {
      case 'executionCount':
      case 'executionState':
        this._updatePrompt();
        break;
      case 'isDirty': {
        this._updateDirty();
        break;
      }
    }
  };

  private _updateDirty() {
    if (this._model.type !== 'code' || !this._element) {
      return;
    }
    const model = this._model as ICodeCellModel;
    const wasDirty = this._element.classList.contains(DIRTY_CLASS);
    if (wasDirty !== model.isDirty) {
      if (model.isDirty) {
        this._element.classList.add(DIRTY_CLASS);
      } else {
        this._element.classList.remove(DIRTY_CLASS);
      }
    }
  }

  private _updatePrompt = () => {
    if (this._model.type !== 'code') {
      return;
    }
    const model = this._model as ICodeCellModel;
    let hasError = false;
    for (let i = 0; i < model.outputs.length; i++) {
      const output = model.outputs.get(i);
      if (output.type === 'error') {
        hasError = true;
        break;
      }
    }
    let content: string;
    let state: string = '';
    if (hasError) {
      content = '[!]';
      state = 'error';
    } else if (model.executionState == 'running') {
      content = '[*]';
    } else if (model.executionCount) {
      content = `[${model.executionCount}]`;
    } else {
      content = '[ ]';
    }
    if (this._executionIndicator.textContent !== content) {
      this._executionIndicator.textContent = content;
    }
    if (this._element!.dataset.output !== state) {
      this._element!.dataset.output = state;
    }
  };

  private _createElement() {
    const li = document.createElement('li');
    const executionIndicator = (this._executionIndicator =
      document.createElement('div'));
    executionIndicator.className = 'jp-scrollbarItem-executionIndicator';
    const source = (this._source = document.createElement('div'));
    source.className = 'jp-scrollbarItem-source';
    li.append(executionIndicator);
    li.append(source);
    return li;
  }
  private _executionIndicator: HTMLElement;
  private _source: HTMLElement;

  private _updateActive = () => {
    if (!this._element) {
      this._element = this._createElement();
    }
    const li = this._element;
    const wasActive = li.classList.contains(ACTIVE_CLASS);
    if (this._notebook.activeCell?.model === this._model) {
      if (!wasActive) {
        li.classList.add(ACTIVE_CLASS);
      }
    } else if (wasActive) {
      li.classList.remove(ACTIVE_CLASS);
      // Needed due to order in which selection and active changed signals fire
      li.classList.remove(SELECTED_CLASS);
    }
  };

  private _updateSelection = () => {
    if (!this._element) {
      this._element = this._createElement();
    }
    const li = this._element;
    const wasSelected = li.classList.contains(SELECTED_CLASS);
    if (this._notebook.selectedCells.some(cell => this._model === cell.model)) {
      if (!wasSelected) {
        li.classList.add(SELECTED_CLASS);
      }
    } else if (wasSelected) {
      li.classList.remove(SELECTED_CLASS);
    }
  };

  private _model: ICellModel;
  private _notebook: Notebook;
  private _isDisposed: boolean = false;
  private _element: HTMLElement | null = null;
}

/**
 * A notebook widget that supports interactivity.
 */
export class Notebook extends StaticNotebook {
  /**
   * Construct a notebook widget.
   */
  constructor(options: Notebook.IOptions) {
    super({
      renderer: {
        createOuter(): HTMLElement {
          return document.createElement('div');
        },

        createViewport(): HTMLElement {
          const el = document.createElement('div');
          el.setAttribute('role', 'feed');
          el.setAttribute('aria-label', 'Cells');
          return el;
        },

        createScrollbar(): HTMLOListElement {
          return document.createElement('ol');
        },

        createScrollbarViewportIndicator(): HTMLElement {
          return document.createElement('div');
        },

        createScrollbarItem(
          notebook: Notebook,
          _index: number,
          model: ICellModel
        ): WindowedList.IRenderer.IScrollbarItem {
          return new ScrollbarItem({
            notebook,
            model
          });
        }
      },
      ...options
    });
    // Allow the node to scroll while dragging items.
    this.outerNode.setAttribute('data-lm-dragscroll', 'true');
    this.activeCellChanged.connect(this._updateSelectedCells, this);
    this.jumped.connect((_, index: number) => (this.activeCellIndex = index));
    this.selectionChanged.connect(this._updateSelectedCells, this);

    this.addFooter();
  }

  /**
   * List of selected and active cells
   */
  get selectedCells(): Cell[] {
    return this._selectedCells;
  }

  /**
   * Adds a footer to the notebook.
   */
  protected addFooter(): void {
    const info = new NotebookFooter(this);
    (this.layout as NotebookWindowedLayout).footer = info;
  }

  /**
   * Handle a change cells event.
   */
  protected _onCellsChanged(
    sender: CellList,
    args: IObservableList.IChangedArgs<ICellModel>
  ): void {
    const activeCellId = this.activeCell?.model.id;
    super._onCellsChanged(sender, args);
    if (activeCellId) {
      const newActiveCellIndex = this.model?.sharedModel.cells.findIndex(
        cell => cell.getId() === activeCellId
      );
      if (newActiveCellIndex != null) {
        this.activeCellIndex = newActiveCellIndex;
      }
    }
  }

  /**
   * A signal emitted when the active cell changes.
   *
   * #### Notes
   * This can be due to the active index changing or the
   * cell at the active index changing.
   */
  get activeCellChanged(): ISignal<this, Cell | null> {
    return this._activeCellChanged;
  }

  /**
   * A signal emitted when the state of the notebook changes.
   */
  get stateChanged(): ISignal<this, IChangedArgs<any>> {
    return this._stateChanged;
  }

  /**
   * A signal emitted when the selection state of the notebook changes.
   */
  get selectionChanged(): ISignal<this, void> {
    return this._selectionChanged;
  }

  /**
   * The interactivity mode of the notebook.
   */
  get mode(): NotebookMode {
    return this._mode;
  }
  set mode(newValue: NotebookMode) {
    this.setMode(newValue);
  }

  /**
   * Set the notebook mode.
   *
   * @param newValue Notebook mode
   * @param options Control mode side-effect
   * @param options.focus Whether to ensure focus (default) or not when setting the mode.
   */
  protected setMode(
    newValue: NotebookMode,
    options: { focus?: boolean } = {}
  ): void {
    const setFocus = options.focus ?? true;
    const activeCell = this.activeCell;
    if (!activeCell) {
      newValue = 'command';
    }
    if (newValue === this._mode) {
      if (setFocus) {
        this._ensureFocus();
      }
      return;
    }
    // Post an update request.
    this.update();
    const oldValue = this._mode;
    this._mode = newValue;

    if (newValue === 'edit') {
      // Edit mode deselects all cells.
      for (const widget of this.widgets) {
        this.deselect(widget);
      }
      // Edit mode unrenders an active markdown widget.
      if (activeCell instanceof MarkdownCell) {
        activeCell.rendered = false;
      }
      activeCell!.inputHidden = false;
    } else {
      if (setFocus) {
        void NotebookActions.focusActiveCell(this, {
          // Do not await the active cell because that creates a bug. If the user
          // is editing a code cell and presses Accel Shift C to open the command
          // palette, then the command palette opens before
          // activeCell.node.focus() is called, which closes the command palette.
          // To the end user, it looks as if all the keyboard shortcut did was
          // move focus from the cell editor to the cell as a whole.
          waitUntilReady: false,
          preventScroll: true
        });
      }
    }
    this._stateChanged.emit({ name: 'mode', oldValue, newValue });
    if (setFocus) {
      this._ensureFocus();
    }
  }

  /**
   * The active cell index of the notebook.
   *
   * #### Notes
   * The index will be clamped to the bounds of the notebook cells.
   */
  get activeCellIndex(): number {
    if (!this.model) {
      return -1;
    }
    return this.widgets.length ? this._activeCellIndex : -1;
  }
  set activeCellIndex(newValue: number) {
    const oldValue = this._activeCellIndex;
    if (!this.model || !this.widgets.length) {
      newValue = -1;
    } else {
      newValue = Math.max(newValue, 0);
      newValue = Math.min(newValue, this.widgets.length - 1);
    }

    this._activeCellIndex = newValue;
    const oldCell = this.widgets[oldValue] ?? null;
    const cell = this.widgets[newValue] ?? null;
    (this.layout as NotebookWindowedLayout).activeCell = cell;
    const cellChanged = cell !== this._activeCell;
    if (cellChanged) {
      // Post an update request.
      this.update();
      this._activeCell = cell;
    }

    if (cellChanged || newValue != oldValue) {
      this._activeCellChanged.emit(cell);
    }

    if (this.mode === 'edit') {
      if (cell instanceof MarkdownCell) {
        cell.rendered = false;
      }
      if (
        this.notebookConfig.autoRenderMarkdownCells &&
        cellChanged &&
        oldCell instanceof MarkdownCell
      ) {
        oldCell.rendered = true;
      }
    }

    this._ensureFocus();
    if (newValue === oldValue) {
      return;
    }
    this._trimSelections();
    this._stateChanged.emit({ name: 'activeCellIndex', oldValue, newValue });
  }

  /**
   * Get the active cell widget.
   *
   * #### Notes
   * This is a cell or `null` if there is no active cell.
   */
  get activeCell(): Cell | null {
    return this._activeCell;
  }

  get lastClipboardInteraction(): 'copy' | 'cut' | 'paste' | null {
    return this._lastClipboardInteraction;
  }
  set lastClipboardInteraction(newValue: 'copy' | 'cut' | 'paste' | null) {
    this._lastClipboardInteraction = newValue;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._activeCell = null;
    super.dispose();
  }

  /**
   * Move cells preserving widget view state.
   *
   * #### Notes
   * This is required because at the model level a move is a deletion
   * followed by an insertion. Hence the view state is not preserved.
   *
   * @param from The index of the cell to move
   * @param to The new index of the cell
   * @param n Number of cells to move
   */
  moveCell(from: number, to: number, n = 1): void {
    // Save active cell id to be restored
    const newActiveCellIndex =
      from <= this.activeCellIndex && this.activeCellIndex < from + n
        ? this.activeCellIndex + to - from - (from > to ? 0 : n - 1)
        : -1;
    const isSelected = this.widgets
      .slice(from, from + n)
      .map(w => this.isSelected(w));

    super.moveCell(from, to, n);

    if (newActiveCellIndex >= 0) {
      this.activeCellIndex = newActiveCellIndex;
    }
    if (from > to) {
      isSelected.forEach((selected, idx) => {
        if (selected) {
          this.select(this.widgets[to + idx]);
        }
      });
    } else {
      isSelected.forEach((selected, idx) => {
        if (selected) {
          this.select(this.widgets[to - n + 1 + idx]);
        }
      });
    }
  }

  /**
   * Select a cell widget.
   *
   * #### Notes
   * It is a no-op if the value does not change.
   * It will emit the `selectionChanged` signal.
   */
  select(widget: Cell): void {
    if (Private.selectedProperty.get(widget)) {
      return;
    }
    Private.selectedProperty.set(widget, true);
    this._selectionChanged.emit(void 0);
    this.update();
  }

  /**
   * Deselect a cell widget.
   *
   * #### Notes
   * It is a no-op if the value does not change.
   * It will emit the `selectionChanged` signal.
   */
  deselect(widget: Cell): void {
    if (!Private.selectedProperty.get(widget)) {
      return;
    }
    Private.selectedProperty.set(widget, false);
    this._selectionChanged.emit(void 0);
    this.update();
  }

  /**
   * Whether a cell is selected.
   */
  isSelected(widget: Cell): boolean {
    return Private.selectedProperty.get(widget);
  }

  /**
   * Whether a cell is selected or is the active cell.
   */
  isSelectedOrActive(widget: Cell): boolean {
    if (widget === this._activeCell) {
      return true;
    }
    return Private.selectedProperty.get(widget);
  }

  /**
   * Deselect all of the cells.
   */
  deselectAll(): void {
    let changed = false;
    for (const widget of this.widgets) {
      if (Private.selectedProperty.get(widget)) {
        changed = true;
      }
      Private.selectedProperty.set(widget, false);
    }
    if (changed) {
      this._selectionChanged.emit(void 0);
    }
    // Make sure we have a valid active cell.
    this.activeCellIndex = this.activeCellIndex; // eslint-disable-line
    this.update();
  }

  /**
   * Move the head of an existing contiguous selection to extend the selection.
   *
   * @param index - The new head of the existing selection.
   *
   * #### Notes
   * If there is no existing selection, the active cell is considered an
   * existing one-cell selection.
   *
   * If the new selection is a single cell, that cell becomes the active cell
   * and all cells are deselected.
   *
   * There is no change if there are no cells (i.e., activeCellIndex is -1).
   */
  extendContiguousSelectionTo(index: number): void {
    let { head, anchor } = this.getContiguousSelection();
    let i: number;

    // Handle the case of no current selection.
    if (anchor === null || head === null) {
      if (index === this.activeCellIndex) {
        // Already collapsed selection, nothing more to do.
        return;
      }

      // We will start a new selection below.
      head = this.activeCellIndex;
      anchor = this.activeCellIndex;
    }

    // Move the active cell. We do this before the collapsing shortcut below.
    this.activeCellIndex = index;

    // Make sure the index is valid, according to the rules for setting and clipping the
    // active cell index. This may change the index.
    index = this.activeCellIndex;

    // Collapse the selection if it is only the active cell.
    if (index === anchor) {
      this.deselectAll();
      return;
    }

    let selectionChanged = false;

    if (head < index) {
      if (head < anchor) {
        Private.selectedProperty.set(this.widgets[head], false);
        selectionChanged = true;
      }

      // Toggle everything strictly between head and index except anchor.
      for (i = head + 1; i < index; i++) {
        if (i !== anchor) {
          Private.selectedProperty.set(
            this.widgets[i],
            !Private.selectedProperty.get(this.widgets[i])
          );
          selectionChanged = true;
        }
      }
    } else if (index < head) {
      if (anchor < head) {
        Private.selectedProperty.set(this.widgets[head], false);
        selectionChanged = true;
      }

      // Toggle everything strictly between index and head except anchor.
      for (i = index + 1; i < head; i++) {
        if (i !== anchor) {
          Private.selectedProperty.set(
            this.widgets[i],
            !Private.selectedProperty.get(this.widgets[i])
          );
          selectionChanged = true;
        }
      }
    }

    // Anchor and index should *always* be selected.
    if (!Private.selectedProperty.get(this.widgets[anchor])) {
      selectionChanged = true;
    }
    Private.selectedProperty.set(this.widgets[anchor], true);

    if (!Private.selectedProperty.get(this.widgets[index])) {
      selectionChanged = true;
    }
    Private.selectedProperty.set(this.widgets[index], true);

    if (selectionChanged) {
      this._selectionChanged.emit(void 0);
    }
  }

  /**
   * Get the head and anchor of a contiguous cell selection.
   *
   * The head of a contiguous selection is always the active cell.
   *
   * If there are no cells selected, `{head: null, anchor: null}` is returned.
   *
   * Throws an error if the currently selected cells do not form a contiguous
   * selection.
   */
  getContiguousSelection():
    | { head: number; anchor: number }
    | { head: null; anchor: null } {
    const cells = this.widgets;
    const first = ArrayExt.findFirstIndex(cells, c => this.isSelected(c));

    // Return early if no cells are selected.
    if (first === -1) {
      return { head: null, anchor: null };
    }

    const last = ArrayExt.findLastIndex(
      cells,
      c => this.isSelected(c),
      -1,
      first
    );

    // Check that the selection is contiguous.
    for (let i = first; i <= last; i++) {
      if (!this.isSelected(cells[i])) {
        throw new Error('Selection not contiguous');
      }
    }

    // Check that the active cell is one of the endpoints of the selection.
    const activeIndex = this.activeCellIndex;
    if (first !== activeIndex && last !== activeIndex) {
      throw new Error('Active cell not at endpoint of selection');
    }

    // Determine the head and anchor of the selection.
    if (first === activeIndex) {
      return { head: first, anchor: last };
    } else {
      return { head: last, anchor: first };
    }
  }

  /**
   * Scroll so that the given cell is in view. Selects and activates cell.
   *
   * @param cell - A cell in the notebook widget.
   * @param align - Type of alignment.
   *
   */
  async scrollToCell(
    cell: Cell,
    align: WindowedList.ScrollToAlign = 'auto'
  ): Promise<void> {
    try {
      await this.scrollToItem(
        this.widgets.findIndex(c => c === cell),
        align
      );
    } catch (r) {
      //no-op
    }
    // change selection and active cell:
    this.deselectAll();
    this.select(cell);
    cell.activate();
  }

  private _parseFragment(fragment: string): Private.IFragmentData | undefined {
    const cleanedFragment = fragment.slice(1);

    if (!cleanedFragment) {
      // Bail early
      return;
    }

    const parts = cleanedFragment.split('=');
    if (parts.length === 1) {
      // Default to heading if no prefix is given.
      return {
        kind: 'heading',
        value: cleanedFragment
      };
    }
    return {
      kind: parts[0] as any,
      value: parts.slice(1).join('=')
    };
  }

  /**
   * Set URI fragment identifier.
   */
  async setFragment(fragment: string): Promise<void> {
    const parsedFragment = this._parseFragment(fragment);

    if (!parsedFragment) {
      // Bail early
      return;
    }

    let result;

    switch (parsedFragment.kind) {
      case 'heading':
        result = await this._findHeading(parsedFragment.value);
        break;
      case 'cell-id':
        result = this._findCellById(parsedFragment.value);
        break;
      default:
        console.warn(
          `Unknown target type for URI fragment ${fragment}, interpreting as a heading`
        );
        result = await this._findHeading(
          parsedFragment.kind + '=' + parsedFragment.value
        );
        break;
    }

    if (result == null) {
      return;
    }
    let { cell, element } = result;

    if (!cell.inViewport) {
      await this.scrollToCell(cell, 'center');
    }

    if (element == null) {
      element = cell.node;
    }
    const widgetBox = this.node.getBoundingClientRect();
    const elementBox = element.getBoundingClientRect();

    if (
      elementBox.top > widgetBox.bottom ||
      elementBox.bottom < widgetBox.top
    ) {
      element.scrollIntoView({ block: 'center' });
    }
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (!this.model) {
      return;
    }

    switch (event.type) {
      case 'contextmenu':
        if (event.eventPhase === Event.CAPTURING_PHASE) {
          this._evtContextMenuCapture(event as PointerEvent);
        }
        break;
      case 'mousedown':
        if (event.eventPhase === Event.CAPTURING_PHASE) {
          this._evtMouseDownCapture(event as MouseEvent);
        } else {
          // Skip processing the event when it resulted from a toolbar button click
          if (!event.defaultPrevented) {
            this._evtMouseDown(event as MouseEvent);
          }
        }
        break;
      case 'mouseup':
        if (event.currentTarget === document) {
          this._evtDocumentMouseup(event as MouseEvent);
        }
        break;
      case 'mousemove':
        if (event.currentTarget === document) {
          this._evtDocumentMousemove(event as MouseEvent);
        }
        break;
      case 'keydown':
        // This works because CodeMirror does not stop the event propagation
        this._ensureFocus(true);
        break;
      case 'dblclick':
        this._evtDblClick(event as MouseEvent);
        break;
      case 'focusin':
        this._evtFocusIn(event as MouseEvent);
        break;
      case 'focusout':
        this._evtFocusOut(event as MouseEvent);
        break;
      case 'lm-dragenter':
        this._evtDragEnter(event as Drag.Event);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as Drag.Event);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as Drag.Event);
        break;
      case 'lm-drop':
        this._evtDrop(event as Drag.Event);
        break;
      default:
        super.handleEvent(event);
        break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    const node = this.node;
    node.addEventListener('contextmenu', this, true);
    node.addEventListener('mousedown', this, true);
    node.addEventListener('mousedown', this);
    node.addEventListener('keydown', this);
    node.addEventListener('dblclick', this);

    node.addEventListener('focusin', this);
    node.addEventListener('focusout', this);
    // Capture drag events for the notebook widget
    // in order to preempt the drag/drop handlers in the
    // code editor widgets, which can take text data.
    node.addEventListener('lm-dragenter', this, true);
    node.addEventListener('lm-dragleave', this, true);
    node.addEventListener('lm-dragover', this, true);
    node.addEventListener('lm-drop', this, true);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('contextmenu', this, true);
    node.removeEventListener('mousedown', this, true);
    node.removeEventListener('mousedown', this);
    node.removeEventListener('keydown', this);
    node.removeEventListener('dblclick', this);
    node.removeEventListener('focusin', this);
    node.removeEventListener('focusout', this);
    node.removeEventListener('lm-dragenter', this, true);
    node.removeEventListener('lm-dragleave', this, true);
    node.removeEventListener('lm-dragover', this, true);
    node.removeEventListener('lm-drop', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    super.onBeforeAttach(msg);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this._checkCacheOnNextResize = true;
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    // TODO
    if (!this._checkCacheOnNextResize) {
      return super.onResize(msg);
    }
    super.onResize(msg);
    this._checkCacheOnNextResize = false;
    const cache = this._cellLayoutStateCache;
    const width = parseInt(this.node.style.width, 10);
    if (cache) {
      if (width === cache.width) {
        // Cache identical, do nothing
        return;
      }
    }
    // Update cache
    this._cellLayoutStateCache = { width };

    // Fallback:
    for (const w of this.widgets) {
      if (w instanceof Cell && w.inViewport) {
        w.editorWidget?.update();
      }
    }
  }

  /**
   * A message handler invoked on an `'before-hide'` message.
   */
  protected onBeforeHide(msg: Message): void {
    super.onBeforeHide(msg);
    // Update cache
    const width = parseInt(this.node.style.width, 10);
    this._cellLayoutStateCache = { width };
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this._ensureFocus(true);
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    const activeCell = this.activeCell;

    // Set the appropriate classes on the cells.
    if (this.mode === 'edit') {
      this.addClass(EDIT_CLASS);
      this.removeClass(COMMAND_CLASS);
    } else {
      this.addClass(COMMAND_CLASS);
      this.removeClass(EDIT_CLASS);
    }

    let count = 0;
    for (const widget of this.widgets) {
      // Set tabIndex to -1 to allow calling .focus() on cell without allowing
      // focus via tab key. This allows focus (document.activeElement) to move
      // up and down the document, cell by cell, when the user presses J/K or
      // ArrowDown/ArrowUp, but (unlike tabIndex = 0) does not add the notebook
      // cells (which could be numerous) to the set of nodes that the user would
      // have to visit when pressing the tab key to move about the UI.
      // NOTE: we need to be very careful to avoid modifying DOM to avoid triggering layout on scroll
      if (widget === activeCell) {
        activeCell.addClass(ACTIVE_CLASS);
        activeCell.addClass(SELECTED_CLASS);
        // Set tab index to 0 on the active cell so that if the user tabs away from
        // the notebook then tabs back, they will return to the cell where they
        // left off.
        activeCell.node.tabIndex = 0;
      } else {
        widget.node.tabIndex = -1;
        widget.removeClass(ACTIVE_CLASS);
        widget.removeClass(OTHER_SELECTED_CLASS);
      }

      if (this.isSelectedOrActive(widget)) {
        widget.addClass(SELECTED_CLASS);
        count++;
      } else {
        widget.removeClass(SELECTED_CLASS);
      }
    }

    if (activeCell && count > 1) {
      activeCell.addClass(OTHER_SELECTED_CLASS);
    }
  }

  /**
   * Handle a cell being inserted.
   */
  protected onCellInserted(index: number, cell: Cell): void {
    void cell.ready.then(() => {
      if (!cell.isDisposed) {
        cell.editor!.edgeRequested.connect(this._onEdgeRequest, this);
      }
    });
    cell.scrollRequested.connect((_emitter, scrollRequest) => {
      if (cell !== this.activeCell) {
        // Do nothing for cells other than the active cell
        // to avoid scroll requests from editor extensions
        // stealing user focus (this may be revisited).
        return;
      }
      if (!scrollRequest.defaultPrevented) {
        // Nothing to do if scroll request was already handled.
        return;
      }
      // Node which allows to scroll the notebook
      const scroller = this.outerNode;

      if (cell.inViewport) {
        // If cell got scrolled to the viewport in the meantime,
        // proceed with scrolling within the cell.
        return scrollRequest.scrollWithinCell({ scroller });
      }
      // If cell is not in the viewport and needs scrolling,
      // first scroll to the cell and then scroll within the cell.
      this.scrollToItem(this.activeCellIndex)
        .then(() => {
          void cell.ready.then(() => {
            scrollRequest.scrollWithinCell({ scroller });
          });
        })
        .catch(reason => {
          // no-op
        });
    });
    // If the insertion happened above, increment the active cell
    // index, otherwise it stays the same.
    this.activeCellIndex =
      index <= this.activeCellIndex
        ? this.activeCellIndex + 1
        : this.activeCellIndex;
  }

  /**
   * Handle a cell being removed.
   */
  protected onCellRemoved(index: number, cell: Cell): void {
    // If the removal happened above, decrement the active
    // cell index, otherwise it stays the same.
    this.activeCellIndex =
      index <= this.activeCellIndex
        ? this.activeCellIndex - 1
        : this.activeCellIndex;
    if (this.isSelected(cell)) {
      this._selectionChanged.emit(void 0);
    }
  }

  /**
   * Handle a new model.
   */
  protected onModelChanged(
    oldValue: INotebookModel,
    newValue: INotebookModel
  ): void {
    super.onModelChanged(oldValue, newValue);

    // Try to set the active cell index to 0.
    // It will be set to `-1` if there is no new model or the model is empty.
    this.activeCellIndex = 0;
  }

  /**
   * Handle edge request signals from cells.
   */
  private _onEdgeRequest(
    editor: CodeEditor.IEditor,
    location: CodeEditor.EdgeLocation
  ): void {
    const prev = this.activeCellIndex;
    if (location === 'top') {
      this.activeCellIndex--;
      // Move the cursor to the first position on the last line.
      if (this.activeCellIndex < prev) {
        const editor = this.activeCell!.editor;
        if (editor) {
          const lastLine = editor.lineCount - 1;
          editor.setCursorPosition({ line: lastLine, column: 0 });
        }
      }
    } else if (location === 'bottom') {
      this.activeCellIndex++;
      // Move the cursor to the first character.
      if (this.activeCellIndex > prev) {
        const editor = this.activeCell!.editor;
        if (editor) {
          editor.setCursorPosition({ line: 0, column: 0 });
        }
      }
    }
    this.mode = 'edit';
  }

  /**
   * Ensure that the notebook has proper focus.
   */
  private _ensureFocus(force = false): void {
    // No-op is the footer has the focus.
    const footer = (this.layout as NotebookWindowedLayout).footer;
    if (footer && document.activeElement === footer.node) {
      return;
    }
    const activeCell = this.activeCell;
    if (this.mode === 'edit' && activeCell) {
      // Test for !== true to cover hasFocus is false and editor is not yet rendered.
      if (activeCell.editor?.hasFocus() !== true) {
        if (activeCell.inViewport) {
          activeCell.editor?.focus();
        } else {
          this.scrollToItem(this.activeCellIndex)
            .then(() => {
              void activeCell.ready.then(() => {
                activeCell.editor?.focus();
              });
            })
            .catch(reason => {
              // no-op
            });
        }
      }
    }
    if (
      force &&
      activeCell &&
      !activeCell.node.contains(document.activeElement)
    ) {
      void NotebookActions.focusActiveCell(this, {
        preventScroll: true
      });
    }
  }

  /**
   * Find the cell index containing the target html element.
   *
   * #### Notes
   * Returns -1 if the cell is not found.
   */
  private _findCell(node: HTMLElement): number {
    // Trace up the DOM hierarchy to find the root cell node.
    // Then find the corresponding child and select it.
    let n: HTMLElement | null = node;
    while (n && n !== this.node) {
      if (n.classList.contains(NB_CELL_CLASS)) {
        const i = ArrayExt.findFirstIndex(
          this.widgets,
          widget => widget.node === n
        );
        if (i !== -1) {
          return i;
        }
        break;
      }
      n = n.parentElement;
    }
    return -1;
  }

  /**
   * Find the target of html mouse event and cell index containing this target.
   *
   * #### Notes
   * Returned index is -1 if the cell is not found.
   */
  private _findEventTargetAndCell(event: MouseEvent): [HTMLElement, number] {
    let target = event.target as HTMLElement;
    let index = this._findCell(target);
    if (index === -1) {
      // `event.target` sometimes gives an orphaned node in Firefox 57, which
      // can have `null` anywhere in its parent line. If we fail to find a cell
      // using `event.target`, try again using a target reconstructed from the
      // position of the click event.
      target = document.elementFromPoint(
        event.clientX,
        event.clientY
      ) as HTMLElement;
      index = this._findCell(target);
    }
    return [target, index];
  }

  /**
   * Find heading with given ID in any of the cells.
   */
  async _findHeading(queryId: string): Promise<Private.IScrollTarget | null> {
    // Loop on cells, get headings and search for first matching id.
    for (let cellIdx = 0; cellIdx < this.widgets.length; cellIdx++) {
      const cell = this.widgets[cellIdx];
      if (
        cell.model.type === 'raw' ||
        (cell.model.type === 'markdown' && !(cell as MarkdownCell).rendered)
      ) {
        // Bail early
        continue;
      }
      for (const heading of cell.headings) {
        let id: string | undefined | null = '';
        switch (heading.type) {
          case Cell.HeadingType.HTML:
            id = (heading as TableOfContentsUtils.IHTMLHeading).id;
            break;
          case Cell.HeadingType.Markdown:
            {
              const mdHeading =
                heading as any as TableOfContentsUtils.Markdown.IMarkdownHeading;
              id = await TableOfContentsUtils.Markdown.getHeadingId(
                this.rendermime.markdownParser!,
                mdHeading.raw,
                mdHeading.level,
                this.rendermime.sanitizer
              );
            }
            break;
        }
        if (id === queryId) {
          const element = this.node.querySelector(
            `h${heading.level}[id="${CSS.escape(id)}"]`
          ) as HTMLElement;

          return {
            cell,
            element
          };
        }
      }
    }
    return null;
  }

  /**
   * Find cell by its unique ID.
   */
  _findCellById(queryId: string): Private.IScrollTarget | null {
    for (let cellIdx = 0; cellIdx < this.widgets.length; cellIdx++) {
      const cell = this.widgets[cellIdx];
      if (cell.model.id === queryId) {
        return {
          cell
        };
      }
    }
    return null;
  }

  /**
   * Handle `contextmenu` event.
   */
  private _evtContextMenuCapture(event: PointerEvent): void {
    // Allow the event to propagate un-modified if the user
    // is holding the shift-key (and probably requesting
    // the native context menu).
    if (event.shiftKey) {
      return;
    }

    const [target, index] = this._findEventTargetAndCell(event);
    const widget = this.widgets[index];

    if (widget && widget.editorWidget?.node.contains(target)) {
      // Prevent CodeMirror from focusing the editor.
      // TODO: find an editor-agnostic solution.
      event.preventDefault();
    }
  }

  /**
   * Handle `mousedown` event in the capture phase for the widget.
   */
  private _evtMouseDownCapture(event: MouseEvent): void {
    const { button, shiftKey } = event;

    const [target, index] = this._findEventTargetAndCell(event);
    const widget = this.widgets[index];

    // On OS X, the context menu may be triggered with ctrl-left-click. In
    // Firefox, ctrl-left-click gives an event with button 2, but in Chrome,
    // ctrl-left-click gives an event with button 0 with the ctrl modifier.
    if (
      button === 2 &&
      !shiftKey &&
      widget &&
      widget.editorWidget?.node.contains(target)
    ) {
      this.mode = 'command';

      // Prevent CodeMirror from focusing the editor.
      // TODO: find an editor-agnostic solution.
      event.preventDefault();
    }
  }

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    const { button, shiftKey } = event;

    // We only handle main or secondary button actions.
    if (!(button === 0 || button === 2)) {
      return;
    }

    // Shift right-click gives the browser default behavior.
    if (shiftKey && button === 2) {
      return;
    }

    const [target, index] = this._findEventTargetAndCell(event);
    const widget = this.widgets[index];

    let targetArea: 'input' | 'prompt' | 'cell' | 'notebook';
    if (widget) {
      if (widget.editorWidget?.node.contains(target)) {
        targetArea = 'input';
      } else if (widget.promptNode?.contains(target)) {
        targetArea = 'prompt';
      } else {
        targetArea = 'cell';
      }
    } else {
      targetArea = 'notebook';
    }

    // Make sure we go to command mode if the click isn't in the cell editor If
    // we do click in the cell editor, the editor handles the focus event to
    // switch to edit mode.
    if (targetArea !== 'input') {
      this.mode = 'command';
    }

    if (targetArea === 'notebook') {
      this.deselectAll();
    } else if (targetArea === 'prompt' || targetArea === 'cell') {
      // We don't want to prevent the default selection behavior
      // if there is currently text selected in an output.
      const hasSelection = (window.getSelection() ?? '').toString() !== '';
      if (
        button === 0 &&
        shiftKey &&
        !hasSelection &&
        !['INPUT', 'OPTION'].includes(target.tagName)
      ) {
        // Prevent browser selecting text in prompt or output
        event.preventDefault();

        // Shift-click - extend selection
        try {
          this.extendContiguousSelectionTo(index);
        } catch (e) {
          console.error(e);
          this.deselectAll();
          return;
        }
        // Enter selecting mode
        this._mouseMode = 'select';

        // We don't want to block the shift-click mouse up handler
        // when the current cell is (and remains) the active cell.
        this._selectData = {
          startedOnActiveCell: index == this.activeCellIndex,
          startingCellIndex: this.activeCellIndex
        };
        document.addEventListener('mouseup', this, true);
        document.addEventListener('mousemove', this, true);
      } else if (button === 0 && !shiftKey) {
        // Prepare to start a drag if we are on the drag region.
        if (targetArea === 'prompt') {
          // Prepare for a drag start
          this._dragData = {
            pressX: event.clientX,
            pressY: event.clientY,
            index: index
          };

          // Enter possible drag mode
          this._mouseMode = 'couldDrag';
          document.addEventListener('mouseup', this, true);
          document.addEventListener('mousemove', this, true);
          event.preventDefault();
        }

        if (!this.isSelectedOrActive(widget)) {
          this.deselectAll();
          this.activeCellIndex = index;
        }
      } else if (button === 2) {
        if (!this.isSelectedOrActive(widget)) {
          this.deselectAll();
          this.activeCellIndex = index;
        }
        event.preventDefault();
      }
    } else if (targetArea === 'input') {
      if (button === 2 && !this.isSelectedOrActive(widget)) {
        this.deselectAll();
        this.activeCellIndex = index;
      }
    }

    // If we didn't set focus above, make sure we get focus now.
    this._ensureFocus(true);
  }

  /**
   * Handle the `'mouseup'` event on the document.
   */
  private _evtDocumentMouseup(event: MouseEvent): void {
    const [, index] = this._findEventTargetAndCell(event);

    let shouldPreventDefault = true;
    if (this._mouseMode === 'select' && this._selectData) {
      // User did not move the mouse over to a difference cell, so there was no selection
      const { startedOnActiveCell, startingCellIndex } = this._selectData;
      if (startedOnActiveCell && index === startingCellIndex) {
        shouldPreventDefault = false;
      }
      this._selectData = null;
    }
    if (shouldPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Remove the event listeners we put on the document
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);

    if (this._mouseMode === 'couldDrag') {
      // We didn't end up dragging if we are here, so treat it as a click event.

      this.deselectAll();
      this.activeCellIndex = index;
      // Focus notebook if active cell changes but does not have focus.
      if (!this.activeCell!.node.contains(document.activeElement)) {
        void NotebookActions.focusActiveCell(this);
      }
    }

    this._mouseMode = null;
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtDocumentMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // If in select mode, update the selection
    switch (this._mouseMode) {
      case 'select': {
        const target = event.target as HTMLElement;
        const index = this._findCell(target);
        if (index !== -1) {
          this.extendContiguousSelectionTo(index);
        }
        break;
      }
      case 'couldDrag': {
        // Check for a drag initialization.
        const data = this._dragData!;
        const dx = Math.abs(event.clientX - data.pressX);
        const dy = Math.abs(event.clientY - data.pressY);
        if (dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD) {
          this._mouseMode = null;
          this._startDrag(data.index, event.clientX, event.clientY);
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: Drag.Event): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const index = this._findCell(target);
    if (index === -1) {
      return;
    }

    const widget = this.cellsArray[index];
    widget.node.classList.add(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: Drag.Event): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const elements = this.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
      (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  private _evtDragOver(event: Drag.Event): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    const elements = this.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
      (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
    }
    const target = event.target as HTMLElement;
    const index = this._findCell(target);
    if (index === -1) {
      return;
    }
    const widget = this.cellsArray[index];
    widget.node.classList.add(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: Drag.Event): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }

    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.classList.contains(DROP_TARGET_CLASS)) {
        target.classList.remove(DROP_TARGET_CLASS);
        break;
      }
      target = target.parentElement;
    }

    // Model presence should be checked before calling event handlers
    const model = this.model!;

    const source: Notebook = event.source;
    if (source === this) {
      // Handle the case where we are moving cells within
      // the same notebook.
      event.dropAction = 'move';
      const toMove: Cell[] = event.mimeData.getData('internal:cells');

      // For collapsed markdown headings with hidden "child" cells, move all
      // child cells as well as the markdown heading.
      const cell = toMove[toMove.length - 1];
      if (cell instanceof MarkdownCell && cell.headingCollapsed) {
        const nextParent = NotebookActions.findNextParentHeading(cell, source);
        if (nextParent > 0) {
          const index = findIndex(source.widgets, (possibleCell: Cell) => {
            return cell.model.id === possibleCell.model.id;
          });
          toMove.push(...source.widgets.slice(index + 1, nextParent));
        }
      }

      // Compute the to/from indices for the move.
      let fromIndex = ArrayExt.firstIndexOf(this.widgets, toMove[0]);
      let toIndex = this._findCell(target);
      // This check is needed for consistency with the view.
      if (toIndex !== -1 && toIndex > fromIndex) {
        toIndex -= 1;
      } else if (toIndex === -1) {
        // If the drop is within the notebook but not on any cell,
        // most often this means it is past the cell areas, so
        // set it to move the cells to the end of the notebook.
        toIndex = this.widgets.length - 1;
      }
      // Don't move if we are within the block of selected cells.
      if (toIndex >= fromIndex && toIndex < fromIndex + toMove.length) {
        return;
      }

      // Move the cells one by one
      this.moveCell(fromIndex, toIndex, toMove.length);
    } else {
      // Handle the case where we are copying cells between
      // notebooks.
      event.dropAction = 'copy';
      // Find the target cell and insert the copied cells.
      let index = this._findCell(target);
      if (index === -1) {
        index = this.widgets.length;
      }
      const start = index;
      const values = event.mimeData.getData(JUPYTER_CELL_MIME);
      // Insert the copies of the original cells.
      // We preserve trust status of pasted cells by not modifying metadata.
      model.sharedModel.insertCells(index, values);
      // Select the inserted cells.
      this.deselectAll();
      this.activeCellIndex = start;
      this.extendContiguousSelectionTo(index - 1);
    }
    void NotebookActions.focusActiveCell(this);
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    const cells = this.model!.cells;
    const selected: nbformat.ICell[] = [];
    const toMove: Cell[] = [];
    let i = -1;
    for (const widget of this.widgets) {
      const cell = cells.get(++i);
      if (this.isSelectedOrActive(widget)) {
        widget.addClass(DROP_SOURCE_CLASS);
        selected.push(cell.toJSON());
        toMove.push(widget);
      }
    }
    const activeCell = this.activeCell;
    let dragImage: HTMLElement | null = null;
    let countString: string;
    if (activeCell?.model.type === 'code') {
      const executionCount = (activeCell.model as ICodeCellModel)
        .executionCount;
      countString = ' ';
      if (executionCount) {
        countString = executionCount.toString();
      }
    } else {
      countString = '';
    }

    // Create the drag image.
    dragImage = Private.createDragImage(
      selected.length,
      countString,
      activeCell?.model.sharedModel.getSource().split('\n')[0].slice(0, 26) ??
        ''
    );

    // Set up the drag event.
    this._drag = new Drag({
      mimeData: new MimeData(),
      dragImage,
      supportedActions: 'copy-move',
      proposedAction: 'copy',
      source: this
    });
    this._drag.mimeData.setData(JUPYTER_CELL_MIME, selected);
    // Add mimeData for the fully reified cell widgets, for the
    // case where the target is in the same notebook and we
    // can just move the cells.
    this._drag.mimeData.setData('internal:cells', toMove);
    // Add mimeData for the text content of the selected cells,
    // allowing for drag/drop into plain text fields.
    const textContent = toMove
      .map(cell => cell.model.sharedModel.getSource())
      .join('\n');
    this._drag.mimeData.setData('text/plain', textContent);

    // Remove mousemove and mouseup listeners and start the drag.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    this._mouseMode = null;
    void this._drag.start(clientX, clientY).then(action => {
      if (this.isDisposed) {
        return;
      }
      this._drag = null;
      for (const widget of toMove) {
        widget.removeClass(DROP_SOURCE_CLASS);
      }
    });
  }

  /**
   * Update the notebook node with class indicating read-write state.
   */
  private _updateReadWrite(): void {
    const inReadWrite = DOMUtils.hasActiveEditableElement(this.node);
    this.node.classList.toggle(READ_WRITE_CLASS, inReadWrite);
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocusIn(event: FocusEvent): void {
    // Update read-write class state.
    this._updateReadWrite();

    const target = event.target as HTMLElement;
    const index = this._findCell(target);
    if (index !== -1) {
      const widget = this.widgets[index];
      // If the editor itself does not have focus, ensure command mode.
      if (widget.editorWidget && !widget.editorWidget.node.contains(target)) {
        this.setMode('command', { focus: false });
      }

      // Cell index needs to be updated before changing mode,
      // otherwise the previous cell may get un-rendered.
      this.activeCellIndex = index;

      // If the editor has focus, ensure edit mode.
      const node = widget.editorWidget?.node;
      if (node?.contains(target)) {
        this.setMode('edit', { focus: false });
      }
    } else {
      // No cell has focus, ensure command mode.
      this.setMode('command', { focus: false });

      // Prevents the parent element to get the focus.
      event.preventDefault();

      // Check if the focus was previously in the active cell to avoid focus looping
      // between the cell and the cell toolbar.
      const source = event.relatedTarget as HTMLElement;

      // Focuses on the active cell if the focus did not come from it.
      // Otherwise focus on the footer element (add cell button).
      if (this._activeCell && !this._activeCell.node.contains(source)) {
        this._activeCell.ready
          .then(() => {
            this._activeCell?.node.focus({
              preventScroll: true
            });
          })
          .catch(() => {
            (this.layout as NotebookWindowedLayout).footer?.node.focus({
              preventScroll: true
            });
          });
      } else {
        (this.layout as NotebookWindowedLayout).footer?.node.focus({
          preventScroll: true
        });
      }
    }
  }

  /**
   * Handle `focusout` events for the notebook.
   */
  private _evtFocusOut(event: FocusEvent): void {
    // Update read-write class state.
    this._updateReadWrite();

    const relatedTarget = event.relatedTarget as HTMLElement;

    // Bail if the window is losing focus, to preserve edit mode. This test
    // assumes that we explicitly focus things rather than calling blur()
    if (!relatedTarget) {
      return;
    }

    // Bail if the item gaining focus is another cell,
    // and we should not be entering command mode.
    const index = this._findCell(relatedTarget);
    if (index !== -1) {
      const widget = this.widgets[index];
      if (widget.editorWidget?.node.contains(relatedTarget)) {
        return;
      }
    }

    // Otherwise enter command mode if not already.
    if (this.mode !== 'command') {
      this.setMode('command', { focus: false });
    }
  }

  /**
   * Handle `dblclick` events for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    const model = this.model;
    if (!model) {
      return;
    }
    this.deselectAll();

    const [target, index] = this._findEventTargetAndCell(event);

    if (
      (event.target as HTMLElement).classList.contains(HEADING_COLLAPSER_CLASS)
    ) {
      return;
    }
    if (index === -1) {
      return;
    }
    this.activeCellIndex = index;
    if (model.cells.get(index).type === 'markdown') {
      const widget = this.widgets[index] as MarkdownCell;
      widget.rendered = false;
    } else if (target.localName === 'img') {
      target.classList.toggle(UNCONFINED_CLASS);
    }
  }

  /**
   * Remove selections from inactive cells to avoid
   * spurious cursors.
   */
  private _trimSelections(): void {
    for (let i = 0; i < this.widgets.length; i++) {
      if (i !== this._activeCellIndex) {
        const cell = this.widgets[i];
        if (!cell.model.isDisposed && cell.editor) {
          cell.model.selections.delete(cell.editor.uuid);
        }
      }
    }
  }

  private _activeCellIndex = -1;
  private _activeCell: Cell | null = null;
  private _mode: NotebookMode = 'command';
  private _drag: Drag | null = null;
  private _dragData: {
    pressX: number;
    pressY: number;
    index: number;
  } | null = null;
  private _selectData: {
    startedOnActiveCell: boolean;
    startingCellIndex: number;
  } | null = null;
  private _mouseMode: 'select' | 'couldDrag' | null = null;
  private _activeCellChanged = new Signal<this, Cell | null>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);
  private _selectionChanged = new Signal<this, void>(this);

  // Attributes for optimized cell refresh:
  private _cellLayoutStateCache?: { width: number };
  private _checkCacheOnNextResize = false;

  private _lastClipboardInteraction: 'copy' | 'cut' | 'paste' | null = null;
  private _updateSelectedCells(): void {
    this._selectedCells = this.widgets.filter(cell =>
      this.isSelectedOrActive(cell)
    );
    if (this.kernelHistory) {
      this.kernelHistory.reset();
    }
  }
  private _selectedCells: Cell[] = [];
}

/**
 * The namespace for the `Notebook` class statics.
 */
export namespace Notebook {
  /**
   * An options object for initializing a notebook widget.
   */
  export interface IOptions extends StaticNotebook.IOptions {}

  /**
   * The content factory for the notebook widget.
   */
  export interface IContentFactory extends StaticNotebook.IContentFactory {}

  /**
   * The default implementation of a notebook content factory..
   *
   * #### Notes
   * Override methods on this class to customize the default notebook factory
   * methods that create notebook content.
   */
  export class ContentFactory extends StaticNotebook.ContentFactory {}

  /**
   * A namespace for the notebook content factory.
   */
  export namespace ContentFactory {
    /**
     * An options object for initializing a notebook content factory.
     */
    export interface IOptions extends StaticNotebook.ContentFactory.IOptions {}
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for the selected state of a cell.
   */
  export const selectedProperty = new AttachedProperty<Cell, boolean>({
    name: 'selected',
    create: () => false
  });

  /**
   * A custom panel layout for the notebook.
   */
  export class NotebookPanelLayout extends PanelLayout {
    /**
     * A message handler invoked on an `'update-request'` message.
     *
     * #### Notes
     * This is a reimplementation of the base class method,
     * and is a no-op.
     */
    protected onUpdateRequest(msg: Message): void {
      // This is a no-op.
    }
  }

  /**
   * Create a cell drag image.
   */
  export function createDragImage(
    count: number,
    promptNumber: string,
    cellContent: string
  ): HTMLElement {
    if (count > 1) {
      if (promptNumber !== '') {
        return VirtualDOM.realize(
          h.div(
            h.div(
              { className: DRAG_IMAGE_CLASS },
              h.span(
                { className: CELL_DRAG_PROMPT_CLASS },
                '[' + promptNumber + ']:'
              ),
              h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
            ),
            h.div({ className: CELL_DRAG_MULTIPLE_BACK }, '')
          )
        );
      } else {
        return VirtualDOM.realize(
          h.div(
            h.div(
              { className: DRAG_IMAGE_CLASS },
              h.span({ className: CELL_DRAG_PROMPT_CLASS }),
              h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
            ),
            h.div({ className: CELL_DRAG_MULTIPLE_BACK }, '')
          )
        );
      }
    } else {
      if (promptNumber !== '') {
        return VirtualDOM.realize(
          h.div(
            h.div(
              { className: `${DRAG_IMAGE_CLASS} ${SINGLE_DRAG_IMAGE_CLASS}` },
              h.span(
                { className: CELL_DRAG_PROMPT_CLASS },
                '[' + promptNumber + ']:'
              ),
              h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
            )
          )
        );
      } else {
        return VirtualDOM.realize(
          h.div(
            h.div(
              { className: `${DRAG_IMAGE_CLASS} ${SINGLE_DRAG_IMAGE_CLASS}` },
              h.span({ className: CELL_DRAG_PROMPT_CLASS }),
              h.span({ className: CELL_DRAG_CONTENT_CLASS }, cellContent)
            )
          )
        );
      }
    }
  }

  /**
   * Information about resolved scroll target defined by URL fragment.
   */
  export interface IScrollTarget {
    /**
     * Target cell.
     */
    cell: Cell;
    /**
     * Element to scroll to within the cell.
     */
    element?: HTMLElement;
  }

  /**
   * Parsed fragment identifier data.
   */
  export interface IFragmentData {
    /**
     * The kind of notebook element targeted by the fragment identifier.
     */
    kind: 'heading' | 'cell-id';
    /*
     * The value of the fragment query.
     */
    value: string;
  }
}
