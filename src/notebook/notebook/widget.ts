// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

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
  Panel
} from 'phosphor-panel';

import {
  NotebookModel, INotebookModel
} from './model';

import {
  ICellModel,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, MarkdownCellModel, isMarkdownCellModel
} from '../cells';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';

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
class NotebookWidget extends Panel {

  /**
   * Construct a code cell widget.
   */
  constructor(model: INotebookModel) {
    super();
    this.addClass(NB_CLASS);
    this._model = model;

    this._listdispose = follow<ICellModel>(model.cells, this, (c: ICellModel) => {
      let w: Widget;
      switch(c.type) {
      case "code":
        w = new CodeCellWidget(c as CodeCellModel);
        break;
      case "markdown":
        w = new MarkdownCellWidget(c as MarkdownCellModel);
        break;
      default:
        // if there are any issues, just return a blank placeholder
        // widget so the lists stay in sync
        w = new Widget();
      }
      w.addClass(NB_CELL_CLASS);
      return w;
    })
    this.updateSelectedCell(model.selectedCellIndex);

    // bind events that can select the cell
    // see https://github.com/jupyter/notebook/blob/203ccd3d4496cc22e6a1c5e6ece9f5a7d791472a/notebook/static/notebook/js/cell.js#L178
    this.node.addEventListener('click', (ev: MouseEvent) => {
      if (!this._model.readOnly) {
        this._model.selectedCellIndex = this.findCell(ev.target as HTMLElement);
      }
    })
    this.node.addEventListener('dblclick', (ev: MouseEvent) => {
      if (this._model.readOnly) {
        return;
      }
      let i = this.findCell(ev.target as HTMLElement);
      if (i === void 0) {
        return;
      }
      let cell = this._model.cells.get(i);
      if (isMarkdownCellModel(cell) && cell.rendered) {
        cell.rendered = false;
        cell.input.textEditor.select();
      }
    })
    model.stateChanged.connect(this.modelStateChanged, this);
    model.cells.changed.connect(this.cellsChanged, this);
  }


  /**
   * Find the cell index containing the target html element.
   *
   * #### Notes
   * Returns -1 if the cell is not found.
   */
  findCell(node: HTMLElement): number {
    // Trace up the DOM hierarchy to find the root cell node
    // then find the corresponding child and select it
    while (node && node !== this.node) {
      if (node.classList.contains(NB_CELL_CLASS)) {
        for (let i=0; i<this.childCount(); i++) {
          if (this.childAt(i).node === node) {
            return i;
          }
        }
        break;
      }
      node = node.parentElement;
    }
    return void 0;
  }

  /**
   * Handle a change cells event.
   */
  protected cellsChanged(sender: IObservableList<ICellModel>,
                         args: IListChangedArgs<ICellModel>) {
    console.log(args);
  }

  /**
   * Handle a selection change event.
   */
  updateSelectedCell(newIndex: number, oldIndex?: number) {
    if (oldIndex !== void 0) {
      this.childAt(oldIndex).removeClass(NB_SELECTED_CLASS);
    }
    if (newIndex !== void 0) {
      let newCell = this.childAt(newIndex);
      newCell.addClass(NB_SELECTED_CLASS);
      scrollIfNeeded(this.node, newCell.node);
    }
  }

  /**
   * Change handler for model updates.
   */
  protected modelStateChanged(sender: INotebookModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'defaultMimetype': break;
    case 'mode': break;
    case 'selectedCellIndex':
      this.updateSelectedCell(args.newValue, args.oldValue)
    }
  }

  /**
   * Dispose this model.
   */
  dispose() {
    this._listdispose.dispose();
    super.dispose();
  }

  /**
   * Get the model for the widget
   */

  get model(): INotebookModel {
    return this._model;
  }

  private _model: INotebookModel;
  private _listdispose: IDisposable;
}

/**
 * Make a panel mirror changes to an observable list.
 *
 * @param source - The observable list.
 * @param sink - The Panel.
 * @param factory - A function which takes an item from the list and constructs a widget.
 */
 function follow<T>(source: IObservableList<T>,
                     sink: Panel,
                     factory: (arg: T)=> Widget): IDisposable {

  for (let i = sink.childCount()-1; i>=0; i--) {
    sink.childAt(i).dispose();
  }
  for (let i=0; i<source.length; i++) {
    sink.addChild(factory(source.get(i)))
  }
  function callback(sender: ObservableList<T>, args: IListChangedArgs<T>) {
    switch(args.type) {
    case ListChangeType.Add:
      sink.insertChild(args.newIndex, factory(args.newValue as T))
      break;
    case ListChangeType.Move:
      sink.insertChild(args.newIndex, sink.childAt(args.oldIndex));
      break;
    case ListChangeType.Remove:
      sink.childAt(args.oldIndex).dispose();
      break;
    case ListChangeType.Replace:
      for (let i = (args.oldValue as T[]).length; i>0; i--) {
        sink.childAt(args.oldIndex).dispose();
      }
      for (let i = (args.newValue as T[]).length; i>0; i--) {
        sink.insertChild(args.newIndex, factory((args.newValue as T[])[i]))
      }
      break;
    case ListChangeType.Set:
      sink.childAt(args.newIndex).dispose();
      sink.insertChild(args.newIndex, factory(args.newValue as T))
      break;
    }
  }
  source.changed.connect(callback);
  return new DisposableDelegate(() => {
    source.changed.disconnect(callback);
  })

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
