// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel
} from 'jupyter-js-services';

import {
  executeCode
} from '../output-area';

import {
  ICellModel, MarkdownCellModel, CodeCellModel, RawCellModel,
  CodeCellWidget, BaseCellWidget, MarkdownCellWidget
} from '../cells';

import {
  ActiveNotebook
} from './widget';


/**
 * A namespace for handling actions on a notebook.
 */
export
namespace NotebookActions {
  /**
   * Split the active cell into two cells.
   */
  export
  function split(widget: ActiveNotebook): void {
    Private.deselectCells(widget);
    let oldCell = widget.childAt(widget.activeCellIndex);
    let position = oldCell.getCursorPosition();
    let newModel = Private.cloneCell(oldCell.model);
    let orig = oldCell.model.source;
    oldCell.model.source = orig.slice(0, position);
    if (oldCell instanceof CodeCellWidget) {
      (oldCell.model as CodeCellModel).outputs.clear();
    }
    // Strip leading whitespace off the the new text
    let newText = orig.slice(position);
    newModel.source = newText.replace(/^\s+/g, '');
    widget.model.cells.insert(widget.activeCellIndex + 1, newModel);
  }

  /**
   * Merge selected cells.
   */
  export
  function merge(widget: ActiveNotebook): void {
    let toMerge: string[] = [];
    let toDelete: ICellModel[] = [];
    let activeCell: ICellModel;
    let activeWidget: BaseCellWidget;
    let model = widget.model;
    for (let i = 0; i < model.cells.length; i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        toMerge.push(child.model.source);
      }
      if (i === widget.activeCellIndex) {
        activeWidget = widget.childAt(i);
      } else {
        toDelete.push(model.cells.get(i));
      }
    }
    Private.deselectCells(widget);
    // Make sure there are cells to merge.
    if (toMerge.length < 2 || !activeCell) {
      return;
    }
    // For rendered markdown cells, unrender before setting the text.
    if ((activeWidget as MarkdownCellWidget).rendered) {
      (activeWidget as MarkdownCellWidget).rendered = false;
    }
    // For all cells types, set the merged text.
    activeWidget.model.source = toMerge.join('\n\n');
    // Remove the other cells and add them to the delete stack.
    let copies: ICellModel[] = [];
    for (let cell of toDelete) {
      copies.push(Private.cloneCell(cell));
      model.cells.remove(cell);
    }
    // TODO
    //this._undeleteStack.push(toDelete);
    // Make sure the previous cell is still active.
    widget.activeCellIndex = model.cells.indexOf(activeWidget.model);
  }

  /**
   * Insert a new code cell above the current cell.
   */
  export
  function insertAbove(widget: ActiveNotebook): void {
    let cell = new CodeCellModel();
    widget.model.cells.insert(widget.activeCellIndex, cell);
    Private.deselectCells(widget);
  }

  /**
   * Insert a node code cell below the current cell.
   */
  export
  function insertBelow(widget: ActiveNotebook): void {
    let cell = new CodeCellModel();
    widget.model.cells.insert(widget.activeCellIndex + 1, cell);
    Private.deselectCells(widget);
  }

  /**
   * Change the selected cell type(s).
   */
  export
  function changeCellType(widget: ActiveNotebook, value: string): void {
    let model = widget.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      let child = widget.childAt(i);
      if (!widget.isSelected(child)) {
        continue;
      }
      let newCell: ICellModel;
      switch (value) {
      case 'code':
        newCell = new CodeCellModel(cell.toJSON());
        break;
      case 'markdown':
        newCell = new MarkdownCellModel(cell.toJSON());
        break;
      default:
        newCell = new RawCellModel(cell.toJSON());
        break;
      }
      model.cells.remove(cell);
      model.cells.insert(i, newCell);
      if (value === 'markdown') {
        child = widget.childAt(i);
        (child as MarkdownCellWidget).rendered = false;
      }
    }
    Private.deselectCells(widget);
  }

  /**
   * Run the selected cell(s).
   */
  export
  function run(widget: ActiveNotebook, kernel?: IKernel): void {
    let model = widget.model;
    let cells = model.cells;
    let selected: BaseCellWidget[] = [];
    for (let i = 0; i < cells.length; i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        selected.push(child);
      }
    }
    for (let child of selected) {
      switch (child.model.type) {
      case 'markdown':
        (child as MarkdownCellWidget).rendered = true;
        break;
      case 'code':
        if (kernel) {
          Private.executeCodeCell(child as CodeCellWidget, kernel);
        } else {
          (child.model as CodeCellModel).executionCount = null;
        }
        break;
      default:
        break;
      }
    }
  }

  /**
   * Run the selected cell(s) and advance to the next cell.
   *
   * #### Notes
   * If the last cell is run, a new code cell will be created in
   * edit mode and selected.
   */
  export
  function runAndAdvance(widget: ActiveNotebook, kernel?: IKernel): void {
    run(widget, kernel);
    let model = widget.model;
    if (widget.activeCellIndex === model.cells.length - 1) {
      let cell = new CodeCellModel();
      model.cells.add(cell);
      widget.mode = 'edit';
    } else {
      widget.activeCellIndex++;
    }
    Private.deselectCells(widget);
  }

  /**
   * Run the selected cell(s) and insert a new code cell below in edit mode.
   */
  export
  function runAndInsert(widget: ActiveNotebook, kernel?: IKernel): void {
    run(widget, kernel);
    let model = widget.model;
    let cell = new CodeCellModel();
    model.cells.insert(widget.activeCellIndex + 1, cell);
    widget.mode = 'edit';
    Private.deselectCells(widget);
  }

  /**
   * Select the cell below the active cell.
   */
  export
  function selectBelow(widget: ActiveNotebook): void {
    if (widget.activeCellIndex === widget.model.cells.length - 1) {
      return;
    }
    widget.activeCellIndex += 1;
    Private.deselectCells(widget);
  }

  /**
   * Select the above the active cell.
   */
  export
  function selectAbove(widget: ActiveNotebook): void {
    if (widget.activeCellIndex === 0) {
      return;
    }
    widget.activeCellIndex -= 1;
    Private.deselectCells(widget);
  }

  /**
   * Extend the selection to the cell above.
   */
  export
  function extendSelectionAbove(widget: ActiveNotebook): void {
    // Do not wrap around.
    if (widget.activeCellIndex === 0) {
      return;
    }
    let current = widget.childAt(widget.activeCellIndex);
    let prev = widget.childAt(widget.activeCellIndex - 1);
    if (widget.isSelected(prev)) {
      widget.deselect(current);
      if (widget.activeCellIndex >= 1) {
        let prevPrev = widget.childAt(widget.activeCellIndex - 1);
        if (!widget.isSelected(prevPrev)) {
          widget.deselect(prev);
        }
      } else {
        widget.deselect(prev);
      }
    } else {
      widget.select(current);
    }
    widget.activeCellIndex -= 1;
  }

  /**
   * Extend the selection to the cell below.
   */
  export
  function extendSelectionBelow(widget: ActiveNotebook): void {
    let model = widget.model;
    // Do not wrap around.
    if (widget.activeCellIndex === model.cells.length - 1) {
      return;
    }
    let current = widget.childAt(widget.activeCellIndex);
    let next = widget.childAt(widget.activeCellIndex + 1);
    if (widget.isSelected(next)) {
      widget.deselect(current);
      if (widget.activeCellIndex < model.cells.length - 1) {
        let nextNext = widget.childAt(widget.activeCellIndex + 1);
        if (!widget.isSelected(nextNext)) {
          widget.deselect(next);
        }
      } else {
        widget.deselect(next);
      }
    } else {
      widget.select(current);
    }
    widget.activeCellIndex += 1;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Deselect all of the cells.
   */
  export
  function deselectCells(widget: ActiveNotebook): void {
    let model = widget.model;
    let cells = model.cells;
    for (let i = 0; i < cells.length; i++) {
      let child = widget.childAt(i);
      widget.deselect(child);
    }
  }

  /**
   * Clone a cell model.
   */
  export
  function cloneCell(cell: ICellModel): ICellModel {
    switch (cell.type) {
    case 'code':
      return new CodeCellModel(cell.toJSON());
    case 'markdown':
      return new MarkdownCellModel(cell.toJSON());
    default:
      return new RawCellModel(cell.toJSON());
    }
  }

  /**
   * Execute a code cell given a kernel.
   */
  export
  function executeCodeCell(cell: CodeCellWidget, kernel: IKernel): void {
    let code = cell.model.source;
    if (!code.trim()) {
      (cell.model as CodeCellModel).executionCount = null;
      return;
    }
    cell.setPrompt('*');
    let outputs = (cell.model as CodeCellModel).outputs;
    executeCode(code, kernel, outputs).then(reply => {
      (cell.model as CodeCellModel).executionCount = reply.execution_count;
    });
  }
}
