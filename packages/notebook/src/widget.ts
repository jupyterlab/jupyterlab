// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each
} from '@phosphor/algorithm';

import {
  JSONValue
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  MimeData
} from '@phosphor/coreutils';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Drag, IDragEvent
} from '@phosphor/dragdrop';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  ICellModel, Cell, IMarkdownCellModel,
  CodeCell, MarkdownCell,
  ICodeCellModel, RawCell, IRawCellModel, ICollapser
} from '@jupyterlab/cells';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  IChangedArgs, IObservableMap, IObservableList, nbformat
} from '@jupyterlab/coreutils';

import {
  RenderMime
} from '@jupyterlab/rendermime';

import {
  INotebookModel
} from './model';

import {
  h, VirtualDOM
} from '@phosphor/virtualdom';

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
 * The class name added to an active cell when there are other selected cells.
 */
const OTHER_SELECTED_CLASS = 'jp-mod-multiSelected';

/**
 * The class name added to unconfined images.
 */
const UNCONFINED_CLASS = 'jp-mod-unconfined';

/**
 * The class name added to a drop target.
 */
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * The class name added to a drop source.
 */
const DROP_SOURCE_CLASS = 'jp-mod-dropSource';

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
 * The interactivity modes for the notebook.
 */
export
type NotebookMode = 'command' | 'edit';


/**
 * A widget which renders static non-interactive notebooks.
 *
 * #### Notes
 * The widget model must be set separately and can be changed
 * at any time.  Consumers of the widget must account for a
 * `null` model, and may want to listen to the `modelChanged`
 * signal.
 */
export
class StaticNotebook extends Widget {
  /**
   * Construct a notebook widget.
   */
  constructor(options: StaticNotebook.IOptions) {
    super();
    this.addClass(NB_CLASS);
    this.rendermime = options.rendermime;
    this.layout = new Private.NotebookPanelLayout();
    this.contentFactory = (
      options.contentFactory || StaticNotebook.defaultContentFactory
    );
    this._mimetypeService = options.mimeTypeService;
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
   * The cell factory used by the widget.
   */
  readonly contentFactory: StaticNotebook.IContentFactory;

  /**
   * The Rendermime instance used by the widget.
   */
  readonly rendermime: RenderMime;

  /**
   * The model for the widget.
   */
  get model(): INotebookModel {
    return this._model;
  }
  set model(newValue: INotebookModel) {
    newValue = newValue || null;
    if (this._model === newValue) {
      return;
    }
    let oldValue = this._model;
    this._model = newValue;

    if (oldValue && oldValue.modelDB.isCollaborative) {
      oldValue.modelDB.connected.then(() => {
        oldValue.modelDB.collaborators.changed.disconnect(
          this._onCollaboratorsChanged, this);
      });
    }
    if (newValue && newValue.modelDB.isCollaborative) {
      newValue.modelDB.connected.then(() => {
        newValue.modelDB.collaborators.changed.connect(
          this._onCollaboratorsChanged, this);
      });
    }

    // Trigger private, protected, and public changes.
    this._onModelChanged(oldValue, newValue);
    this.onModelChanged(oldValue, newValue);
    this._modelChanged.emit(void 0);
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
    return (this.layout as PanelLayout).widgets as ReadonlyArray<Cell>;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    super.dispose();
  }

  /**
   * Handle a new model.
   *
   * #### Notes
   * This method is called after the model change has been handled
   * internally and before the `modelChanged` signal is emitted.
   * The default implementation is a no-op.
   */
  protected onModelChanged(oldValue: INotebookModel, newValue: INotebookModel): void {
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
  protected onMetadataChanged(sender: IObservableMap<JSONValue>, args: IObservableMap.IChangedArgs<JSONValue>): void {
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
   * Handle a cell being moved.
   *
   * The default implementation is a no-op
   */
  protected onCellMoved(fromIndex: number, toIndex: number): void {
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
   * Handle a new model on the widget.
   */
  private _onModelChanged(oldValue: INotebookModel, newValue: INotebookModel): void {
    let layout = this.layout as PanelLayout;
    if (oldValue) {
      oldValue.cells.changed.disconnect(this._onCellsChanged, this);
      oldValue.metadata.changed.disconnect(this.onMetadataChanged, this);
      oldValue.contentChanged.disconnect(this.onModelContentChanged, this);
      // TODO: reuse existing cell widgets if possible.
      while (layout.widgets.length) {
        this._removeCell(0);
      }
    }
    if (!newValue) {
      this._mimetype = 'text/plain';
      return;
    }
    this._updateMimetype();
    let cells = newValue.cells;
    each(cells, (cell: ICellModel, i: number) => {
      this._insertCell(i, cell);
    });
    cells.changed.connect(this._onCellsChanged, this);
    newValue.contentChanged.connect(this.onModelContentChanged, this);
    newValue.metadata.changed.connect(this.onMetadataChanged, this);
  }

  /**
   * Handle a change cells event.
   */
  private _onCellsChanged(sender: IObservableList<ICellModel>, args: IObservableList.IChangedArgs<ICellModel>) {
    let index = 0;
    switch (args.type) {
    case 'add':
      index = args.newIndex;
      each(args.newValues, value => {
        this._insertCell(index++, value);
      });
      break;
    case 'move':
      this._moveCell(args.oldIndex, args.newIndex);
      break;
    case 'remove':
      each(args.oldValues, value => {
        this._removeCell(args.oldIndex);
      });
      break;
    case 'set':
      // TODO: reuse existing widgets if possible.
      index = args.newIndex;
      each(args.newValues, value => {
        // Note: this ordering (insert then remove)
        // is important for getting the active cell
        // index for the editable notebook correct.
        this._insertCell(index, value);
        this._removeCell(index + 1);
        index++;
      });
      break;
    default:
      return;
    }
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
      break;
    default:
      widget = this._createRawCell(cell as IRawCellModel);
    }
    widget.addClass(NB_CELL_CLASS);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, widget);
    this.onCellInserted(index, widget);
  }

  /**
   * Create a code cell widget from a code cell model.
   */
  private _createCodeCell(model: ICodeCellModel): CodeCell {
    let rendermime = this.rendermime;
    let contentFactory = this.contentFactory;
    let options = { model, rendermime, contentFactory };
    return this.contentFactory.createCodeCell(options, this);
  }

  /**
   * Create a markdown cell widget from a markdown cell model.
   */
  private _createMarkdownCell(model: IMarkdownCellModel): MarkdownCell {
    let rendermime = this.rendermime;
    let contentFactory = this.contentFactory;
    let options = { model, rendermime, contentFactory };
    return this.contentFactory.createMarkdownCell(options, this);
  }

  /**
   * Create a raw cell widget from a raw cell model.
   */
  private _createRawCell(model: IRawCellModel): RawCell {
    let contentFactory = this.contentFactory;
    let options = { model, contentFactory };
    return this.contentFactory.createRawCell(options, this);
  }

  /**
   * Move a cell widget.
   */
  private _moveCell(fromIndex: number, toIndex: number): void {
    let layout = this.layout as PanelLayout;
    layout.insertWidget(toIndex, layout.widgets[fromIndex]);
    this.onCellMoved(fromIndex, toIndex);
  }

  /**
   * Remove a cell widget.
   */
  private _removeCell(index: number): void {
    let layout = this.layout as PanelLayout;
    let widget = layout.widgets[index] as Cell;
    widget.parent = null;
    this.onCellRemoved(index, widget);
    widget.dispose();
  }

  /**
   * Update the mimetype of the notebook.
   */
  private _updateMimetype(): void {
    let info = this._model.metadata.get('language_info') as nbformat.ILanguageInfoMetadata;
    if (!info) {
      return;
    }
    this._mimetype = this._mimetypeService.getMimeTypeByLanguage(info);
    each(this.widgets, widget => {
      if (widget.model.type === 'code') {
        widget.model.mimeType = this._mimetype;
      }
    });
  }

  /**
   * Handle an update to the collaborators.
   */
  private _onCollaboratorsChanged(): void {
    // If there are selections corresponding to non-collaborators,
    // they are stale and should be removed.
    for (let i = 0; i < this.widgets.length; i++) {
      let cell = this.widgets[i];
      for (let key of cell.model.selections.keys()) {
        if (!this._model.modelDB.collaborators.has(key)) {
          cell.model.selections.delete(key);
        }
      }
    }
  }


  private _mimetype = 'text/plain';
  private _model: INotebookModel = null;
  private _mimetypeService: IEditorMimeTypeService;
  private _modelChanged = new Signal<this, void>(this);
  private _modelContentChanged = new Signal<this, void>(this);
}


/**
 * The namespace for the `StaticNotebook` class statics.
 */
export
namespace StaticNotebook {
  /**
   * An options object for initializing a static notebook.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the widget.
     */
    rendermime: RenderMime;

    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * A factory for creating content.
     */
    contentFactory?: IContentFactory;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;
  }

  /**
   * A factory for creating notebook content.
   *
   * #### Notes
   * This extends the content factory of the cell itself, which extends the content
   * factory of the output area and input area. The result is that there is a single
   * factory for creating all child content of a notebook.
   */
  export
  interface IContentFactory extends Cell.IContentFactory {

    /**
     * Create a new code cell widget.
     */
    createCodeCell(options: CodeCell.IOptions, parent: StaticNotebook): CodeCell;

    /**
     * Create a new markdown cell widget.
     */
    createMarkdownCell(options: MarkdownCell.IOptions, parent: StaticNotebook): MarkdownCell;

    /**
     * Create a new raw cell widget.
     */
    createRawCell(options: RawCell.IOptions, parent: StaticNotebook): RawCell;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory extends Cell.ContentFactory implements IContentFactory {

    /**
     * Create a new code cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createCodeCell(options: CodeCell.IOptions, parent: StaticNotebook): CodeCell {
      if (!options.contentFactory) {
        options.contentFactory = this;
      }
      return new CodeCell(options);
    }

    /**
     * Create a new markdown cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createMarkdownCell(options: MarkdownCell.IOptions, parent: StaticNotebook): MarkdownCell {
      if (!options.contentFactory) {
        options.contentFactory = this;
      }
      return new MarkdownCell(options);
    }

    /**
     * Create a new raw cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createRawCell(options: RawCell.IOptions, parent: StaticNotebook): RawCell {
      if (!options.contentFactory) {
        options.contentFactory = this;
      }
      return new RawCell(options);
    }
  }

  /**
   * A namespace for the staic notebook content factory.
   */
  export
  namespace ContentFactory {
    /**
     * Options for the content factory.
     */
    export
    interface IOptions extends Cell.ContentFactory.IOptions { }
  }

  /**
   * Default content factory for the static notebook widget.
   */
  export
  const defaultContentFactory: IContentFactory = new ContentFactory();

}

/**
 * A notebook widget that supports interactivity.
 */
export
class Notebook extends StaticNotebook {
  /**
   * Construct a notebook widget.
   */
  constructor(options: Notebook.IOptions) {
    super( Private.processNotebookOptions(options) );
    this.node.tabIndex = -1;  // Allow the widget to take focus.
    // Allow the node to scroll while dragging items.
    this.node.setAttribute('data-p-dragscroll', 'true');
  }

  /**
   * A signal emitted when the active cell changes.
   *
   * #### Notes
   * This can be due to the active index changing or the
   * cell at the active index changing.
   */
  get activeCellChanged(): ISignal<this, Cell> {
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
    let activeCell = this.activeCell;
    if (!activeCell) {
      newValue = 'command';
    }
    if (newValue === this._mode) {
      this._ensureFocus();
      return;
    }
    // Post an update request.
    this.update();
    let oldValue = this._mode;
    this._mode = newValue;

    if (newValue === 'edit') {
      // Edit mode deselects all cells.
      each(this.widgets, widget => { this.deselect(widget); });
      //  Edit mode unrenders an active markdown widget.
      if (activeCell instanceof MarkdownCell) {
        activeCell.rendered = false;
      }
    }
    this._stateChanged.emit({ name: 'mode', oldValue, newValue });
    this._ensureFocus();
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
    return this.model.cells.length ? this._activeCellIndex : -1;
  }
  set activeCellIndex(newValue: number) {
    let oldValue = this._activeCellIndex;
    if (!this.model || !this.model.cells.length) {
      newValue = -1;
    } else {
      newValue = Math.max(newValue, 0);
      newValue = Math.min(newValue, this.model.cells.length - 1);
    }
    this._activeCellIndex = newValue;
    let cell = this.widgets[newValue];
    if (cell !== this._activeCell) {
      // Post an update request.
      this.update();
      this._activeCell = cell;
      this._activeCellChanged.emit(cell);
    }
    if (this.mode === 'edit' && cell instanceof MarkdownCell) {
      cell.rendered = false;
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
   */
  get activeCell(): Cell {
    return this._activeCell;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this._activeCell === null) {
      return;
    }
    this._activeCell = null;
    super.dispose();
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
   * Whether a cell is selected or is the active cell.
   */
  isSelected(widget: Cell): boolean {
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
    each(this.widgets, widget => {
      if (Private.selectedProperty.get(widget)) {
        changed = true;
      }
      Private.selectedProperty.set(widget, false);
    });
    if (changed) {
      this._selectionChanged.emit(void 0);
    }
    // Make sure we have a valid active cell.
    this.activeCellIndex = this.activeCellIndex;
  }

  /**
   * Scroll so that the given position is visible.
   *
   * @param position - The vertical position in the notebook widget.
   *
   * @param threshold - An optional threshold for the scroll.  Defaults to 25
   *   percent of the widget height.
   */
  scrollToPosition(position: number, threshold=25): void {
    let node = this.node;
    let ar = node.getBoundingClientRect();
    let delta = position - ar.top - ar.height / 2;
    if (Math.abs(delta) > ar.height * threshold / 100) {
      node.scrollTop += delta;
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
    if (!this.model || this.model.readOnly) {
      return;
    }
    switch (event.type) {
    case 'mousedown':
      this._evtMouseDown(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseup(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMousemove(event as MouseEvent);
      break;
    case 'keydown':
      this._ensureFocus(true);
      break;
    case 'dblclick':
      this._evtDblClick(event as MouseEvent);
      break;
    case 'focus':
      this._evtFocus(event as MouseEvent);
      break;
    case 'blur':
      this._evtBlur(event as MouseEvent);
      break;
    case 'p-dragenter':
      this._evtDragEnter(event as IDragEvent);
      break;
    case 'p-dragleave':
      this._evtDragLeave(event as IDragEvent);
      break;
    case 'p-dragover':
      this._evtDragOver(event as IDragEvent);
      break;
    case 'p-drop':
      this._evtDrop(event as IDragEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('mousedown', this);
    node.addEventListener('keydown', this);
    node.addEventListener('dblclick', this);
    node.addEventListener('focus', this, true);
    node.addEventListener('blur', this, true);
    node.addEventListener('p-dragenter', this);
    node.addEventListener('p-dragleave', this);
    node.addEventListener('p-dragover', this);
    node.addEventListener('p-drop', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('mousedown', this);
    node.removeEventListener('keydown', this);
    node.removeEventListener('dblclick', this);
    node.removeEventListener('focus', this, true);
    node.removeEventListener('blur', this, true);
    node.removeEventListener('p-dragenter', this);
    node.removeEventListener('p-dragleave', this);
    node.removeEventListener('p-dragover', this);
    node.removeEventListener('p-drop', this);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._ensureFocus(true);
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    let activeCell = this.activeCell;

    // Set the appropriate classes on the cells.
    if (this.mode === 'edit') {
      this.addClass(EDIT_CLASS);
      this.removeClass(COMMAND_CLASS);
    } else {
      this.addClass(COMMAND_CLASS);
      this.removeClass(EDIT_CLASS);
    }
    if (activeCell) {
      activeCell.addClass(ACTIVE_CLASS);
    }

    let count = 0;
    each(this.widgets, widget => {
      if (widget !== activeCell) {
        widget.removeClass(ACTIVE_CLASS);
      }
      widget.removeClass(OTHER_SELECTED_CLASS);
      if (this.isSelected(widget)) {
        widget.addClass(SELECTED_CLASS);
        count++;
      } else {
        widget.removeClass(SELECTED_CLASS);
      }
    });
    if (count > 1) {
      activeCell.addClass(OTHER_SELECTED_CLASS);
    }
  }

  /**
   * Handle a cell being inserted.
   */
  protected onCellInserted(index: number, cell: Cell): void {
    if (this.model && this.model.modelDB.isCollaborative) {
      let modelDB = this.model.modelDB;
      modelDB.connected.then(() => {
        if (!cell.isDisposed) {
          // Setup the selection style for collaborators.
          let localCollaborator = modelDB.collaborators.localCollaborator;
          cell.editor.uuid = localCollaborator.sessionId;
          cell.editor.selectionStyle = {
            color: localCollaborator.color
          };
        }
      });
    }
    cell.editor.edgeRequested.connect(this._onEdgeRequest, this);
    // If the insertion happened above, increment the active cell
    // index, otherwise it stays the same.
    this.activeCellIndex = index <= this.activeCellIndex ?
      this.activeCellIndex + 1 : this.activeCellIndex ;
  }

  /**
   * Handle a cell being moved.
   */
  protected onCellMoved(fromIndex: number, toIndex: number): void {
    if (fromIndex === this.activeCellIndex) {
      this.activeCellIndex = toIndex;
    }
  }

  /**
   * Handle a cell being removed.
   */
  protected onCellRemoved(index: number, cell: Cell): void {
    // If the removal happened above, decrement the active
    // cell index, otherwise it stays the same.
    this.activeCellIndex = index <= this.activeCellIndex ?
      this.activeCellIndex - 1 : this.activeCellIndex ;
    if (this.isSelected(cell)) {
      this._selectionChanged.emit(void 0);
    }
  }

  /**
   * Handle a new model.
   */
  protected onModelChanged(oldValue: INotebookModel, newValue: INotebookModel): void {
    // Try to set the active cell index to 0.
    // It will be set to `-1` if there is no new model or the model is empty.
    this.activeCellIndex = 0;
  }

  /**
   * Handle edge request signals from cells.
   */
  private _onEdgeRequest(editor: CodeEditor.IEditor, location: CodeEditor.EdgeLocation): void {
    let prev = this.activeCellIndex;
    if (location === 'top') {
      this.activeCellIndex--;
      // Move the cursor to the first position on the last line.
      if (this.activeCellIndex < prev) {
        let editor = this.activeCell.editor;
        let lastLine = editor.lineCount - 1;
        editor.setCursorPosition({ line: lastLine, column: 0 });
      }
    } else {
      this.activeCellIndex++;
      // Move the cursor to the first character.
      if (this.activeCellIndex > prev) {
        let editor = this.activeCell.editor;
        editor.setCursorPosition({ line: 0, column: 0 });
      }
    }
  }

  /**
   * Ensure that the notebook has proper focus.
   */
  private _ensureFocus(force=false): void {
    let activeCell = this.activeCell;
    if (this.mode === 'edit' && activeCell) {
      activeCell.editor.focus();
    } else if (activeCell) {
      activeCell.editor.blur();
    }
    if (force && !this.node.contains(document.activeElement)) {
      this.node.focus();
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
    while (node && node !== this.node) {
      if (node.classList.contains(NB_CELL_CLASS)) {
        let i = ArrayExt.findFirstIndex(this.widgets, widget => widget.node === node);
        if (i !== -1) {
          return i;
        }
        break;
      }
      node = node.parentElement;
    }
    return -1;
  }

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    let i = this._findCell(target);
    let shouldDrag = false;

    if (i !== -1) {
      let widget = this.widgets[i];
      // Event is on a cell but not in its editor, switch to command mode.
      if (!widget.editorWidget.node.contains(target)) {
        this.mode = 'command';
        shouldDrag = widget.promptNode.contains(target);
      }
      if (event.shiftKey) {
        shouldDrag = false;
        this._extendSelectionTo(i);

        // Prevent text select behavior.
        event.preventDefault();
        event.stopPropagation();
      } else {
        if (!this.isSelected(widget)) {
          this.deselectAll();
        }
      }
      // Set the cell as the active one.
      // This must be done *after* setting the mode above.
      this.activeCellIndex = i;
    }

    this._ensureFocus(true);

    // Left mouse press for drag start.
    if (event.button === 0 && shouldDrag) {
      this._dragData = { pressX: event.clientX, pressY: event.clientY, index: i};
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
      event.preventDefault();
    }
  }


  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    if (event.button !== 0 || !this._drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Bail if we are the one dragging.
    if (this._drag) {
      return;
    }

    // Check for a drag initialization.
    let data = this._dragData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(data.index, event.clientX, event.clientY);
  }

  /**
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    let target = event.target as HTMLElement;
    let index = this._findCell(target);
    if (index === -1) {
      return;
    }

    let widget = (this.layout as PanelLayout).widgets[index];
    widget.node.classList.add(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'p-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    let elements = this.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
      (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
    }
  }

  /**
   * Handle the `'p-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    if (!event.mimeData.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
    let elements = this.node.getElementsByClassName(DROP_TARGET_CLASS);
    if (elements.length) {
      (elements[0] as HTMLElement).classList.remove(DROP_TARGET_CLASS);
    }
    let target = event.target as HTMLElement;
    let index = this._findCell(target);
    if (index === -1) {
      return;
    }
    let widget = (this.layout as PanelLayout).widgets[index];
    widget.node.classList.add(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'p-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
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

    let source: Notebook = event.source;
    if (source === this) {
      // Handle the case where we are moving cells within
      // the same notebook.
      event.dropAction = 'move';
      let toMove: Cell[] = event.mimeData.getData('internal:cells');

      //Compute the to/from indices for the move.
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
      //Don't move if we are within the block of selected cells.
      if (toIndex >= fromIndex && toIndex < fromIndex + toMove.length) {
        return;
      }
      // Move the cells one by one
      this.model.cells.beginCompoundOperation();
      if (fromIndex < toIndex) {
        each(toMove, (cellWidget)=> {
          this.model.cells.move(fromIndex, toIndex);
        });
      } else if (fromIndex > toIndex) {
        each(toMove, (cellWidget)=> {
          this.model.cells.move(fromIndex++, toIndex++);
        });
      }
      this.model.cells.endCompoundOperation();
    } else {
      // Handle the case where we are copying cells between
      // notebooks.
      event.dropAction = 'copy';
      // Find the target cell and insert the copied cells.
      let index = this._findCell(target);
      if (index === -1) {
        index = this.widgets.length;
      }
      let model = this.model;
      let values = event.mimeData.getData(JUPYTER_CELL_MIME);
      let factory = model.contentFactory;

      // Insert the copies of the original cells.
      model.cells.beginCompoundOperation();
      each(values, (cell: nbformat.ICell) => {
        let value: ICellModel;
        switch (cell.cell_type) {
        case 'code':
          value = factory.createCodeCell({ cell });
          break;
        case 'markdown':
          value = factory.createMarkdownCell({ cell });
          break;
        default:
          value = factory.createRawCell({ cell });
          break;
        }
        model.cells.insert(index++, value);
      });
      model.cells.endCompoundOperation();
      // Activate the last cell.
      this.activeCellIndex = index - 1;
    }
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    let cells = this.model.cells;
    let selected: nbformat.ICell[] = [];
    let toMove: Cell[] = [];

    each(this.widgets, (widget, i) => {
      let cell = cells.get(i);
      if (this.isSelected(widget)) {
        widget.addClass(DROP_SOURCE_CLASS);
        selected.push(cell.toJSON());
        toMove.push(widget);
      }
    });
    let activeCell = this.activeCell;
    let dragImage: HTMLElement = null;
    let countString: string;
    if (activeCell.model.type === 'code') {
      let executionCount = (activeCell.model as ICodeCellModel).executionCount;
      countString = ' ';
      if (executionCount) {
        countString = executionCount.toString();
      }
    }
    else {
      countString = '';
    }

    // Create the drag image.
    dragImage = Private.createDragImage(selected.length, countString, activeCell.model.value.text.split('\n')[0].slice(0,26));

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

    // Remove mousemove and mouseup listeners and start the drag.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    this._drag.start(clientX, clientY).then(action => {
      if (this.isDisposed) {
        return;
      }
      this._drag = null;
      each(toMove, widget => { widget.removeClass(DROP_SOURCE_CLASS); });
    });

  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocus(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    let i = this._findCell(target);
    if (i !== -1) {
      let widget = this.widgets[i];
      // If the editor itself does not have focus, ensure command mode.
      if (!widget.editorWidget.node.contains(target)) {
        this.mode = 'command';
      }
      this.activeCellIndex = i;
      // If the editor has focus, ensure edit mode.
      let node = widget.editorWidget.node;
      if (node.contains(target)) {
        this.mode = 'edit';
      }
    } else {
      // No cell has focus, ensure command mode.
      this.mode = 'command';
    }
  }

  /**
   * Handle `blur` events for the notebook.
   */
  private _evtBlur(event: MouseEvent): void {
    let relatedTarget = event.relatedTarget as HTMLElement;
    // Bail if focus is leaving the notebook.
    if (!this.node.contains(relatedTarget)) {
      return;
    }
    this.mode = 'command';
  }

  /**
   * Handle `dblclick` events for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    let model = this.model;
    if (!model || model.readOnly) {
      return;
    }
    let target = event.target as HTMLElement;
    let i = this._findCell(target);
    if (i === -1) {
      return;
    }
    this.activeCellIndex = i;
    if (model.cells.get(i).type === 'markdown') {
      let widget = this.widgets[i] as MarkdownCell;
      widget.rendered = false;
    } else if (target.localName === 'img') {
      target.classList.toggle(UNCONFINED_CLASS);
    }
  }

  /**
   * Extend the selection to a given index.
   */
  private _extendSelectionTo(index: number): void {
    let activeIndex = this.activeCellIndex;
    let j = index;
    // extend the existing selection.
    if (j > activeIndex) {
      while (j > activeIndex) {
        Private.selectedProperty.set(this.widgets[j], true);
        j--;
      }
    } else if (j < activeIndex) {
      while (j < activeIndex) {
        Private.selectedProperty.set(this.widgets[j], true);
        j++;
      }
    }
    Private.selectedProperty.set(this.widgets[activeIndex], true);
    this._selectionChanged.emit(void 0);
  }

  /**
   * Remove selections from inactive cells to avoid
   * spurious cursors.
   */
  private _trimSelections(): void {
    for (let i = 0; i < this.widgets.length; i++) {
      if (i !== this._activeCellIndex) {
        let cell = this.widgets[i];
        cell.model.selections.delete(cell.editor.uuid);
      }
    }
  }


  private _activeCellIndex = -1;
  private _activeCell: Cell = null;
  private _mode: NotebookMode = 'command';
  private _drag: Drag = null;
  private _dragData: { pressX: number, pressY: number, index: number } = null;
  private _activeCellChanged = new Signal<this, Cell>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);
  private _selectionChanged = new Signal<this, void>(this);
}


/**
 * The namespace for the `Notebook` class statics.
 */
export
namespace Notebook {
  /**
   * An options object for initializing a notebook widget.
   */
  export
  interface IOptions extends StaticNotebook.IOptions { }

  /**
   * The content factory for the notebook widget.
   */
  export
  interface IContentFactory extends StaticNotebook.IContentFactory { }

  /**
   * The default implementation of a notebook content factory..
   *
   * #### Notes
   * Override methods on this class to customize the default notebook factory
   * methods that create notebook content.
   */
  export
  class ContentFactory extends StaticNotebook.ContentFactory { 

    /**
     * Create a new input/output collapser for the parent widget.
     */
    createCollapser(): ICollapser {
      console.log('createCollapser');
      return new ClickableCollapser();
    }

  }

  /**
   * A namespace for the notebook content factory.
   */
  export
  namespace ContentFactory {
    /**
     * An options object for initializing a notebook content factory.
     */
    export
    interface IOptions extends StaticNotebook.ContentFactory.IOptions { }
  }

  export
  const defaultContentFactory: IContentFactory = new ContentFactory();
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for the selected state of a cell.
   */
  export
  const selectedProperty = new AttachedProperty<Cell, boolean>({
    name: 'selected',
    create: () => false
  });

  /**
   * A custom panel layout for the notebook.
   */
  export
  class NotebookPanelLayout extends PanelLayout {
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
  export
  function createDragImage(count: number, promptNumber: string, cellContent: string): HTMLElement {
    if (count > 1) {
      if (promptNumber !== '') {
        return VirtualDOM.realize(
          h.div(
            h.div({className: DRAG_IMAGE_CLASS},
              h.span({className: CELL_DRAG_PROMPT_CLASS}, "In [" + promptNumber + "]:"),
              h.span({className: CELL_DRAG_CONTENT_CLASS}, cellContent)),
            h.div({className: CELL_DRAG_MULTIPLE_BACK}, "")
          )
        );
      } else {
        return VirtualDOM.realize(
          h.div(
            h.div({className: DRAG_IMAGE_CLASS},
              h.span({className: CELL_DRAG_PROMPT_CLASS}),
              h.span({className: CELL_DRAG_CONTENT_CLASS}, cellContent)),
            h.div({className: CELL_DRAG_MULTIPLE_BACK}, "")
          )
        );
      }
    } else {
      if (promptNumber !== '') {
        return VirtualDOM.realize(
          h.div(
            h.div({className: `${DRAG_IMAGE_CLASS} ${SINGLE_DRAG_IMAGE_CLASS}`},
              h.span({className: CELL_DRAG_PROMPT_CLASS}, "In [" + promptNumber + "]:"),
              h.span({className: CELL_DRAG_CONTENT_CLASS}, cellContent)
            )
          )
        );
      } else {
        return VirtualDOM.realize(
          h.div(
            h.div({className: `${DRAG_IMAGE_CLASS} ${SINGLE_DRAG_IMAGE_CLASS}`},
              h.span({className: CELL_DRAG_PROMPT_CLASS}),
              h.span({className: CELL_DRAG_CONTENT_CLASS}, cellContent)
            )
          )
        );
      }
    }
  }

  /**
   * Process the `IOptions` passed to the notebook widget.
   *
   * #### Notes
   * This defaults the content factory to that in the `Notebook` namespace.
   */
  export
  function processNotebookOptions(options: Notebook.IOptions) {
    if (options.contentFactory) {
      return options;
    } else {
      return {
        rendermime: options.rendermime,
        languagePreference: options.languagePreference,
        contentFactory: Notebook.defaultContentFactory,
        mimeTypeService: options.mimeTypeService

      }
    }
  }
}


/**
 * Default implementation of the collapser.
 */
export
class ClickableCollapser extends Widget implements ICollapser {
  constructor() {
    super();
    console.log("ClickableCollapser");
  }

  handleEvent(event: Event): void {
    console.log("handleEvent", event);
    if (!this.parent) {
      return;
    }
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  private _evtClick(event: MouseEvent) {
    console.log("_evtClick");
    let cell = this.parent.parent as Cell;
    console.log("parent", cell);
    cell.sourceHidden = !cell.sourceHidden;
  }

    /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    console.log("onAfterAttach");
    let node = this.node;
    node.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    console.log("onBeforeDetach");
    node.removeEventListener('click', this);
  }

}
