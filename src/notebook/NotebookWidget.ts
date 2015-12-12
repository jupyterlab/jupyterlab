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
  Widget, Panel
} from 'phosphor-widget';

import {
  NotebookViewModel, INotebookViewModel
} from './NotebookViewModel';

import {
  ICellViewModel, CellType,
    CodeCellWidget, MarkdownCellWidget,
    CodeCellViewModel, MarkdownCellViewModel
} from 'jupyter-js-cells';

import {
    OutputAreaWidget, IOutputAreaViewModel
} from 'jupyter-js-output-area';

import './index.css';

/**
 * A widget for a notebook.
 */
export
class NotebookWidget extends Panel {

  /**
   * Construct a code cell widget.
   */
  constructor(model: INotebookViewModel) {
    super();
    this.addClass('jp-Notebook');
    this._model = model;

    follow<ICellViewModel, Widget>(model.cells, this.children, 
                                   (c: ICellViewModel) => {
      let w: Widget;
      switch(c.type) {
      case CellType.Code:
        w = new CodeCellWidget(c as CodeCellViewModel);
        break;
      case CellType.Markdown:
        w = new MarkdownCellWidget(c as MarkdownCellViewModel);
        break;
      default:
        // if there are any issues, just return a blank placeholder
        // widget so the lists stay in sync
        w = new Widget();
      }
      return w;
    })
    this.updateSelectedCell(model.selectedCellIndex);
    model.stateChanged.connect(this.modelStateChanged, this);
    model.cells.changed.connect(this.cellsChanged, this);
  }


  protected cellsChanged(sender: IObservableList<ICellViewModel>, 
                         args: IListChangedArgs<ICellViewModel>) {
    console.log(args);
  }

  updateSelectedCell(newIndex: number, oldIndex?: number) {
    if (oldIndex !== void 0) {
      this.children.get(oldIndex).removeClass('jp-selected-cell');    
    }
    let newCell = this.children.get(newIndex);
    newCell.addClass('jp-selected-cell');
    // scroll so the selected cell is in the view
    // TODO: replicate scrollIntoViewIfNeeded()
    (newCell.node as any).scrollIntoView();
  }

  /**
   * Change handler for model updates.
   */
  protected modelStateChanged(sender: INotebookViewModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'defaultMimetype': break;
    case 'mode': break;
    case 'selectedCellIndex':
      this.updateSelectedCell(args.newValue, args.oldValue)
    }
  }

  private _model: INotebookViewModel;
}


function follow<T,U>(source: IObservableList<T>, 
                                   sink: IObservableList<U>, 
                                   factory: (arg: T)=> U) {
  // Hook up a listener to the source list
  // make corresponding changes to the sink list
  // invoke the add function when you need a new item for sink
  
  // Initialize sink list
  sink.clear();
  for (let i=0; i<source.length; i++) {
    sink.add(factory(source.get(i)))
  }
  
  source.changed.connect((sender, args) => {
    switch(args.type) {
    case ListChangeType.Add:
      // TODO: type should probably be insert, not add, to be consistent with the functions
      // TODO: Too bad we *always* have to cast newValue and oldValue
      sink.insert(args.newIndex, factory(args.newValue as T))
      break;
    case ListChangeType.Move:
      sink.move(args.oldIndex, args.newIndex);
      break;
    case ListChangeType.Remove:
      sink.removeAt(args.oldIndex);
      break;
    case ListChangeType.Replace:
      sink.replace(args.oldIndex, (args.oldValue as T[]).length, 
                   (args.newValue as T[]).map(factory));
      break;
    case ListChangeType.Set:
      sink.set(args.newIndex, factory(args.newValue as T))
      break;
    }
  });
  
}
