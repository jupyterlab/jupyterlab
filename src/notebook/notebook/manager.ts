// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsManager
} from 'jupyter-js-services';

import {
  ICellModel, MarkdownCellModel
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
      if (cell.selected || cell.active) {
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
      if (cell.selected || cell.active) {
        toMerge.push(cell.input.textEditor.text);
      }
      if (cell.active) {
        activeCell = cell;
      } else {
        toDelete.push(cell);
      }
    }
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
  }

  /**
   * Insert a node code cell below the current cell.
   */
  insertBelow(): void {
    let cell = this.model.createCodeCell();
    this.model.cells.insert(this.model.activeCellIndex + 1, cell);
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
      if (cell.selected || cell.active) {
        this._copied.push(this.cloneCell(cell));
      }
    }
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
      if (cell.selected || cell.active) {
        this._cut.push(this.cloneCell(cell));
        model.cells.remove(cell);
      }
    }
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
  }

  /**
   * Change the selected cell type(s).
   */
  changeCellType(value: string): void {
    let model = this.model;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = model.cells.get(i);
      if (!cell.selected && !cell.active) {
        continue;
      }
      let newCell: ICellModel;
      switch(value) {
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
  }

  /**
   * Run the selected cell(s).
   */
  run(): void {
    let model = this.model;
    let cells = model.cells;
    let selected: ICellModel[] = []
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      if (cell.selected || cell.active) {
        selected.push(cell);
      }
    }
    for (let cell of selected) {
       model.activeCellIndex = cells.indexOf(cell);
       model.runActiveCell();
    }
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
   *
   * #### Notes
   * Also updates the metadata if there is a current session.
   */
  save(): Promise<void> {
    let model = this.model;
    if (!model.session || model.session.isDisposed) {
      return this._save();
    }
    return model.session.kernel.getKernelSpec().then(spec => {
      model.metadata.kernelspec.display_name = spec.display_name;
      model.metadata.kernelspec.name = model.session.kernel.name;
      return model.session.kernel.kernelInfo();
    }).then(info => {
      model.metadata.language_info = info.language_info;
      return this._save();
    });
  }

  /**
   * Clone a cell model.
   */
  protected cloneCell(cell: ICellModel): ICellModel {
    switch(cell.type) {
    case 'code':
      return this.model.createCodeCell(cell);
    case 'markdown':
      return this.model.createMarkdownCell(cell);
    default:
      return this.model.createRawCell(cell);
    }
  }

  /**
   * Save the notebook contents to disk.
   */
  private _save(): Promise<void> {
    let model = this.model;
    let content = serialize(model);
    let name = model.session.notebookPath;
    return this._manager.save(name, { type: 'notebook', content })
    .then(() => { model.dirty = false });
  }

  private _manager: IContentsManager = null;
  private _model: INotebookModel = null;
  private _undeleteStack: ICellModel[][] = [];
  private _copied: ICellModel[] = [];
  private _cut: ICellModel[] = [];
}
