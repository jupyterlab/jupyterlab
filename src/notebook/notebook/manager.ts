// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsManager
} from 'jupyter-js-services';

import {
  ICellModel, MarkdownCellModel, isCodeCellModel
} from '../cells';

import {
  INotebookModel
} from './model';

import {
  serialize
} from './serialize';


/**
 * The maximum size of the delete stack.
 */
const DELETE_STACK_SIZE = 10;


/**
 * A class that manages actions on a notebook.
 */
export
class NotebookManager {
  /**
   * Construct a new notebook model.
   */
  constructor(model: INotebookModel, manager: IContentsManager) {
    this._model = model;
    this._manager = manager;
  }

  /**
   * The model used by the action manager.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._model;
  }

  /**
   * Delete selected cell(s), putting them on the undelete stack.
   */
  delete(): void {
    let undelete: ICellModel[] = [];
    let model = this.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      if (model.isSelected(cell)) {
        undelete.push(this.cloneCell(cell));
        model.cells.remove(cell);
      }
    }
    if (undelete.length) {
      this._undeleteStack.push(undelete);
    }
    if (this._undeleteStack.length > DELETE_STACK_SIZE) {
      this._undeleteStack.shift();
    }
    this.deselectCells();
  }

  /**
   * Undelete the cell(s) at the top of the undelete stack.
   */
  undelete(): void {
    let model = this.model;
    let index = model.activeCellIndex + 1;
    if (this._undeleteStack.length === 0) {
      return;
    }
    let undelete = this._undeleteStack.pop();
    // Insert the undeleted cells in reverse order.
    for (let cell of undelete.reverse()) {
      model.cells.insert(index, cell);
    }
    this.deselectCells();
  }

  /**
   * Split the active cell into two cells.
   */
  split(): void {
    this.deselectCells();
    let cell = this.model.cells.get(this.model.activeCellIndex);
    let position = cell.input.textEditor.cursorPosition;
    let newCell = this.cloneCell(cell);
    let orig = cell.input.textEditor.text;
    cell.input.textEditor.text = orig.slice(0, position);
    if (isCodeCellModel(cell)) {
      cell.clear();
    }
    // Strip leading whitespace off the the new text
    let newText = orig.slice(position);
    newCell.input.textEditor.text = newText.replace(/^\s+/g,'');
    newCell.input.textEditor.cursorPosition = 0;
    this.model.cells.insert(this.model.activeCellIndex + 1, newCell);
  }

  /**
   * Merge selected cells.
   */
  merge(): void {
    let toMerge: string[] = [];
    let toDelete: ICellModel[] = [];
    let activeCell: ICellModel;
    let model = this.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      if (model.isSelected(cell)) {
        toMerge.push(cell.input.textEditor.text);
      }
      if (i === model.activeCellIndex) {
        activeCell = cell;
      } else {
        toDelete.push(cell);
      }
    }
    this.deselectCells();
    // Make sure there are cells to merge.
    if (toMerge.length < 2 || !activeCell) {
      return;
    }
    // For rendered markdown cells, unrender before setting the text.
    if ((activeCell as MarkdownCellModel).rendered) {
      (activeCell as MarkdownCellModel).rendered = false;
    }
    // For all cells types, set the merged text.
    activeCell.input.textEditor.text = toMerge.join('\n\n');
    // Remove the other cells and add them to the delete stack.
    let copies: ICellModel[] = [];
    for (let cell of toDelete) {
      copies.push(this.cloneCell(cell));
      model.cells.remove(cell);
    }
    this._undeleteStack.push(toDelete);
    // Make sure the previous cell is still active.
    model.activeCellIndex = model.cells.indexOf(activeCell);
  }

  /**
   * Insert a new code cell above the current cell.
   */
  insertAbove(): void {
    let cell = this.model.createCodeCell();
    this.model.cells.insert(this.model.activeCellIndex, cell);
    this.deselectCells();
  }

  /**
   * Insert a node code cell below the current cell.
   */
  insertBelow(): void {
    let cell = this.model.createCodeCell();
    this.model.cells.insert(this.model.activeCellIndex + 1, cell);
    this.deselectCells();
  }

  /**
   * Copy the selected cell(s) to the clipboard.
   */
  copy(): void {
    this._copied = [];
    this._cut = [];
    let model = this.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      if (model.isSelected(cell)) {
        this._copied.push(this.cloneCell(cell));
      }
    }
    this.deselectCells();
  }

  /**
   * Cut the selected cell(s).
   */
  cut(): void {
    this._copied = [];
    this._cut = [];
    let model = this.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      if (model.isSelected(cell)) {
        this._cut.push(this.cloneCell(cell));
        model.cells.remove(cell);
      }
    }
    this.deselectCells();
  }

  /**
   * Paste cell(s) from the clipboard.
   */
  paste(): void {
    let model = this.model;
    let cut = this._cut;
    let copied = this._copied;
    let index = model.activeCellIndex + 1;
    if (copied.length > 0) {
      // Insert copies of the original cells in reverse order.
      for (let cell of copied.reverse()) {
        model.cells.insert(index, cell);
      }
    } else {
      // Insert the cut cell(s) in reverse order.
      for (let cell of cut.reverse()) {
        model.cells.insert(index, cell);
      }
    }
    this._copied = [];
    this._cut = [];
    this.deselectCells();
  }

  /**
   * Change the selected cell type(s).
   */
  changeCellType(value: string): void {
    let model = this.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      if (!model.isSelected(cell)) {
        continue;
      }
      let newCell: ICellModel;
      switch (value) {
      case 'code':
        newCell = model.createCodeCell(cell);
        break;
      case 'markdown':
        newCell = model.createMarkdownCell(cell);
        (newCell as MarkdownCellModel).rendered = false;
        break;
      default:
        newCell = model.createRawCell(cell);
        break;
      }
      model.cells.remove(cell);
      model.cells.insert(i, newCell);
    }
    this.deselectCells();
  }

  /**
   * Run the selected cell(s).
   */
  run(): void {
    let model = this.model;
    let cells = model.cells;
    let selected: ICellModel[] = [];
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      if (model.isSelected(cell)) {
        selected.push(cell);
      }
    }
    for (let cell of selected) {
      model.activeCellIndex = cells.indexOf(cell);
      model.runActiveCell();
    }
  }

  /**
   * Run the selected cell(s) and advance to the next cell.
   *
   * #### Notes
   * If the last cell is run, a new code cell will be created in
   * edit mode and selected.
   */
  runAndAdvance(): void {
    this.run();
    let model = this.model;
    if (model.activeCellIndex === model.cells.length - 1) {
      let cell = model.createCodeCell();
      model.mode = 'edit';
      model.cells.add(cell);
    } else {
      model.activeCellIndex++;
    }
    this.deselectCells();
  }

  /**
   * Run the selected cell(s) and insert a new code cell below in edit mode.
   */
  runAndInsert(): void {
    this.run();
    let model = this.model;
    let cell = model.createCodeCell();
    model.mode = 'edit';
    model.cells.insert(model.activeCellIndex + 1, cell);
    this.deselectCells();
  }

  /**
   * Interrupt the kernel.
   */
  interrupt(): Promise<void> {
    return this.model.session.kernel.interrupt();
  }

  /**
   * Restart the kernel.
   */
  restart(): Promise<void> {
    return this.model.session.kernel.restart();
  }

  /**
   * Save the notebook and clear the dirty state of the model.
   */
  save(): Promise<void> {
    let model = this.model;
    let content = serialize(model);
    let name = model.session.notebookPath;
    return this._manager.save(name, { type: 'notebook', content })
    .then(() => { model.dirty = false; });
  }

  /**
   * Select the cell below the active cell.
   */
  selectBelow(): void {
    if (this.model.activeCellIndex === this.model.cells.length - 1) {
      return;
    }
    this.model.activeCellIndex += 1;
    this.deselectCells();
  }

  /**
   * Select the above the active cell.
   */
  selectAbove(): void {
    if (this.model.activeCellIndex === 0) {
      return;
    }
    this.model.activeCellIndex -= 1;
    this.deselectCells();
  }

  /**
   * Extend the selection to the cell above.
   */
  extendSelectionAbove(): void {
    let model = this.model;
    let cells = model.cells;
    // Do not wrap around.
    if (model.activeCellIndex === 0) {
      return;
    }
    let current = cells.get(model.activeCellIndex);
    let prev = cells.get(model.activeCellIndex - 1);
    if (model.isSelected(prev)) {
      model.deselect(current);
      if (model.activeCellIndex >= 1) {
        let prevPrev = cells.get(model.activeCellIndex - 1);
        if (!model.isSelected(prevPrev)) {
          model.deselect(prev);
        }
      } else {
        model.deselect(prev);
      }
    } else {
      model.select(current);
    }
    model.activeCellIndex -= 1;
  }

  /**
   * Extend the selection to the cell below.
   */
  extendSelectionBelow(): void {
    let model = this.model;
    let cells = model.cells;
    // Do not wrap around.
    if (model.activeCellIndex === cells.length - 1) {
      return;
    }
    let current = cells.get(model.activeCellIndex);
    let next = cells.get(model.activeCellIndex + 1);
    if (model.isSelected(next)) {
      model.deselect(current);
      if (model.activeCellIndex < cells.length - 1) {
        let nextNext = cells.get(model.activeCellIndex + 1);
        if (!model.isSelected(nextNext)) {
          model.deselect(next);
        }
      } else {
        model.deselect(next);
      }
    } else {
      model.select(current);
    }
    model.activeCellIndex += 1;
  }

  /**
   * Deselect all of the cells.
   */
  protected deselectCells(): void {
    let cells = this.model.cells;
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      if (this.model.isSelected(cell)) {
        this.model.deselect(cell);
      }
    }
  }

  /**
   * Clone a cell model.
   */
  protected cloneCell(cell: ICellModel): ICellModel {
    switch (cell.type) {
    case 'code':
      return this.model.createCodeCell(cell);
    case 'markdown':
      return this.model.createMarkdownCell(cell);
    default:
      return this.model.createRawCell(cell);
    }
  }

  private _manager: IContentsManager = null;
  private _model: INotebookModel = null;
  private _undeleteStack: ICellModel[][] = [];
  private _copied: ICellModel[] = [];
  private _cut: ICellModel[] = [];
}
