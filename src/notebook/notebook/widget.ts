// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';

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
 * The class name added to notebook selected cells.
 */
const NB_SELECTED_CLASS = 'jp-mod-selected';


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

    this.updateSelectedCell(model.selectedCellIndex);

    // Bind events that can select the cell.
    // See https://github.com/jupyter/notebook/blob/203ccd3d4496cc22e6a1c5e6ece9f5a7d791472a/notebook/static/notebook/js/cell.js#L178
    this.node.addEventListener('click', evt => {
      if (!this._model.readOnly) {
        let index = this.findCell(evt.target as HTMLElement);
        this._model.selectedCellIndex = index;
      }
    });

    this.node.addEventListener('dblclick', evt => {
      if (this._model.readOnly) {
        return;
      }
      let i = this.findCell(evt.target as HTMLElement);
      if (i === void 0) {
        return;
      }
      let cell = this._model.cells.get(i);
      if (isMarkdownCellModel(cell) && cell.rendered) {
        cell.rendered = false;
        cell.input.textEditor.select();
      }
    });

    model.stateChanged.connect(this.onModelChanged, this);
    model.cells.changed.connect(this.onCellsChanged, this);

    let layout = this.layout as PanelLayout;
    for (let i = 0; i < model.cells.length; i++) {
      layout.addChild(this.createCell(model.cells.get(i)));
    }
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
    this._model.stateChanged.disconnect(this.onModelChanged);
    this._model.cells.changed.disconnect(this.onCellsChanged);
    this._model = null;
    super.dispose();
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
    // Trace up the DOM hierarchy to find the root cell node
    // then find the corresponding child and select it.
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
   * Handle a selected index change.
   */
  protected updateSelectedCell(newIndex: number, oldIndex?: number) {
    let layout = this.layout as PanelLayout;
    if (oldIndex !== void 0) {
      layout.childAt(oldIndex).removeClass(NB_SELECTED_CLASS);
    }
    if (newIndex !== void 0) {
      let newCell = layout.childAt(newIndex);
      newCell.addClass(NB_SELECTED_CLASS);
      scrollIfNeeded(this.node, newCell.node);
    }
  }

  /**
   * Change handler for model updates.
   */
  protected onModelChanged(sender: INotebookModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'defaultMimetype': 
      break;
    case 'mode': 
      break;
    case 'selectedCellIndex':
      this.updateSelectedCell(args.newValue, args.oldValue);
      break;
    }
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
      for (let i = (args.newValue as ICellModel[]).length; i > 0; i--) {
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
