// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernelLanguageInfo
} from 'jupyter-js-services';

import {
  RenderMime
} from '../../rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  IObservableList, IListChangedArgs, ListChangeType
} from 'phosphor-observablelist';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Property, IChangedArgs
} from 'phosphor-properties';

import {
  Signal, ISignal
} from 'phosphor-signaling';

import {
  ChildMessage, Widget
} from 'phosphor-widget';

import {
  ICellModel, BaseCellWidget, MarkdownCellModel,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, RawCellWidget, RawCellModel,
  ICodeCellModel, IMarkdownCellModel, IRawCellModel
} from '../cells';

import {
  mimetypeForLanguage
} from '../common/mimetype';

import {
  EdgeLocation
} from '../cells/editor';

import {
  INotebookModel
} from './model';

import {
  nbformat
} from './nbformat';


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
    this.node.tabIndex = -1;  // Allow the widget to take focus.
    this.addClass(NB_CLASS);
    this._rendermime = options.rendermime;
    this.layout = new PanelLayout();
    this._renderer = options.renderer || StaticNotebook.defaultRenderer;
  }

  /**
   * A signal emitted when the model of the notebook changes.
   */
  get modelChanged(): ISignal<StaticNotebook, void> {
    return Private.modelChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the widget has changed.
   */
  get changed(): ISignal<StaticNotebook, void> {
    return Private.changedSignal.bind(this);
  }

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
    // Trigger private, protected, and public changes.
    this._onModelChanged(oldValue, newValue);
    this.onModelChanged(oldValue, newValue);
    this.modelChanged.emit(void 0);
    this.changed.emit(void 0);
  }

  /**
   * Get the rendermime instance used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendermime(): RenderMime<Widget> {
    return this._rendermime;
  }

  /**
   * Get the renderer used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get renderer(): StaticNotebook.IRenderer {
    return this._renderer;
  }

  /**
   * Get the mimetype for code cells.
   *
   * #### Notes
   * This is a read-only property.
   */
  get codeMimetype(): string {
    return this._mimetype;
  }

  /**
   * Get the child widget at the specified index.
   */
  childAt(index: number): BaseCellWidget {
    let layout = this.layout as PanelLayout;
    return layout.childAt(index) as BaseCellWidget;
  }

  /**
   * Get the number of child widgets.
   */
  childCount(): number {
    let layout = this.layout as PanelLayout;
    return layout.childCount();
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
    this._rendermime = null;
    this._renderer = null;
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
   * Handle changes to the notebook model metadata.
   */
  protected onMetadataChanged(model: INotebookModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'language_info':
      this._mimetype = this._renderer.getCodeMimetype(model);
      this._updateChildren();
      this.changed.emit(void 0);
      break;
    default:
      break;
    }
  }

  /**
   * Handle a new model on the widget.
   */
  private _onModelChanged(oldValue: INotebookModel, newValue: INotebookModel): void {
    let layout = this.layout as PanelLayout;
    if (oldValue) {
      oldValue.cells.changed.disconnect(this._onCellsChanged, this);
      oldValue.metadataChanged.disconnect(this.onMetadataChanged, this);
      // TODO: reuse existing cell widgets if possible.
      for (let i = 0; i < layout.childCount(); i++) {
        this._removeChild(0);
      }
    }
    if (!newValue) {
      this._mimetype = 'text/plain';
      return;
    }
    this._mimetype = this._renderer.getCodeMimetype(newValue);
    let cells = newValue.cells;
    for (let i = 0; i < cells.length; i++) {
      this._insertChild(i, cells.get(i));
    }
    cells.changed.connect(this._onCellsChanged, this);
    newValue.metadataChanged.connect(this.onMetadataChanged, this);
  }

  /**
   * Create a child widget and insert into the notebook.
   */
  private _insertChild(index: number, cell: ICellModel): void {
    let widget: BaseCellWidget;
    switch (cell.type) {
    case 'code':
      let codeFactory = this._renderer.createCodeCell;
      widget = codeFactory(cell as CodeCellModel, this._rendermime);
      break;
    case 'markdown':
      let mdFactory = this._renderer.createMarkdownCell;
      widget = mdFactory(cell as MarkdownCellModel, this._rendermime);
      break;
    default:
      widget = this._renderer.createRawCell(cell as RawCellModel);
    }
    widget.addClass(NB_CELL_CLASS);
    let layout = this.layout as PanelLayout;
    layout.insertChild(index, widget);
    this._updateChild(index);
  }

  /**
   * Update the child widgets.
   */
  private _updateChildren(): void {
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.childCount(); i++) {
      this._updateChild(i);
    }
  }

  /**
   * Update a child widget.
   */
  private _updateChild(index: number): void {
    let layout = this.layout as PanelLayout;
    let child = layout.childAt(index) as BaseCellWidget;
    if (child instanceof CodeCellWidget) {
      child.mimetype = this._mimetype;
    }
    this._renderer.updateCell(child);
  }

  /**
   * Remove a child widget.
   */
  private _removeChild(index: number): void {
    let layout = this.layout as PanelLayout;
    layout.childAt(index).dispose();
  }

  /**
   * Handle a change cells event.
   */
  private _onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    let layout = this.layout as PanelLayout;
    switch (args.type) {
    case ListChangeType.Add:
      this._insertChild(args.newIndex, args.newValue as ICellModel);
      break;
    case ListChangeType.Move:
      layout.insertChild(args.newIndex, layout.childAt(args.oldIndex));
      break;
    case ListChangeType.Remove:
      this._removeChild(args.oldIndex);
      break;
    case ListChangeType.Replace:
      // TODO: reuse existing cell widgets if possible.
      let oldValues = args.oldValue as ICellModel[];
      for (let i = 0; i < oldValues.length; i++) {
        this._removeChild(args.oldIndex);
      }
      let newValues = args.newValue as ICellModel[];
      for (let i = newValues.length; i > 0; i--) {
        this._insertChild(args.newIndex, newValues[i - 1]);
      }
      break;
    case ListChangeType.Set:
      // TODO: reuse existing widget if possible.
      this._removeChild(args.newIndex);
      this._insertChild(args.newIndex, args.newValue as ICellModel);
      break;
    default:
      return;
    }
    this.changed.emit(void 0);
  }

  private _mimetype = 'text/plain';
  private _model: INotebookModel = null;
  private _rendermime: RenderMime<Widget> = null;
  private _renderer: StaticNotebook.IRenderer = null;
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
    rendermime: RenderMime<Widget>;

    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * A renderer for a notebook.
     *
     * The default is a shared renderer instance.
     */
    renderer?: IRenderer;
  }

  /**
   * A factory for creating code cell widgets.
   */
  export
  interface IRenderer {
    /**
     * Create a new code cell widget.
     */
    createCodeCell(model: ICodeCellModel, rendermime: RenderMime<Widget>): CodeCellWidget;

    /**
     * Create a new markdown cell widget.
     */
    createMarkdownCell(model: IMarkdownCellModel, rendermime: RenderMime<Widget>): MarkdownCellWidget;

    /**
     * Create a new raw cell widget.
     */
    createRawCell(model: IRawCellModel): RawCellWidget;

    /**
     * Update a cell widget.
     */
    updateCell(cell: BaseCellWidget): void;

    /**
     * Get the preferred mime type for code cells in the notebook.
     *
     * #### Notes
     * The model is guaranteed to be non-null.
     */
    getCodeMimetype(model: INotebookModel): string;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create a new code cell widget.
     */
    createCodeCell(model: ICodeCellModel, rendermime: RenderMime<Widget>): CodeCellWidget {
      let widget = new CodeCellWidget({ rendermime });
      widget.model = model;
      return widget;
    }

    /**
     * Create a new markdown cell widget.
     */
    createMarkdownCell(model: IMarkdownCellModel, rendermime: RenderMime<Widget>): MarkdownCellWidget {
      let widget = new MarkdownCellWidget({ rendermime });
      widget.model = model;
      return widget;
    }

    /**
     * Create a new raw cell widget.
     */
    createRawCell(model: IRawCellModel): RawCellWidget {
      let widget = new RawCellWidget();
      widget.model = model;
      return widget;
    }

    /**
     * Update a cell widget.
     *
     * #### Notes
     * The base implementation is a no-op.
     */
    updateCell(cell: BaseCellWidget): void { }

    /**
     * Get the preferred mimetype for code cells in the notebook.
     *
     * #### Notes
     * The model is guaranteed to be non-null.
     */
    getCodeMimetype(model: INotebookModel): string {
      let cursor = model.getMetadata('language_info');
      let info = cursor.getValue() as nbformat.ILanguageInfoMetadata;
      return mimetypeForLanguage(info as IKernelLanguageInfo);
    }
  }

  /**
   * The default `IRenderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * A notebook widget that supports interactivity.
 */
export
class Notebook extends StaticNotebook {
  /**
   * A signal emitted when the state of the notebook changes.
   */
  get stateChanged(): ISignal<Notebook, IChangedArgs<any>> {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * The interactivity mode of the notebook.
   */
  get mode(): NotebookMode {
    return this._mode;
  }
  set mode(newValue: NotebookMode) {
    if (newValue === this._mode) {
      return;
    }
    let oldValue = this._mode;
    this._mode = newValue;
    // Edit mode deselects all cells.
    if (newValue === 'edit') {
      let layout = this.layout as PanelLayout;
      for (let i = 0; i < layout.childCount(); i++) {
        let widget = layout.childAt(i) as BaseCellWidget;
        this.deselect(widget);
      }
    }
    this.stateChanged.emit({ name: 'mode', oldValue, newValue });
    this.update();
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
    if (!this.model || !this.model.cells.length) {
      return;
    }
    newValue = Math.max(newValue, 0);
    newValue = Math.min(newValue, this.model.cells.length - 1);
    if (newValue === this._activeCellIndex) {
      return;
    }
    let oldValue = this._activeCellIndex;
    this._activeCellIndex = newValue;
    this.stateChanged.emit({ name: 'activeCellIndex', oldValue, newValue });
    this.update();
  }

  /**
   * Select a cell widget.
   */
  select(widget: BaseCellWidget): void {
    Private.selectedProperty.set(widget, true);
    this.update();
  }

  /**
   * Deselect a cell widget.
   *
   * #### Notes
   * This has no effect on the "active" cell.
   */
  deselect(widget: BaseCellWidget): void {
    Private.selectedProperty.set(widget, false);
    this.update();
  }

  /**
   * Whether a cell is selected or is the active cell.
   */
  isSelected(widget: BaseCellWidget): boolean {
    let layout = this.layout as PanelLayout;
    if (layout.childAt(this._activeCellIndex) === widget) {
      return true;
    }
    return Private.selectedProperty.get(widget);
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    case 'dblclick':
      this._evtDblClick(event as MouseEvent);
      break;
    case 'focus':
      this._evtFocus(event as FocusEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
    this.node.addEventListener('dblclick', this);
    this.node.addEventListener('focus', this, true);
    this.update();
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('dblclick', this);
    this.node.removeEventListener('focus', this, true);
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    // Set the appropriate classes on the cells.
    let layout = this.layout as PanelLayout;
    let widget = layout.childAt(this.activeCellIndex) as BaseCellWidget;
    if (this.mode === 'edit') {
      this.addClass(EDIT_CLASS);
      this.removeClass(COMMAND_CLASS);
      if (widget) {
        widget.focus();
        if (widget instanceof MarkdownCellWidget) {
          (widget as MarkdownCellWidget).rendered = false;
        }
      }
    } else {
      this.addClass(COMMAND_CLASS);
      this.removeClass(EDIT_CLASS);
      this.node.focus();
    }
    if (widget) {
      widget.addClass(ACTIVE_CLASS);
      if (this.parent) {
        Private.scrollIfNeeded(this.parent.node, widget.node);
      }
    }

    let count = 0;
    for (let i = 0; i < layout.childCount(); i++) {
      widget = layout.childAt(i) as BaseCellWidget;
      if (i !== this.activeCellIndex) {
        widget.removeClass(ACTIVE_CLASS);
      }
      widget.removeClass(OTHER_SELECTED_CLASS);
      if (this.isSelected(widget)) {
        widget.addClass(SELECTED_CLASS);
        count++;
      } else {
        widget.removeClass(SELECTED_CLASS);
      }
    }
    if (count > 1) {
      widget = layout.childAt(this.activeCellIndex) as BaseCellWidget;
      widget.addClass(OTHER_SELECTED_CLASS);
    }

  }

  /**
   * Handle a `child-added` message.
   */
  protected onChildAdded(msg: ChildMessage): void {
    let widget = msg.child as BaseCellWidget;
    widget.editor.edgeRequested.connect(this._onEdgeRequest, this);
    this.update();
  }

  /**
   * Handle a `child-removed` message.
   */
  protected onChildRemoved(msg: ChildMessage): void {
    this.update();
  }

  /**
   * Handle edge request signals from cells.
   */
  private _onEdgeRequest(widget: Widget, location: EdgeLocation): void {
    if (location === 'top') {
      this.activeCellIndex--;
    } else {
      this.activeCellIndex++;
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
    let layout = this.layout as PanelLayout;
    while (node && node !== this.node) {
      if (node.classList.contains(NB_CELL_CLASS)) {
        for (let i = 0; i < layout.childCount(); i++) {
          if (layout.childAt(i).node === node) {
            return i;
          }
        }
        break;
      }
      node = node.parentElement;
    }
    return -1;
  }

  /**
   * Handle `click` events for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    let model = this.model;
    if (!model || model.readOnly) {
      return;
    }
    let i = this._findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    this.activeCellIndex = i;
  }

  /**
   * Handle `dblclick` events for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    let model = this.model;
    if (!model || model.readOnly) {
      return;
    }
    let i = this._findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    let cell = model.cells.get(i) as MarkdownCellModel;
    let widget = (this.layout as PanelLayout).childAt(i) as MarkdownCellWidget;
    if (cell.type === 'markdown') {
      widget.rendered = false;
      return;
    }
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocus(event: FocusEvent): void {
    if (event.target === this.node) {
      this.mode = 'command';
    } else {
      this.mode = 'edit';
    }
  }

  private _mode: NotebookMode = 'command';
  private _activeCellIndex = 0;
}


/**
 * The namespace for the `Notebook` class statics.
 */
export
namespace Notebook {
  /**
   * An options object for initializing a notebook.
   */
  export
  interface IOptions extends StaticNotebook.IOptions { }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer extends StaticNotebook.Renderer { }

  /**
   * The default `IRenderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for the selected state of a cell.
   */
  export
  const selectedProperty = new Property<BaseCellWidget, boolean>({
    name: 'selected',
    value: false
  });

  /**
   * A signal emitted when the model changes on the notebook.
   */
  export
  const modelChangedSignal = new Signal<StaticNotebook, void>();


  /**
   * A signal emitted when the state changes on the notebook.
   */
  export
  const stateChangedSignal = new Signal<Notebook, IChangedArgs<any>>();

  /**
   * A signal emitted when the widget has changed.
   */
  export
  const changedSignal = new Signal<StaticNotebook, void>();

  /**
   * Scroll an element into view if needed.
   *
   * @param area - The scroll area element.
   *
   * @param elem - The element of interest.
   */
  export
  function scrollIfNeeded(area: HTMLElement, elem: HTMLElement): void {
    let ar = area.getBoundingClientRect();
    let er = elem.getBoundingClientRect();
    if (er.top < ar.top - 10) {
      area.scrollTop -= ar.top - er.top + 10;
    } else if (er.bottom > ar.bottom + 10) {
      area.scrollTop += er.bottom - ar.bottom + 10;
    }
  }
}
