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
  Widget
} from 'phosphor-widget';

import {
  ICellModel, BaseCellWidget, MarkdownCellModel,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, RawCellWidget
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
 * A widget which renders notebooks.
 */
export
class NotebookRenderer extends Widget {
  /**
   * Create a new cell widget given a cell model.
   */
  static createCell(cell: ICellModel, rendermime: RenderMime<Widget>): BaseCellWidget {
    switch (cell.type) {
    case 'code':
      return new CodeCellWidget(cell as CodeCellModel, rendermime);
    case 'markdown':
      return new MarkdownCellWidget(cell, rendermime);
    // If there are any issues, just return a raw
    // widget so the lists stay in sync.
    default:
      return new RawCellWidget(cell);
    }
  }

  /**
   * Construct a notebook widget.
   */
  constructor(model: INotebookModel, rendermime: RenderMime<Widget>) {
    super();
    this.node.tabIndex = -1;  // Allow the widget to take focus.
    this.addClass(NB_CLASS);
    this._model = model;
    this._rendermime = rendermime;
    this.layout = new PanelLayout();
    this._initialized = false;
  }

  /**
   * Get the model for the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._model;
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
    super.dispose();
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    if (!this._initialized) {
      this.initialize();
      this._initialized = true;
    }
  }

  /**
   * It should initialize the contents of the widget.
   */
  protected initialize(): void {
    let model = this.model;
    let rendermime = this.rendermime;

    // Add the current cells.
    if (model.cells.length === 0) {
      // Add a new code cell if there are no cells.
      let cell = model.createCodeCell();
      model.cells.add(cell);
    }
    let layout = this.layout as PanelLayout;
    let constructor = this.constructor as typeof NotebookRenderer;
    let factory = constructor.createCell;
    for (let i = 0; i < model.cells.length; i++) {
      let widget = factory(model.cells.get(i), rendermime);
      this.initializeCellWidget(widget);
      layout.addChild(widget);
    }
    this.updateMimetypes();
    model.cells.changed.connect(this.onCellsChanged, this);
    model.metadataChanged.connect(this.onMetadataChanged, this);
  }

  /**
   * Handle changes to the notebook model.
   */
  protected onMetadataChanged(model: INotebookModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'language_info':
      this.updateMimetypes();
      break;
    default:
      break;
    }
  }

  /**
   * Handle a change cells event.
   */
  protected onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    let layout = this.layout as PanelLayout;
    let constructor = this.constructor as typeof NotebookRenderer;
    let factory = constructor.createCell;
    let widget: BaseCellWidget;
    switch (args.type) {
    case ListChangeType.Add:
      widget = factory(args.newValue as ICellModel, this._rendermime);
      this.initializeCellWidget(widget);
      layout.insertChild(args.newIndex, widget);
      break;
    case ListChangeType.Move:
      layout.insertChild(args.newIndex, layout.childAt(args.oldIndex));
      break;
    case ListChangeType.Remove:
      widget = layout.childAt(args.oldIndex) as BaseCellWidget;
      layout.removeChild(widget);
      widget.dispose();
      break;
    case ListChangeType.Replace:
      let oldValues = args.oldValue as ICellModel[];
      for (let i = 0; i < oldValues.length; i++) {
        widget = layout.childAt(args.oldIndex) as BaseCellWidget;
        layout.removeChild(widget);
        widget.dispose();
      }
      let newValues = args.newValue as ICellModel[];
      for (let i = newValues.length; i > 0; i--) {
        widget = factory(newValues[i - 1], this._rendermime);
        this.initializeCellWidget(widget);
        layout.insertChild(args.newIndex, widget);
      }
      break;
    case ListChangeType.Set:
      widget = layout.childAt(args.newIndex) as BaseCellWidget;
      layout.removeChild(widget);
      widget.dispose();
      widget = factory(args.newValue as ICellModel, this._rendermime);
      layout.insertChild(args.newIndex, widget);
      this.initializeCellWidget(widget);
      break;
    default:
      return;
    }
    this.update();
  }

  /**
   * Initialize a cell widget.
   */
  protected initializeCellWidget(widget: BaseCellWidget): void {
    widget.addClass(NB_CELL_CLASS);
  }

  /**
   * Update the mimetype of code widgets.
   */
  protected updateMimetypes(): void {
    let cursor = this.model.getMetadata('language_info');
    let info = cursor.getValue() as nbformat.ILanguageInfoMetadata;
    let mimetype = mimetypeForLanguage(info as IKernelLanguageInfo);
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.childCount(); i++) {
      let widget = layout.childAt(i) as CodeCellWidget;
      if (widget instanceof CodeCellWidget) {
        widget.mimetype = mimetype;
      }
    }
  }

  private _model: INotebookModel = null;
  private _rendermime: RenderMime<Widget> = null;
  private _initialized = false;
}


/**
 * A notebook widget that supports interactivity.
 */
export
class ActiveNotebook extends NotebookRenderer {
  /**
   * A signal emitted when the state of the notebook changes.
   */
  get stateChanged(): ISignal<ActiveNotebook, IChangedArgs<any>> {
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
    return this.model.cells.length ? this._activeCellIndex : -1;
  }
  set activeCellIndex(newValue: number) {
    if (!this.model.cells.length) {
      return;
    }
    newValue = Math.max(newValue, 0);
    newValue = Math.min(newValue, this.model.cells.length - 1);
    if (newValue === this._activeCellIndex) {
      return;
    }
    let oldValue = this._activeCellIndex;
    this._activeCellIndex = newValue;
    let widget = (this.layout as PanelLayout).childAt(newValue);
    if (widget instanceof MarkdownCellWidget) {
      if (this.mode === 'edit') {
        widget.rendered = false;
      }
    }
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
    this.update();
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('dblclick', this);
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
      }
      if (widget instanceof MarkdownCellWidget) {
        (widget as MarkdownCellWidget).rendered = false;
      }
    } else {
      this.addClass(COMMAND_CLASS);
      this.removeClass(EDIT_CLASS);
      this.node.focus();
    }
    if (widget) {
      widget.addClass(ACTIVE_CLASS);
      Private.scrollIfNeeded(this.parent.node, widget.node);
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
   * Initialize a cell widget.
   */
  protected initializeCellWidget(widget: BaseCellWidget): void {
    super.initializeCellWidget(widget);
    widget.editor.edgeRequested.connect(this.onEdgeRequest, this);
  }

  /**
   * Handle edge request signals from cells.
   */
  protected onEdgeRequest(widget: Widget, location: EdgeLocation): void {
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
    if (model.readOnly) {
      return;
    }
    let i = this._findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    this.activeCellIndex = i;
    this.mode = document.activeElement === this.node ? 'command' : 'edit';
  }

  /**
   * Handle `dblclick` events for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    let model = this.model;
    if (model.readOnly) {
      return;
    }
    let i = this._findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    let cell = model.cells.get(i) as MarkdownCellModel;
    let widget = (this.layout as PanelLayout).childAt(i) as MarkdownCellWidget;
    if (cell.type !== 'markdown' || !widget.rendered) {
      return;
    }
    if (widget.node.contains(event.target as HTMLElement)) {
      this.mode = 'edit';
    }
  }

  private _mode: NotebookMode = 'command';
  private _activeCellIndex = 0;
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
   * A signal emitted when the state changes on the notebook.
   */
  export
  const stateChangedSignal = new Signal<ActiveNotebook, IChangedArgs<any>>();

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
