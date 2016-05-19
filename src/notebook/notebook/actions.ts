// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel
} from 'jupyter-js-services';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';

import {
  executeCode
} from '../output-area';

import {
  ICellModel, CodeCellModel,
  CodeCellWidget, BaseCellWidget, MarkdownCellWidget
} from '../cells';

import {
  INotebookModel
} from './model';

import {
  IBaseCell
} from './nbformat';

import {
  ActiveNotebook
} from './widget';


/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';


/**
 * A namespace for handling actions on a notebook.
 */
export
namespace NotebookActions {
  /**
   * Split the active cell into two cells.
   */
  export
  function splitCell(widget: ActiveNotebook): void {
    Private.deselectCells(widget);
    let nbModel = widget.model;
    let index = widget.activeCellIndex;
    let child = widget.childAt(index);
    let position = child.getCursorPosition();
    let orig = child.model.source;

    // Create new models to preserve history.
    let clone0 = Private.cloneCell(nbModel, child.model);
    let clone1 = Private.cloneCell(nbModel, child.model);
    if (clone1.type === 'code') {
      (clone1 as CodeCellModel).outputs.clear();
    }
    clone0.source = orig.slice(0, position);
    clone1.source = orig.slice(position).replace(/^\s+/g, '');

    // Make the changes while preserving history.
    nbModel.cells.replace(index, 1, [clone0, clone1]);
  }

  /**
   * Merge selected cells.
   */
  export
  function mergeCells(widget: ActiveNotebook): void {
    let toMerge: string[] = [];
    let toDelete: ICellModel[] = [];
    let model = widget.model;
    let cells = model.cells;
    let index = widget.activeCellIndex;
    let primary = widget.childAt(widget.activeCellIndex);
    if (!primary) {
      return;
    }

    // Get the other cells to merge.
    for (let i = 0; i < model.cells.length; i++) {
      if (i === index) {
        continue;
      }
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        toMerge.push(child.model.source);
        toDelete.push(child.model);
      }
    }

    // Make sure there are cells to merge and select cells.
    if (!toMerge.length) {
      return;
    }
    Private.deselectCells(widget);

    // Create a new cell for the source to preserve history.
    let newModel = Private.cloneCell(model, primary.model);
    newModel.source += toMerge.join('\n\n');
    if (newModel instanceof CodeCellModel) {
      newModel.outputs.clear();
    }

    // Make the changes while preserving history.
    model.beginCompoundOperation();
    cells.set(index, newModel);
    for (let cell of toDelete) {
      cells.remove(cell);
    }
    model.endCompoundOperation();

    // If the original cell is a markdown cell, make sure it is unrendered.
    if (primary instanceof MarkdownCellWidget) {
      let current = widget.childAt(index);
      (current as MarkdownCellWidget).rendered = false;
    }
  }

  /**
   * Delete the selected cells.
   */
  export
  function deleteCells(widget: ActiveNotebook): void {
    let model = widget.model;
    let cells = model.cells;
    // Delete the cells as one undo event.
    model.beginCompoundOperation();
    for (let i = 0; i < cells.length; i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        let cell = cells.get(i);
        cells.remove(cell);
      }
    }
    model.endCompoundOperation();
    Private.deselectCells(widget);
  }

  /**
   * Insert a new code cell above the current cell.
   */
  export
  function insertAbove(widget: ActiveNotebook): void {
    let cell = widget.model.createCodeCell();
    widget.model.cells.insert(widget.activeCellIndex, cell);
    Private.deselectCells(widget);
  }

  /**
   * Insert a node code cell below the current cell.
   */
  export
  function insertBelow(widget: ActiveNotebook): void {
    let cell = widget.model.createCodeCell();
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
      let child = widget.childAt(i);
      if (!widget.isSelected(child)) {
        continue;
      }
      let newCell = Private.cloneCell(model, child.model);
      model.cells.replace(i, 0, [newCell]);
      if (value === 'markdown') {
        // Fetch the new widget.
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
      let cell = model.createCodeCell();
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
    let cell = model.createCodeCell();
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

  /**
   * Copy the selected cells to a clipboard.
   */
  export
  function copy(widget: ActiveNotebook, clipboard: IClipboard): void {
    clipboard.clear();
    let data: IBaseCell[] = [];
    for (let i = 0; i < widget.model.cells.length; i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        data.push(child.model.toJSON());
      }
    }
    clipboard.setData(JUPYTER_CELL_MIME, data);
    Private.deselectCells(widget);
  }

  /**
   * Cut the selected cells to a clipboard.
   */
  export
  function cut(widget: ActiveNotebook, clipboard: IClipboard): void {
    clipboard.clear();
    let data: IBaseCell[] = [];
    let model = widget.model;
    let cells = model.cells;
    // Preserve the history as one undo event.
    model.beginCompoundOperation();
    for (let i = 0; i < widget.model.cells.length; i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        data.push(child.model.toJSON());
        cells.remove(child.model);
      }
    }
    model.endCompoundOperation();
    clipboard.setData(JUPYTER_CELL_MIME, data);
    Private.deselectCells(widget);
  }

  /**
   * Paste cells from a clipboard.
   */
  export
  function paste(widget: ActiveNotebook, clipboard: IClipboard): void {
    if (!clipboard.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    let values = clipboard.getData(JUPYTER_CELL_MIME) as IBaseCell[];
    let model = widget.model;
    let cells: ICellModel[] = [];
    for (let value of values) {
      switch (value.cell_type) {
      case 'code':
        cells.push(model.createCodeCell(value));
        break;
      case 'markdown':
        cells.push(model.createMarkdownCell(value));
        break;
      default:
        cells.push(model.createRawCell(value));
        break;
      }
    }
    let index = widget.activeCellIndex;
    widget.model.cells.replace(index, 0, cells);
    Private.deselectCells(widget);
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
  function cloneCell(model: INotebookModel, cell: ICellModel): ICellModel {
    switch (cell.type) {
    case 'code':
      return model.createCodeCell(cell.toJSON());
    case 'markdown':
      return model.createMarkdownCell(cell.toJSON());
    default:
      return model.createRawCell(cell.toJSON());
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
