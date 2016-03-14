// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  KernelStatus
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  IObservableList, ObservableList, IListChangedArgs, ListChangeType
} from 'phosphor-observablelist';

import {
  Widget
} from 'phosphor-widget';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  ICellModel, BaseCellWidget,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, MarkdownCellModel, isMarkdownCellModel,
  RawCellModel, RawCellWidget
} from '../cells';

import {
  NotebookManager
} from './manager';

import {
  NotebookModel, INotebookModel
} from './model';

import {
  INotebookMetadata
} from './nbformat';

import './codemirror-ipython';
import './codemirror-ipythongfm';


/**
 * The class name added to notebook widgets.
 */
const NB_CLASS = 'jp-Notebook';

/**
 * The class name added to notebook container widget.
 */
const NB_CONTAINER = 'jp-Notebook-Container';

/**
 * The class name added to notebook cell widget.
 */
const NB_CELLS = 'jp-Notebook-Cells';

/**
 * The class name added to notebook widget cells.
 */
const NB_CELL_CLASS = 'jp-Notebook-cell';

/**
 * The class name added to the notebook toolbar.
 */
const NB_TOOLBAR = 'jp-NBToolbar';

/**
 * The class name added to notebook toolbar items.
 */
const TOOLBAR_ITEM = 'jp-NBToolbar-item';

/**
 * The class name added to notebook toolbar buttons.
 */
const TOOLBAR_BUTTON = 'jp-NBToolbar-button';

/**
 * The class name added to toolbar save button.
 */
const TOOLBAR_SAVE = 'jp-NBToolbar-save';

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_INSERT = 'jp-NBToolbar-insert';

/**
 * The class name added to toolbar cut button.
 */
const TOOLBAR_CUT = 'jp-NBToolbar-cut';

/**
 * The class name added to toolbar copy button.
 */
const TOOLBAR_COPY = 'jp-NBToolbar-copy';

/**
 * The class name added to toolbar paste button.
 */
const TOOLBAR_PASTE = 'jp-NBToolbar-paste';

/**
 * The class name added to toolbar run button.
 */
const TOOLBAR_RUN = 'jp-NBToolbar-run';

/**
 * The class name added to toolbar interrupt button.
 */
const TOOLBAR_INTERRUPT = 'jp-NBToolbar-interrupt';

/**
 * The class name added to toolbar restart button.
 */
const TOOLBAR_RESTART = 'jp-NBToolbar-restart';

/**
 * The class name added to toolbar cell type dropdown.
 */
const TOOLBAR_CELL = 'jp-NBToolbar-cellType';

/**
 * The class name added to toolbar kernel name text.
 */
const TOOLBAR_KERNEL = 'jp-NBToolbar-kernelName';

/**
 * The class name added to toolbar kernel indicator icon.
 */
const TOOLBAR_INDICATOR = 'jp-NBToolbar-kernelIndicator';

/**
 * The class name added to a pressed button.
 */
const TOOLBAR_PRESSED = 'jp-mod-pressed';

/**
 * The class name added to a busy kernel indicator.
 */
const TOOLBAR_BUSY = 'jp-mod-busy';

/**
 * The class name added to a notebook in edit mode.
 */
const EDIT_CLASS = 'jp-mod-editMode';

/**
 * The class name added to a notebook in command mode.
 */
const COMMAND_CLASS = 'jp-mod-commandMode';

/**
 * The class name added to notebook editor instances.
 */
const NB_EDITOR_CLASS = 'jp-Notebook-editor';

/**
 * The class name added to the active cell.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class name added to selected cells.
 */
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The maximum size of the delete stack.
 */
const DELETE_STACK_SIZE = 10;


/**
 * A basic widget for a notebook.
 */
export
class NotebookWidget extends Widget {
  /**
   * Create a new cell widget given a cell model.
   */
  static createCell(cell: ICellModel): BaseCellWidget {
    let widget: BaseCellWidget;
    switch(cell.type) {
    case 'code':
      widget = new CodeCellWidget(cell as CodeCellModel);
      break;
    case 'markdown':
      widget = new MarkdownCellWidget(cell as MarkdownCellModel);
      break;
    case 'raw':
      widget = new RawCellWidget(cell as RawCellModel);
      break;
    default:
      // If there are any issues, just return a blank placeholder
      // widget so the lists stay in sync.
      widget = new BaseCellWidget(cell);
    }
    return widget;
  }

  /**
   * Construct a notebook widget.
   */
  constructor(model: INotebookModel) {
    super();
    this._model = model;
    let constructor = this.constructor as typeof NotebookWidget;
    this.layout = new PanelLayout();
    let layout = this.layout as PanelLayout;
    let container = new Widget();
    container.addClass(NB_CONTAINER);
    container.layout = new PanelLayout();
    this._cells = new NotebookCells(model);
    (container.layout as PanelLayout).addChild(this._cells);
    layout.addChild(container);

    let cellsLayout = this._cells.layout as PanelLayout;
    let factory = constructor.createCell;
    for (let i = 0; i < model.cells.length; i++) {
      cellsLayout.addChild(factory(model.cells.get(i)));
    }
    model.cells.changed.connect(this.onCellsChanged, this);
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
   * The notebook cells widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get cells(): NotebookCells {
    return this._cells;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._model.dispose();
    this._model = null;
    super.dispose();
  }

  /**
   * Handle a change cells event.  This function must be on this class
   * because it uses the static [createCell] method.
   */
  protected onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    let layout = this._cells.layout as PanelLayout;
    let constructor = this.constructor as typeof NotebookWidget;
    let factory = constructor.createCell;
    let widget: BaseCellWidget;
    switch(args.type) {
    case ListChangeType.Add:
      widget = factory(args.newValue as ICellModel);
      widget.addClass(NB_CELL_CLASS);
      widget.input.editor.addClass(NB_EDITOR_CLASS);
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
      for (let i = args.oldIndex; i < oldValues.length; i++) {
        widget = layout.childAt(args.oldIndex) as BaseCellWidget;
        layout.removeChild(widget);
        widget.dispose();
      }
      let newValues = args.newValue as ICellModel[];
      for (let i = newValues.length; i < 0; i--) {
        widget = factory(newValues[i]);
        widget.addClass(NB_CELL_CLASS);
        widget.input.editor.addClass(NB_EDITOR_CLASS);
        layout.insertChild(args.newIndex, widget);
      }
      break;
    case ListChangeType.Set:
      widget = layout.childAt(args.newIndex) as BaseCellWidget;
      layout.removeChild(widget);
      widget.dispose();
      widget = factory(args.newValue as ICellModel);
      layout.insertChild(args.newIndex, widget);
      widget.addClass(NB_CELL_CLASS);
      widget.input.editor.addClass(NB_EDITOR_CLASS);
      break;
    }
    this.update();
  }

  private _model: INotebookModel = null;
  private _cells: NotebookCells = null;
}


/**
 * A notebook widget which supports interactivity with and a toolbar.
 */
export
class ActiveNotebook extends NotebookWidget {
  /**
   * Create a new toolbar for the notebook.
   */
  static createToolbar(manager: NotebookManager): NotebookToolbar {
    return new NotebookToolbar(manager);
  }

  /**
   * Construct a notebook widget.
   */
  constructor(manager: NotebookManager) {
    super(manager.model);
    this.addClass(NB_CLASS);
    this.node.tabIndex = -1;  // Allow the widget to take focus.
    let constructor = this.constructor as typeof ActiveNotebook;
    this._toolbar = constructor.createToolbar(manager);
    let layout = this.layout as PanelLayout;
    layout.insertChild(0, this._toolbar);
    manager.model.stateChanged.connect(this.onModelChanged, this);
  }

  /**
   * Get the toolbar used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get toolbar(): NotebookToolbar {
    return this._toolbar;
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    // Set the appropriate classes on the cells.
    let model = this.model;
    let layout = this.cells.layout as PanelLayout;
    let widget = layout.childAt(model.activeCellIndex) as BaseCellWidget;
    if (model.mode === 'edit') {
      this.addClass(EDIT_CLASS);
      this.removeClass(COMMAND_CLASS);
      if (widget) {
        widget.input.editor.focus();
      }
    } else {
      this.addClass(COMMAND_CLASS);
      this.removeClass(EDIT_CLASS);
      this.node.focus();
    }
    if (widget) {
      widget.addClass(ACTIVE_CLASS);
    }
    for (let i = 0; i < layout.childCount(); i++) {
      let cell = model.cells.get(i);
      widget = layout.childAt(i) as BaseCellWidget;
      if (i !== model.activeCellIndex) {
        widget.removeClass(ACTIVE_CLASS);
      }
      if (i === model.activeCellIndex || model.isSelected(cell)) {
        widget.addClass(SELECTED_CLASS);
      } else {
        widget.removeClass(SELECTED_CLASS);
      }
    }
  }

  /**
   * Handle changes to the notebook model.
   */
  protected onModelChanged(model: INotebookModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'mode':
      this.update();
      break;
    case 'activeCellIndex':
      this.update();
      break;
    }
  }

  private _toolbar: NotebookToolbar = null;
}


/**
 * A widget holding the notebook cells.
 */
export
class NotebookCells extends Widget {
  /**
   * Construct a notebook cells widget.
   */
  constructor(model: INotebookModel) {
    super();
    this.addClass(NB_CELLS);
    this._model = model;
    this.layout = new PanelLayout();
    model.stateChanged.connect(this.onModelChanged, this);
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
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }    
    this._model.dispose();
    this._model = null;
    super.dispose();
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
    case 'blur':
      this._evtBlur(event);
      break;
    case 'focus':
      this._evtFocus(event);
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.node.addEventListener('dblclick', this);
    this.node.addEventListener('focus', this, true);
    this.node.addEventListener('blur', this, true);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('dblclick', this);
    this.node.removeEventListener('focus', this, true);
    this.node.removeEventListener('blur', this, true);
  }

  /**
   * Find the cell index containing the target html element.
   *
   * #### Notes
   * Returns -1 if the cell is not found.
   */
  protected findCell(node: HTMLElement): number {
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
   * Handle changes to the model.
   */
  protected onModelChanged(model: INotebookModel, args: IChangedArgs<any>): void {
    if (args.name === 'activeCellIndex') {
      let layout = this.layout as PanelLayout;
      let child = layout.childAt(args.newValue);
      if (!child) {
        return;
      }
      Private.scrollIfNeeded(this.parent.node, child.node);
    }
  }

  /**
   * Handle `click` events for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    let model = this.model;
    if (!model.readOnly) {
      let i = this.findCell(event.target as HTMLElement);
      if (i === -1) {
        return;
      }
      model.activeCellIndex = i;
    }
  }

  /**
   * Handle `dblclick` events for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    let model = this._model;
    if (model.readOnly) {
      return;
    }
    let i = this.findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    let cell = model.cells.get(i);
    if (isMarkdownCellModel(cell) && cell.rendered) {
      cell.rendered = false;
      model.mode = 'edit';
    }
  }

  /**
   * Handle `blur` events for the widget.
   */
  private _evtBlur(event: Event): void {
    let layout = this.layout as PanelLayout;
    let node = event.target as HTMLElement;
    // Trace up the DOM hierarchy looking for an editor node.
    while (node && node !== this.node) {
      if (node.classList.contains(NB_EDITOR_CLASS)) {
        this.model.mode = 'command';
        break;
      }
      node = node.parentElement;
    }
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocus(event: Event): void {
    let layout = this.layout as PanelLayout;
    let node = event.target as HTMLElement;
    let found = false;
    // Trace up the DOM hierarchy to looking for an editor node.
    // Then find the corresponding child and activate it.
    while (node && node !== this.node) {
      if (node.classList.contains(NB_EDITOR_CLASS)) {
        this.model.mode = 'edit';
        this.model.activeCellIndex = this.findCell(node);
        break;
      }
      node = node.parentElement;
    }
  }

  private _model: INotebookModel = null;
}


/**
 * A class which provides a notebook toolbar widget.
 */
export
class NotebookToolbar extends Widget {
  /**
   * Create a new node for the widget.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let names = [TOOLBAR_SAVE, TOOLBAR_INSERT, TOOLBAR_CUT,
                 TOOLBAR_COPY, TOOLBAR_PASTE,
                 TOOLBAR_RUN, TOOLBAR_INTERRUPT,
                 TOOLBAR_RESTART, TOOLBAR_CELL, 
                 TOOLBAR_KERNEL, TOOLBAR_INDICATOR];
    for (let name of names) {
      let el: HTMLElement;
      if (name === TOOLBAR_CELL) {
        el = document.createElement('select');
        for (let t of ['Code', 'Markdown', 'Raw']) {
          let option = document.createElement('option');
          option.value = t.toLowerCase();
          option.textContent = t;
          el.appendChild(option);
        }
      } else {
        el = document.createElement('span');
      }
      el.className = name;
      el.classList.add(TOOLBAR_ITEM);
      let nonButtons = [TOOLBAR_CELL, TOOLBAR_KERNEL, TOOLBAR_INDICATOR];
      if (nonButtons.indexOf(name) === -1) {
        el.classList.add(TOOLBAR_BUTTON);
      }
      node.appendChild(el);
    }
    return node;
  }

  /**
   * Construct a new toolbar widget.
   */
  constructor(manager: NotebookManager) {
    super();
    this.addClass(NB_TOOLBAR);
    this._manager = manager;
    let model = this._model = manager.model;
    if (model.metadata && model.metadata.kernelspec) {
      this.kernelNameNode.textContent = model.metadata.kernelspec.display_name;
    } else {
      this.kernelNameNode.textContent = 'No Kernel!';
    }
    if (model.cells.length) {
      let cell = model.cells.get(model.activeCellIndex);
      this.cellTypeNode.value = cell.type;
    }
    this.cellTypeNode.addEventListener('change', event => {
      manager.changeCellType(this.cellTypeNode.value);
    });
    if (model.session) {
      this.handleSession();
    } else {
      this.kernelIndicatorNode.classList.add(TOOLBAR_BUSY);
    }
    model.stateChanged.connect(this.onModelChanged, this);
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._model;
  }

  /**
   * Get the kernel name node.
   */
  get kernelNameNode(): HTMLElement {
    let node = this.node.getElementsByClassName(TOOLBAR_KERNEL)[0];
    return node as HTMLElement;
  }

  /**
   * Get the cell selector node.
   */
  get cellTypeNode(): HTMLSelectElement {
    let node = this.node.getElementsByClassName(TOOLBAR_CELL)[0];
    return node as HTMLSelectElement;
  }

  /**
   * Get the kernel status indicator node.
   */
  get kernelIndicatorNode(): HTMLElement {
    let node = this.node.getElementsByClassName(TOOLBAR_INDICATOR)[0];
    return node as HTMLElement;
  }

  /*
   * Restart the kernel with a confirmation dialog.
   */
   restart(): Promise<void> {
    return showDialog({
      title: 'Restart Kernel?',
      body: 'Do you want to restart the current kernel? All variables will be lost.',
      host: this.parent.node
    }).then(result => {
      if (result.text === 'OK') {
        return this._manager.restart();
      }
    });
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
    let node: HTMLElement;
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    case 'mousedown':
      node = event.target as HTMLElement;
      if (node.classList.contains(TOOLBAR_BUTTON)) {
        node.classList.add(TOOLBAR_PRESSED);
      }
      break;
    case 'mouseup':
    case 'mouseout':
      let nodes = this.node.childNodes;
      for (let i = 0; i < nodes.length; i++) {
        node = nodes[i] as HTMLElement;
        node.classList.remove(TOOLBAR_PRESSED);
      }
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('mouseup', this);
    this.node.addEventListener('mouseout', this);
  }

  /**
   * Handle changes to the model.
   */
  protected onModelChanged(model: INotebookModel, args: IChangedArgs<any>): void {
    switch(args.name) {
    case 'metadata':
      if (model.metadata && model.metadata.kernelspec) {
        let name = model.metadata.kernelspec.display_name;
        this.kernelNameNode.textContent = name;
      }
      break;
    case 'activeCellIndex':
      let cell = model.cells.get(model.activeCellIndex);
      this.cellTypeNode.value = cell.type;
      break;
    case 'session':
      this.handleSession();
      break;
    }
  }

  /**
   * Handle a change to the session.
   */
  protected handleSession(): void {
    let node = this.kernelIndicatorNode;
    let session = this.model.session;
    session.statusChanged.connect((sender, status) => {
      if (status === KernelStatus.Idle) {
        node.classList.remove(TOOLBAR_BUSY);
      } else {
        node.classList.add(TOOLBAR_BUSY);
      }
    });
    if (session.status === KernelStatus.Idle) {
      node.classList.remove(TOOLBAR_BUSY);
    } else {
      node.classList.add(TOOLBAR_BUSY);
    }
  }

  /**
   * Handle `click` events for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    let  names = [TOOLBAR_SAVE, TOOLBAR_INSERT, TOOLBAR_CUT,
                  TOOLBAR_COPY, TOOLBAR_PASTE,
                  TOOLBAR_RUN, TOOLBAR_INTERRUPT,
                  TOOLBAR_RESTART, TOOLBAR_CELL, 
                  TOOLBAR_KERNEL, TOOLBAR_INDICATOR];
    let selected = '';
    for (let name of names) {
      if ((event.target as HTMLElement).className.indexOf(name) !== -1) {
        selected = name;
        break;
      }
    }
    let index: number;
    let manager = this._manager;
    switch (selected) {
    case TOOLBAR_SAVE:
      manager.save();
      break;
    case TOOLBAR_INSERT:
      manager.insertBelow();
      break;
    case TOOLBAR_CUT:
      manager.cut();
      break;
    case TOOLBAR_COPY:
      manager.copy();
      break;
    case TOOLBAR_PASTE:
      manager.paste();
      break;
    case TOOLBAR_RUN:
      manager.run();
      break;
    case TOOLBAR_INTERRUPT:
      manager.interrupt();
      break;
    case TOOLBAR_RESTART:
      this.restart();
      break;
    }
  }

  private _manager: NotebookManager = null;
  private _model: INotebookModel = null;
}


/**
 * A namespace for Notebook widget private data.
 */
namespace Private {
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
