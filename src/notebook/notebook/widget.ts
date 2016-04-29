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
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  IObservableList, IListChangedArgs, ListChangeType
} from 'phosphor-observablelist';

import {
  Widget
} from 'phosphor-widget';

import {
  PanelLayout, Panel
} from 'phosphor-panel';

import {
  ICellModel, BaseCellWidget,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, MarkdownCellModel, isMarkdownCellModel,
  RawCellModel, RawCellWidget, IMarkdownCellModel
} from '../cells';

import {
  NotebookManager
} from './manager';

import {
  INotebookModel
} from './model';


/**
 * The class name added to notebook widgets.
 */
const NB_CLASS = 'jp-Notebook';

/**
 * The class name added to notebook container widgets.
 */
const NB_CONTAINER = 'jp-Notebook-container';

/**
 * The class name added to notebook panels.
 */
const NB_PANEL = 'jp-Notebook-panel';

/**
 * The class name added to notebook widget cells.
 */
const NB_CELL_CLASS = 'jp-Notebook-cell';

/**
 * The class name added to notebook toolbars.
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
 * The class name added to toolbar cell type dropdown wrapper.
 */
const TOOLBAR_CELL_WRAP = 'jp-NBToolbar-cellWrapper';

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
 * The class name added to an active cell when there are other selected cells.
 */
const OTHER_SELECTED_CLASS = 'jp-mod-multiSelected';


/**
 * A panel which contains a toolbar and a notebook.
 */
export
class NotebookPanel extends Panel {
  /**
   * Create a new toolbar for the pane.
   */
  static createToolbar(manager: NotebookManager): NotebookToolbar {
    return new NotebookToolbar(manager);
  }

  /**
   * Create a new notebook for the pane.
   */
  static createNotebook(model: INotebookModel, rendermime: RenderMime<Widget>): NotebookWidget {
    return new NotebookWidget(model, rendermime);
  }

  /**
   * Construct a notebook panel.
   */
  constructor(manager: NotebookManager, rendermime: RenderMime<Widget>) {
    super();
    this.addClass(NB_PANEL);
    this._manager = manager;
    let constructor = this.constructor as typeof NotebookPanel;
    this._toolbar = constructor.createToolbar(manager);
    this.addChild(this._toolbar);
    let container = new Panel();
    container.addClass(NB_CONTAINER);
    this._notebook = constructor.createNotebook(manager.model, rendermime);
    container.addChild(this._notebook);
    this.addChild(container);
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
   * Get the notebook used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get notebook(): NotebookWidget {
    return this._notebook;
  }

  /**
   * Get the manager used by the widget.
   */
  get manager(): NotebookManager {
    return this._manager;
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._manager.model;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._toolbar = null;
    this._notebook = null;
    this._manager = null;
    super.dispose();
  }

  private _toolbar: NotebookToolbar = null;
  private _notebook: NotebookWidget = null;
  private _manager: NotebookManager = null;
}


/**
 * A widget holding the notebook cells.
 */
export
class NotebookWidget extends Widget {
  /**
   * Create a new cell widget given a cell model.
   */
  static createCell(cell: ICellModel, rendermime: RenderMime<Widget>): BaseCellWidget {
    let widget: BaseCellWidget;
    switch (cell.type) {
    case 'code':
      widget = new CodeCellWidget(cell as CodeCellModel, rendermime);
      break;
    case 'markdown':
      widget = new MarkdownCellWidget(cell as MarkdownCellModel, rendermime);
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
  constructor(model: INotebookModel, rendermime: RenderMime<Widget>) {
    super();
    this.node.tabIndex = -1;  // Allow the widget to take focus.
    this.addClass(NB_CLASS);
    this._model = model;
    this._rendermime = rendermime;
    this.layout = new PanelLayout();
    let constructor = this.constructor as typeof NotebookWidget;
    let cellsLayout = this.layout as PanelLayout;
    let factory = constructor.createCell;
    for (let i = 0; i < model.cells.length; i++) {
      cellsLayout.addChild(factory(model.cells.get(i), rendermime));
    }
    model.cells.changed.connect(this.onCellsChanged, this);
    model.stateChanged.connect(this.onModelChanged, this);
    model.selectionChanged.connect(this.onSelectionChanged, this);
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
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.node.addEventListener('dblclick', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('dblclick', this);
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
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    // Set the appropriate classes on the cells.
    let model = this.model;
    let layout = this.layout as PanelLayout;
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
    let count = 0;
    for (let i = 0; i < layout.childCount(); i++) {
      let cell = model.cells.get(i);
      widget = layout.childAt(i) as BaseCellWidget;
      if (i !== model.activeCellIndex) {
        widget.removeClass(ACTIVE_CLASS);
      }
      widget.removeClass(OTHER_SELECTED_CLASS);
      if (model.isSelected(cell)) {
        widget.addClass(SELECTED_CLASS);
        count++;
      } else {
        widget.removeClass(SELECTED_CLASS);
      }
    }
    if (count > 1) {
      widget = layout.childAt(model.activeCellIndex) as BaseCellWidget;
      widget.addClass(OTHER_SELECTED_CLASS);
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
      let layout = this.layout as PanelLayout;
      let child = layout.childAt(args.newValue);
      if (!child) {
        return;
      }
      Private.scrollIfNeeded(this.parent.node, child.node);
      this.update();
    }
  }

  /**
   * Handle a change cells event.
   */
  protected onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    let layout = this.layout as PanelLayout;
    let constructor = this.constructor as typeof NotebookWidget;
    let factory = constructor.createCell;
    let widget: BaseCellWidget;
    switch (args.type) {
    case ListChangeType.Add:
      widget = factory(args.newValue as ICellModel, this._rendermime);
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
        widget = factory(newValues[i], this._rendermime);
        widget.addClass(NB_CELL_CLASS);
        widget.input.editor.addClass(NB_EDITOR_CLASS);
        layout.insertChild(args.newIndex, widget);
      }
      break;
    case ListChangeType.Set:
      widget = layout.childAt(args.newIndex) as BaseCellWidget;
      layout.removeChild(widget);
      widget.dispose();
      widget = factory(args.newValue as ICellModel, this._rendermime);
      layout.insertChild(args.newIndex, widget);
      widget.addClass(NB_CELL_CLASS);
      widget.input.editor.addClass(NB_EDITOR_CLASS);
      break;
    }
    this.update();
  }

  /**
   * Handle a change in the model selection.
   */
  protected onSelectionChanged(model: INotebookModel): void {
    this.update();
  }

  /**
   * Handle `click` events for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    let model = this.model;
    if (model.readOnly) {
      return;
    }
    let i = this.findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    model.activeCellIndex = i;
    model.mode = document.activeElement === this.node ? 'command' : 'edit';
  }

  /**
   * Handle `dblclick` events for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    let model = this.model;
    if (model.readOnly) {
      return;
    }
    let i = this.findCell(event.target as HTMLElement);
    if (i === -1) {
      return;
    }
    let cell = model.cells.get(i) as IMarkdownCellModel;
    if (!isMarkdownCellModel(cell) || !cell.rendered) {
      return;
    }
    let child = (this.layout as PanelLayout).childAt(i);
    let node = (child as MarkdownCellWidget).rendered.node;
    if (node.contains(event.target as HTMLElement)) {
      cell.rendered = false;
      model.mode = 'edit';
    }
  }

  private _model: INotebookModel = null;
  private _rendermime: RenderMime<Widget> = null;
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
                 TOOLBAR_RESTART, TOOLBAR_CELL_WRAP,
                 TOOLBAR_KERNEL, TOOLBAR_INDICATOR];
    for (let name of names) {
      let el: HTMLElement;
      if (name === TOOLBAR_CELL_WRAP) {
        el = document.createElement('div');
        let select = document.createElement('select');
        for (let t of ['Code', 'Markdown', 'Raw']) {
          let option = document.createElement('option');
          option.value = t.toLowerCase();
          option.textContent = t;
          select.appendChild(option);
        }
        select.className = `${TOOLBAR_CELL} ${TOOLBAR_ITEM}`;
        el.appendChild(select);
      } else {
        el = document.createElement('span');
      }
      el.className = name;
      el.classList.add(TOOLBAR_ITEM);
      let nonButtons = [TOOLBAR_CELL_WRAP, TOOLBAR_KERNEL, TOOLBAR_INDICATOR];
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
    if (model.kernelspec) {
      this.kernelNameNode.textContent = model.kernelspec.display_name;
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
    switch (args.name) {
    case 'kernelspec':
      if (model.kernelspec) {
        let name = model.kernelspec.display_name || 'No kernel!';
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
      switch (status) {
      case KernelStatus.Idle:
        node.title = 'Kernel Idle';
        break;
      case KernelStatus.Busy:
        node.title = 'Kernel Busy';
        break;
      case KernelStatus.Dead:
        node.title = 'Kernel Died';
        this.kernelNameNode.textContent = 'No Kernel!';
        break;
      case KernelStatus.Reconnecting:
        node.title = 'Kernel Reconnecting';
        break;
      case KernelStatus.Restarting:
        node.title = 'Kernel Restarting';
        break;
      case KernelStatus.Starting:
        node.title = 'Kernel Starting';
        break;
      case KernelStatus.Unknown:
        node.title = 'Kernel Status Unknown';
        break;
      }
    });
    session.sessionDied.connect(() => {
      node.classList.add(TOOLBAR_BUSY);
      node.title = 'Kernel Died';
      this.kernelNameNode.textContent = 'No Kernel!';
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
      manager.runAndAdvance();
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
