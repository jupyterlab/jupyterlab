// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

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
  NotebookModel, INotebookModel
} from './model';

import {
  ICellModel,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, MarkdownCellModel, isMarkdownCellModel,
  RawCellModel, RawCellWidget
} from '../cells';

import './codemirror-ipython';
import './codemirror-ipythongfm';


/**
 * The class name added to notebook widgets.
 */
const NB_CLASS = 'jp-Notebook';

/**
 * The class name added to notebook widget cells.
 */
const NB_CELL_CLASS = 'jp-Notebook-cell';


/**
 * A widget for a notebook.
 */
export
class NotebookWidget extends Widget {
  /**
   * Construct a notebook widget.
   */
  constructor(model: INotebookModel) {
    super();
    this.addClass(NB_CLASS);
    this._model = model;
    this.layout = new PanelLayout();
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < model.cells.length; i++) {
      layout.addChild(this.createCell(model.cells.get(i)));
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
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._model.cells.changed.disconnect(this.onCellsChanged);
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
    this.node.removeEventListener('dblclick', this)
  }

  /**
   * Create a new cell widget given a cell model.
   */
  protected createCell(cell: ICellModel): Widget {
    let widget: Widget;
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
      widget = new Widget();
    }
    widget.addClass(NB_CELL_CLASS);
    return widget;
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
   * Handle a change cells event.
   */
  protected onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    let layout = this.layout as PanelLayout;
    let factory = this.createCell;
    let widget: Widget;
    switch(args.type) {
    case ListChangeType.Add:
      layout.insertChild(args.newIndex, factory(args.newValue as ICellModel));
      break;
    case ListChangeType.Move:
      layout.insertChild(args.newIndex, layout.childAt(args.oldIndex));
      break;
    case ListChangeType.Remove:
      widget = layout.childAt(args.oldIndex);
      layout.removeChild(widget);
      widget.dispose();
      break;
    case ListChangeType.Replace:
      for (let i = (args.oldValue as ICellModel[]).length; i > 0; i--) {
        widget = layout.childAt(i);
        layout.removeChild(widget);
        widget.dispose();
      }
      let newValues = args.newValue as ICellModel[];
      for (let i = 0; i < newValues.length; i++) {
        layout.addChild(factory(newValues[i]));
      }
      break;
    case ListChangeType.Set:
      widget = layout.childAt(args.newIndex);
      layout.removeChild(widget);
      widget.dispose();
      layout.insertChild(args.newIndex, factory(args.newValue as ICellModel));
      break;
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
      model.selectedCellIndex = i;
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
      cell.mode = 'edit';
    }
  }

  private _model: INotebookModel;
}


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
  if (er.top < ar.top) {
    area.scrollTop -= ar.top - er.top;
  } else if (er.bottom > ar.bottom) {
    area.scrollTop += er.bottom - ar.bottom;
  }
}
