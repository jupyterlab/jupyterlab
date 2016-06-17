// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';

import {
  ICellModel, CodeCellModel,
  CodeCellWidget, BaseCellWidget, MarkdownCellWidget
} from '../cells';

import {
  INotebookModel
} from './model';

import {
  nbformat
} from './nbformat';

import {
  Notebook
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
  function splitCell(widget: Notebook): void {
    Private.deselectCells(widget);
    let nbModel = widget.model;
    let index = widget.activeCellIndex;
    let child = widget.childAt(index);
    let position = child.editor.getCursorPosition();
    let orig = child.model.source;

    // Create new models to preserve history.
    let clone0 = Private.cloneCell(nbModel, child.model);
    let clone1 = Private.cloneCell(nbModel, child.model);
    if (clone0.type === 'code') {
      (clone0 as CodeCellModel).outputs.clear();
    }
    clone0.source = orig.slice(0, position);
    clone1.source = orig.slice(position).replace(/^\s+/g, '');

    // Make the changes while preserving history.
    nbModel.cells.replace(index, 1, [clone0, clone1]);
    widget.activeCellIndex++;
  }

  /**
   * Merge selected cells.
   */
  export
  function mergeCells(widget: Notebook): void {
    let toMerge: string[] = [];
    let toDelete: ICellModel[] = [];
    let model = widget.model;
    let cells = model.cells;
    let index = widget.activeCellIndex;
    let primary = widget.childAt(widget.activeCellIndex);
    let child: BaseCellWidget;
    if (!primary) {
      return;
    }

    // Get the other cells to merge.
    for (let i = 0; i < widget.childCount(); i++) {
      if (i === index) {
        continue;
      }
      child = widget.childAt(i);
      if (widget.isSelected(child)) {
        toMerge.push(child.model.source);
        toDelete.push(child.model);
      }
    }

    // Make sure there are cells to merge and select cells.
    if (!toMerge.length) {
      // Choose the cell after the active cell.
      child = widget.childAt(cells.length - 1);
      if (!child) {
        return;
      }
      toMerge.push(child.model.source);
      toDelete.push(child.model);
    }
    Private.deselectCells(widget);

    // Create a new cell for the source to preserve history.
    let newModel = Private.cloneCell(model, primary.model);
    newModel.source += toMerge.join('\n\n');
    if (newModel instanceof CodeCellModel) {
      newModel.outputs.clear();
    }

    // Make the changes while preserving history.
    model.cells.beginCompoundOperation();
    cells.set(index, newModel);
    for (let cell of toDelete) {
      cells.remove(cell);
    }
    model.cells.endCompoundOperation();

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
  function deleteCells(widget: Notebook): void {
    let model = widget.model;
    let cells = model.cells;
    // Delete the cells as one undo event.
    model.cells.beginCompoundOperation();
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        let cell = cells.get(i);
        cells.remove(cell);
      }
    }
    if (!model.cells.length) {
      let cell = model.factory.createCodeCell();
      model.cells.add(cell);
    }
    model.cells.endCompoundOperation();
    Private.deselectCells(widget);
  }

  /**
   * Insert a new code cell above the current cell.
   */
  export
  function insertAbove(widget: Notebook): void {
    let cell = widget.model.factory.createCodeCell();
    widget.model.cells.insert(widget.activeCellIndex, cell);
    Private.deselectCells(widget);
  }

  /**
   * Insert a node code cell below the current cell.
   */
  export
  function insertBelow(widget: Notebook): void {
    let cell = widget.model.factory.createCodeCell();
    widget.model.cells.insert(widget.activeCellIndex + 1, cell);
    Private.deselectCells(widget);
  }

  /**
   * Change the selected cell type(s).
   */
  export
  function changeCellType(widget: Notebook, value: string): void {
    let model = widget.model;
    model.cells.beginCompoundOperation();
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (!widget.isSelected(child)) {
        continue;
      }
      if (child.model.type === value) {
        continue;
      }
      let newCell: ICellModel;
      switch (value) {
      case 'code':
        newCell = model.factory.createCodeCell(child.model.toJSON());
        break;
      case 'markdown':
        newCell = model.factory.createMarkdownCell(child.model.toJSON());
        break;
      default:
        newCell = model.factory.createRawCell(child.model.toJSON());
      }
      model.cells.replace(i, 1, [newCell]);
      if (value === 'markdown') {
        // Fetch the new widget and unrender it.
        child = widget.childAt(i);
        (child as MarkdownCellWidget).rendered = false;
      }
    }
    model.cells.endCompoundOperation();
    Private.deselectCells(widget);
  }

  /**
   * Run the selected cell(s).
   */
  export
  function run(widget: Notebook, kernel?: IKernel): void {
    let selected: BaseCellWidget[] = [];
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        selected.push(child);
      }
    }
    for (let child of selected) {
      Private.runCell(child, kernel);
    }
    if (widget.mode === 'command') {
      widget.node.focus();
    } else {
      let active = widget.childAt(widget.activeCellIndex);
      active.focus();
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
  function runAndAdvance(widget: Notebook, kernel?: IKernel): void {
    run(widget, kernel);
    let model = widget.model;
    if (widget.activeCellIndex === widget.childCount() - 1) {
      let cell = model.factory.createCodeCell();
      model.cells.add(cell);
      widget.mode = 'edit';
    } else {
      widget.mode = 'command';
    }
    widget.activeCellIndex++;
    Private.deselectCells(widget);
  }

  /**
   * Run the selected cell(s) and insert a new code cell below in edit mode.
   */
  export
  function runAndInsert(widget: Notebook, kernel?: IKernel): void {
    run(widget, kernel);
    let model = widget.model;
    let cell = model.factory.createCodeCell();
    model.cells.insert(widget.activeCellIndex + 1, cell);
    widget.activeCellIndex++;
    widget.mode = 'edit';
    Private.deselectCells(widget);
  }

  /**
   * Run all of the cells in the notebook.
   */
  export
  function runAll(widget: Notebook, kernel?: IKernel): void {
    for (let i = 0; i < widget.childCount(); i++) {
      Private.runCell(widget.childAt(i), kernel);
    }
    widget.mode = 'command';
    widget.activeCellIndex = widget.childCount() - 1;
  }

  /**
   * Select the cell below the active cell.
   */
  export
  function selectBelow(widget: Notebook): void {
    if (widget.activeCellIndex === widget.childCount() - 1) {
      return;
    }
    widget.activeCellIndex += 1;
    widget.mode = 'command';
    Private.deselectCells(widget);
  }

  /**
   * Select the above the active cell.
   */
  export
  function selectAbove(widget: Notebook): void {
    if (widget.activeCellIndex === 0) {
      return;
    }
    widget.activeCellIndex -= 1;
    widget.mode = 'command';
    Private.deselectCells(widget);
  }

  /**
   * Extend the selection to the cell above.
   */
  export
  function extendSelectionAbove(widget: Notebook): void {
    // Do not wrap around.
    if (widget.activeCellIndex === 0) {
      return;
    }
    widget.mode = 'command';
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
  function extendSelectionBelow(widget: Notebook): void {
    // Do not wrap around.
    if (widget.activeCellIndex === widget.childCount() - 1) {
      return;
    }
    widget.mode = 'command';
    let current = widget.childAt(widget.activeCellIndex);
    let next = widget.childAt(widget.activeCellIndex + 1);
    if (widget.isSelected(next)) {
      widget.deselect(current);
      if (widget.activeCellIndex < widget.childCount() - 1) {
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
  function copy(widget: Notebook, clipboard: IClipboard): void {
    clipboard.clear();
    let data: nbformat.IBaseCell[] = [];
    for (let i = 0; i < widget.childCount(); i++) {
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
  function cut(widget: Notebook, clipboard: IClipboard): void {
    clipboard.clear();
    let data: nbformat.IBaseCell[] = [];
    let model = widget.model;
    let cells = model.cells;
    // Preserve the history as one undo event.
    model.cells.beginCompoundOperation();
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        data.push(child.model.toJSON());
        cells.remove(child.model);
      }
    }
    if (!model.cells.length) {
      let cell = model.factory.createCodeCell();
      model.cells.add(cell);
    }
    model.cells.endCompoundOperation();
    clipboard.setData(JUPYTER_CELL_MIME, data);
    Private.deselectCells(widget);
  }

  /**
   * Paste cells from a clipboard.
   */
  export
  function paste(widget: Notebook, clipboard: IClipboard): void {
    if (!clipboard.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    let values = clipboard.getData(JUPYTER_CELL_MIME) as nbformat.IBaseCell[];
    let model = widget.model;
    let cells: ICellModel[] = [];
    for (let value of values) {
      switch (value.cell_type) {
      case 'code':
        cells.push(model.factory.createCodeCell(value));
        break;
      case 'markdown':
        cells.push(model.factory.createMarkdownCell(value));
        break;
      default:
        cells.push(model.factory.createRawCell(value));
        break;
      }
    }
    let index = widget.activeCellIndex;
    widget.model.cells.replace(index, 0, cells);
    Private.deselectCells(widget);
  }

  /**
   * Undo a cell action.
   */
  export
  function undo(widget: Notebook): void {
    widget.mode = 'command';
    widget.model.cells.undo();
  }

  /**
   * Redo a cell action.
   */
  export
  function redo(widget: Notebook): void {
    widget.mode = 'command';
    widget.model.cells.redo();
  }

  /**
   * Toggle line numbers on the selected cell(s).
   */
  export
  function toggleLineNumbers(widget: Notebook): void {
    let cell = widget.childAt(widget.activeCellIndex);
    let editor = cell.editor.editor;
    let lineNumbers = editor.getOption('lineNumbers');
    for (let i = 0; i < widget.childCount(); i++) {
      cell = widget.childAt(i);
      if (widget.isSelected(cell)) {
        editor = cell.editor.editor;
        editor.setOption('lineNumbers', !lineNumbers);
      }
    }
  }

  /**
   * Toggle the line number of all cells.
   */
  export
  function toggleAllLineNumbers(widget: Notebook): void {
    let cell = widget.childAt(widget.activeCellIndex);
    let editor = cell.editor.editor;
    let lineNumbers = editor.getOption('lineNumbers');
    for (let i = 0; i < widget.childCount(); i++) {
      cell = widget.childAt(i);
      editor = cell.editor.editor;
      editor.setOption('lineNumbers', !lineNumbers);
    }
  }

  /**
   * Clear the outputs of the currently selected cells.
   */
  export
  function clearOutputs(widget: Notebook): void {
    let cells = widget.model.cells;
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i) as CodeCellModel;
      let child = widget.childAt(i);
      if (widget.isSelected(child) && cell.type === 'code') {
        cell.outputs.clear();
        cell.executionCount = null;
      }
    }
  }

  /**
   * Clear the code outputs on the widget.
   */
  export
  function clearAllOutputs(widget: Notebook): void {
    let cells = widget.model.cells;
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i) as CodeCellModel;
      if (cell.type === 'code') {
        cell.outputs.clear();
        cell.executionCount = null;
      }
    }
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
  function deselectCells(widget: Notebook): void {
    for (let i = 0; i < widget.childCount(); i++) {
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
      return model.factory.createCodeCell(cell.toJSON());
    case 'markdown':
      return model.factory.createMarkdownCell(cell.toJSON());
    default:
      return model.factory.createRawCell(cell.toJSON());
    }
  }

  /**
   * Run a cell.
   */
  export
  function runCell(widget: BaseCellWidget, kernel?: IKernel): void {
    switch (widget.model.type) {
    case 'markdown':
      (widget as MarkdownCellWidget).rendered = true;
      break;
    case 'code':
      if (kernel) {
        (widget as CodeCellWidget).execute(kernel);
      } else {
        (widget.model as CodeCellModel).executionCount = null;
      }
      break;
    default:
      break;
    }
  }
}
