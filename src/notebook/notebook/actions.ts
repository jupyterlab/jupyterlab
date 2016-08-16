// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelMessage
} from 'jupyter-js-services';

import {
  MimeData as IClipboard
} from 'phosphor/lib/core/mimedata';

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
export
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

/**
 * A namespace for handling actions on a notebook.
 *
 * #### Notes
 * All of the actions are a no-op if there is no model on the notebook.
 * The actions set the widget `mode` to `'command'` unless otherwise specified.
 * The actions will preserve the selection on the notebook widget unless
 * otherwise specified.
 */
export
namespace NotebookActions {
  /**
   * Split the active cell into two cells.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * It will preserve the existing mode.
   * The second cell will be activated.
   * The existing selection will be cleared.
   * The leading whitespace in the second cell will be removed.
   * If there is no content, two empty cells will be created.
   * Both cells will have the same type as the original cell.
   * This action can be undone.
   */
  export
  function splitCell(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
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
    widget.scrollToActiveCell();
  }

  /**
   * Merge the selected cells.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * If only one cell is selected, the next cell will be selected.
   * If the active cell is a code cell, its outputs will be cleared.
   * This action can be undone.
   * The final cell will have the same type as the active cell.
   * If the active cell is a markdown cell, it will be unrendered.
   */
  export
  function mergeCells(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let toMerge: string[] = [];
    let toDelete: ICellModel[] = [];
    let model = widget.model;
    let cells = model.cells;
    let primary = widget.activeCell;
    let index = widget.activeCellIndex;
    let child: BaseCellWidget;

    // Get the cells to merge.
    for (let i = 0; i < widget.childCount(); i++) {
      child = widget.childAt(i);
      if (widget.isSelected(child)) {
        toMerge.push(child.model.source);
        if (i !== index) {
          toDelete.push(child.model);
        }
      }
    }

    // Check for only a single cell selected.
    if (toMerge.length === 1) {
      // Bail if it is the last cell.
      if (index === cells.length - 1) {
        return;
      }
      // Otherwise merge with the next cell.
      let cellModel = cells.get(index + 1);
      toMerge.push(cellModel.source);
      toDelete.push(cellModel);
    }

    Private.deselectCells(widget);

    // Create a new cell for the source to preserve history.
    let newModel = Private.cloneCell(model, primary.model);
    newModel.source = toMerge.join('\n\n');
    if (newModel instanceof CodeCellModel) {
      newModel.outputs.clear();
    }

    // Make the changes while preserving history.
    cells.beginCompoundOperation();
    cells.set(index, newModel);
    for (let cell of toDelete) {
      cells.remove(cell);
    }
    cells.endCompoundOperation();

    // If the original cell is a markdown cell, make sure
    // the new cell is unrendered.
    if (primary instanceof MarkdownCellWidget) {
      let cell = widget.activeCell as MarkdownCellWidget;
      cell.rendered = false;
    }
  }

  /**
   * Delete the selected cells.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The cell after the last selected cell will be activated.
   * It will add a code cell if all cells are deleted.
   * This action can be undone.
   */
  export
  function deleteCells(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let model = widget.model;
    let cells = model.cells;
    let toDelete: ICellModel[] = [];
    let index = -1;
    widget.mode = 'command';

    // Find the cells to delete.
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        index = i;
        toDelete.push(cells.get(i));
      }
    }

    // Delete the cells as one undo event.
    cells.beginCompoundOperation();
    for (let cell of toDelete) {
      cells.remove(cell);
    }
    // The model will add a new code cell if there are no
    // remaining cells.
    model.cells.endCompoundOperation();

    // Select the cell *after* the last selected.
    // Note: The activeCellIndex is clamped to the available cells,
    // so if the last cell is deleted the previous cell will be activated.
    index -= toDelete.length - 1;
    widget.activeCellIndex = index;
  }

  /**
   * Insert a new code cell above the active cell.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This action can be undone.
   * The existing selection will be cleared.
   * The new cell will the active cell.
   */
  export
  function insertAbove(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let cell = widget.model.factory.createCodeCell();
    widget.model.cells.insert(widget.activeCellIndex, cell);
    Private.deselectCells(widget);
  }

  /**
   * Insert a new code cell below the active cell.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This action can be undone.
   * The existing selection will be cleared.
   * The new cell will be the active cell.
   */
  export
  function insertBelow(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let cell = widget.model.factory.createCodeCell();
    widget.model.cells.insert(widget.activeCellIndex + 1, cell);
    widget.activeCellIndex++;
    Private.deselectCells(widget);
  }

  /**
   * Change the selected cell type(s).
   *
   * @param widget - The target notebook widget.
   *
   * @param value - The target cell type.
   *
   * #### Notes
   * It should preserve the widget mode.
   * This action can be undone.
   * The existing selection will be cleared.
   * Any cells converted to markdown will be unrendered.
   */
  export
  function changeCellType(widget: Notebook, value: nbformat.CellType): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let model = widget.model;
    let cells = model.cells;

    cells.beginCompoundOperation();
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (!widget.isSelected(child)) {
        continue;
      }
      if (child.model.type !== value) {
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
        cells.set(i, newCell);
      }
      if (value === 'markdown') {
        // Fetch the new widget and unrender it.
        child = widget.childAt(i);
        (child as MarkdownCellWidget).rendered = false;
      }
    }
    cells.endCompoundOperation();
    Private.deselectCells(widget);
  }

  /**
   * Run the selected cell(s).
   *
   * @param widget - The target notebook widget.
   *
   * @param kernel - An optional kernel object.
   *
   * #### Notes
   * The last selected cell will be activated.
   * The existing selection will be cleared.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   */
  export
  function run(widget: Notebook, kernel?: IKernel): Promise<boolean> {
    if (!widget.model || !widget.activeCell) {
      return Promise.resolve(false);
    }
    widget.mode = 'command';
    let selected: BaseCellWidget[] = [];
    let lastIndex = widget.activeCellIndex;
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        selected.push(child);
        lastIndex = i;
      }
    }
    widget.activeCellIndex = lastIndex;
    Private.deselectCells(widget);

    let promises: Promise<boolean>[] = [];
    for (let child of selected) {
      promises.push(Private.runCell(widget, child, kernel));
    }
    return Promise.all(promises).then(results => {
      widget.activate();
      for (let result of results) {
        if (!result) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Run the selected cell(s) and advance to the next cell.
   *
   * @param widget - The target notebook widget.
   *
   * @param kernel - An optional kernel object.
   *
   * #### Notes
   * The existing selection will be cleared.
   * The cell after the last selected cell will be activated.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * If the last selected cell is the last cell, a new code cell
   * will be created in `'edit'` mode.  The new cell creation can be undone.
   */
  export
  function runAndAdvance(widget: Notebook, kernel?: IKernel): Promise<boolean> {
    if (!widget.model || !widget.activeCell) {
      return Promise.resolve(false);
    }
    let promise = run(widget, kernel);
    let model = widget.model;
    if (widget.activeCellIndex === widget.childCount() - 1) {
      let cell = model.factory.createCodeCell();
      model.cells.add(cell);
      widget.mode = 'edit';
    }
    widget.activeCellIndex++;
    return promise;
  }

  /**
   * Run the selected cell(s) and insert a new code cell.
   *
   * @param widget - The target notebook widget.
   *
   * @param kernel - An optional kernel object.
   *
   * #### Notes
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * The widget mode will be set to `'edit'` after running.
   * The existing selection will be cleared.
   * The cell insert can be undone.
   */
  export
  function runAndInsert(widget: Notebook, kernel?: IKernel): Promise<boolean> {
    if (!widget.model || !widget.activeCell) {
      return Promise.resolve(false);
    }
    let promise = run(widget, kernel);
    let model = widget.model;
    let cell = model.factory.createCodeCell();
    model.cells.insert(widget.activeCellIndex + 1, cell);
    widget.activeCellIndex++;
    widget.mode = 'edit';
    return promise;
  }

  /**
   * Run all of the cells in the notebook.
   *
   * @param widget - The target notebook widget.
   *
   * @param kernel - An optional kernel object.
   * #### Notes
   * The existing selection will be cleared.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * The last cell in the notebook will be activated.
   */
  export
  function runAll(widget: Notebook, kernel?: IKernel): Promise<boolean> {
    if (!widget.model || !widget.activeCell) {
      return Promise.resolve(false);
    }
    for (let i = 0; i < widget.childCount(); i++) {
      widget.select(widget.childAt(i));
    }
    return run(widget, kernel);
  }

  /**
   * Select the above the active cell.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This is a no-op if the first cell is the active cell.
   * The existing selection will be cleared.
   */
  export
  function selectAbove(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    if (widget.activeCellIndex === 0) {
      return;
    }
    widget.activeCellIndex -= 1;
    widget.scrollToActiveCell();
    Private.deselectCells(widget);
  }

  /**
   * Select the cell below the active cell.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This is a no-op if the last cell is the active cell.
   * The existing selection will be cleared.
   */
  export
  function selectBelow(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    if (widget.activeCellIndex === widget.childCount() - 1) {
      return;
    }
    widget.activeCellIndex += 1;
    widget.scrollToActiveCell();
    Private.deselectCells(widget);
  }

  /**
   * Extend the selection to the cell above.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if the first cell is the active cell.
   * The new cell will be activated.
   */
  export
  function extendSelectionAbove(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    // Do not wrap around.
    if (widget.activeCellIndex === 0) {
      return;
    }
    widget.mode = 'command';
    let current = widget.activeCell;
    let prev = widget.childAt(widget.activeCellIndex - 1);
    if (widget.isSelected(prev)) {
      widget.deselect(current);
      if (widget.activeCellIndex > 1) {
        let prevPrev = widget.childAt(widget.activeCellIndex - 2);
        if (!widget.isSelected(prevPrev)) {
          widget.deselect(prev);
        }
      }
    } else {
      widget.select(current);
    }
    widget.activeCellIndex -= 1;
    widget.scrollToActiveCell();
  }

  /**
   * Extend the selection to the cell below.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if the last cell is the active cell.
   * The new cell will be activated.
   */
  export
  function extendSelectionBelow(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    // Do not wrap around.
    if (widget.activeCellIndex === widget.childCount() - 1) {
      return;
    }
    widget.mode = 'command';
    let current = widget.activeCell;
    let next = widget.childAt(widget.activeCellIndex + 1);
    if (widget.isSelected(next)) {
      widget.deselect(current);
      if (widget.activeCellIndex < widget.model.cells.length - 2) {
        let nextNext = widget.childAt(widget.activeCellIndex + 2);
        if (!widget.isSelected(nextNext)) {
          widget.deselect(next);
        }
      }
    } else {
      widget.select(current);
    }
    widget.activeCellIndex += 1;
    widget.scrollToActiveCell();
  }

  /**
   * Copy the selected cell data to a clipboard.
   *
   * @param widget - The target notebook widget.
   *
   * @param clipboard - The clipboard object.
   */
  export
  function copy(widget: Notebook, clipboard: IClipboard): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    widget.mode = 'command';
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
   * Cut the selected cell data to a clipboard.
   *
   * @param widget - The target notebook widget.
   *
   * @param clipboard - The clipboard object.
   *
   * #### Notes
   * This action can be undone.
   * A new code cell is added if all cells are cut.
   */
  export
  function cut(widget: Notebook, clipboard: IClipboard): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let data: nbformat.IBaseCell[] = [];
    let model = widget.model;
    let cells = model.cells;
    let toDelete: ICellModel[] = [];
    widget.mode = 'command';

    // Gather the cell data.
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        data.push(child.model.toJSON());
        toDelete.push(child.model);
      }
    }

    // Preserve the history as one undo event.
    model.cells.beginCompoundOperation();
    for (let cell of toDelete) {
      cells.remove(cell);
    }

    // If there are no cells, add a code cell.
    if (!model.cells.length) {
      let cell = model.factory.createCodeCell();
      model.cells.add(cell);
    }
    model.cells.endCompoundOperation();

    clipboard.setData(JUPYTER_CELL_MIME, data);
  }

  /**
   * Paste cells from a clipboard.
   *
   * @param widget - The target notebook widget.
   *
   * @param clipboard - The clipboard object.
   *
   * #### Notes
   * The cells are pasted below the active cell.
   * The last pasted cell becomes the active cell.
   * This is a no-op if there is no cell data on the clipboard.
   * This action can be undone.
   */
  export
  function paste(widget: Notebook, clipboard: IClipboard): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    if (!clipboard.hasData(JUPYTER_CELL_MIME)) {
      return;
    }
    let values = clipboard.getData(JUPYTER_CELL_MIME) as nbformat.IBaseCell[];
    let model = widget.model;
    let newCells: ICellModel[] = [];
    widget.mode = 'command';

    for (let value of values) {
      switch (value.cell_type) {
      case 'code':
        newCells.push(model.factory.createCodeCell(value));
        break;
      case 'markdown':
        newCells.push(model.factory.createMarkdownCell(value));
        break;
      default:
        newCells.push(model.factory.createRawCell(value));
        break;
      }
    }
    let index = widget.activeCellIndex;
    widget.model.cells.replace(index + 1, 0, newCells);
    widget.activeCellIndex += newCells.length;
    Private.deselectCells(widget);
  }

  /**
   * Undo a cell action.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if if there are no cell actions to undo.
   */
  export
  function undo(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    widget.mode = 'command';
    widget.model.cells.undo();
  }

  /**
   * Redo a cell action.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if there are no cell actions to redo.
   */
  export
  function redo(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    widget.mode = 'command';
    widget.model.cells.redo();
  }

  /**
   * Toggle line numbers on the selected cell(s).
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The original state is based on the state of the active cell.
   * The `mode` of the widget will be preserved.
   */
  export
  function toggleLineNumbers(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let lineNumbers = widget.activeCell.editor.lineNumbers;
    for (let i = 0; i < widget.childCount(); i++) {
      let cell = widget.childAt(i);
      if (widget.isSelected(cell)) {
        cell.editor.lineNumbers = !lineNumbers;
      }
    }
  }

  /**
   * Toggle the line number of all cells.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The original state is based on the state of the active cell.
   * The `mode` of the widget will be preserved.
   */
  export
  function toggleAllLineNumbers(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let lineNumbers = widget.activeCell.editor.lineNumbers;
    for (let i = 0; i < widget.childCount(); i++) {
      let cell = widget.childAt(i);
      cell.editor.lineNumbers = !lineNumbers;
    }
  }

  /**
   * Clear the code outputs of the selected cells.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget `mode` will be preserved.
   */
  export
  function clearOutputs(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
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
   * Clear all the code outputs on the widget.
   *
   * @param widget - The target notebook widget.
   *
   * #### Notes
   * The widget `mode` will be preserved.
   */
  export
  function clearAllOutputs(widget: Notebook): void {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    let cells = widget.model.cells;
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i) as CodeCellModel;
      if (cell.type === 'code') {
        cell.outputs.clear();
        cell.executionCount = null;
      }
    }
  }

  /**
   * Set the markdown header level.
   *
   * @param widget - The target notebook widget.
   *
   * @param level - The header level.
   *
   * #### Notes
   * All selected cells will be switched to markdown.
   * The level will be clamped between 1 and 6.
   * If there is an existing header, it will be replaced.
   * There will always be one blank space after the header.
   * The cells will be unrendered.
   */
  export
  function setMarkdownHeader(widget: Notebook, level: number) {
    if (!widget.model || !widget.activeCell) {
      return;
    }
    level = Math.min(Math.max(level, 1), 6);
    let cells = widget.model.cells;
    for (let i = 0; i < cells.length; i++) {
      let child = widget.childAt(i) as MarkdownCellWidget;
      if (widget.isSelected(child)) {
        Private.setMarkdownHeader(cells.get(i), level);
      }
    }
    changeCellType(widget, 'markdown');
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
  function runCell(parent: Notebook, child: BaseCellWidget, kernel?: IKernel): Promise<boolean> {

    switch (child.model.type) {
    case 'markdown':
      (child as MarkdownCellWidget).rendered = true;
      break;
    case 'code':
      if (kernel) {
        return (child as CodeCellWidget).execute(kernel).then(reply => {
          if (reply && reply.content.status === 'ok') {
            let content = reply.content as KernelMessage.IExecuteOkReply;
            parent.inspectionHandler.handleExecuteReply(content);
            if (content.payload && content.payload.length) {
              handlePayload(content, parent, child);
            }
          } else {
            parent.inspectionHandler.handleExecuteReply(null);
          }
          return reply ? reply.content.status === 'ok' : true;
        });
      }
      (child.model as CodeCellModel).executionCount = null;
      break;
    default:
      break;
    }
    return Promise.resolve(true);
  }

  /**
   * Handle payloads from an execute reply.
   *
   * #### Notes
   * Payloads are deprecated and there are no official interfaces for them in
   * the kernel type definitions.
   * See [Payloads (DEPRECATED)](http://jupyter-client.readthedocs.io/en/latest/messaging.html#payloads-deprecated).
   */
  function handlePayload(content: KernelMessage.IExecuteOkReply, parent: Notebook, child: BaseCellWidget) {
    let setNextInput = content.payload.filter(i => {
      return (i as any).source === 'set_next_input';
    })[0];
    if (setNextInput) {
      let text = (setNextInput as any).text;
      let replace = (setNextInput as any).replace;
      if (replace) {
        child.model.source = text;
      } else {
        // Create a new code cell and add as the next cell.
        let cell = parent.model.factory.createCodeCell();
        cell.source = text;
        let cells = parent.model.cells;
        for (let i = 0; i < cells.length; i++) {
          let widget = parent.childAt(i);
          if (widget === child) {
            cells.insert(i + 1, cell);
            break;
          }
        }
      }
    }
  }

  /**
   * Set the markdown header level of a cell.
   */
  export
  function setMarkdownHeader(cell: ICellModel, level: number) {
    let source = cell.source;
    let newHeader = Array(level + 1).join('#') + ' ';
    // Remove existing header or leading white space.
    let regex = /^(#+\s*)|^(\s*)/;
    let matches = regex.exec(source);
    if (matches) {
      source = source.slice(matches[0].length);
    }
    cell.source = newHeader + source;
  }
}
