// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelMessage
} from '@jupyterlab/services';

import {
  IClientSession, Clipboard, Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  ICellModel, ICodeCellModel,
  CodeCell, Cell, MarkdownCell
} from '@jupyterlab/cells';

import {
  ArrayExt, each, toArray
} from '@phosphor/algorithm';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import * as React from 'react';

import {
  INotebookModel
} from './model';

import {
  Notebook
} from './widget';


// The message to display to the user when prompting to trust the notebook.
const TRUST_MESSAGE = (
  <p>
    A trusted Jupyter notebook may execute hidden malicious code when you
    open it.
    <br />
    Selecting trust will re-render this notebook in a trusted state.
    <br />
    For more information, see the
    <a href='https://jupyter-notebook.readthedocs.io/en/stable/security.html'>
      Jupyter security documentation</a>
  </p>
);

/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';


/**
 * A collection of actions that run against notebooks.
 *
 * #### Notes
 * All of the actions are a no-op if there is no model on the notebook.
 * The actions set the widget `mode` to `'command'` unless otherwise specified.
 * The actions will preserve the selection on the notebook widget unless
 * otherwise specified.
 */
export
class NotebookActions {
  /**
   * A signal that emits whenever a cell is run.
   */
  static get executed(): ISignal<any, { notebook: Notebook, cell: Cell }> {
    return Private.executed;
  }

  /**
   * A private constructor for the `NotebookActions` class.
   *
   * #### Notes
   * This class can never be instantiated. Its static member `executed` will be
   * merged with the `NotebookActions` namespace. The reason it exists as a
   * standalone class is because at run time, the `Private.executed` variable
   * does not yet exist, so it needs to be referenced via a getter.
   */
  private constructor() { }
}


/**
 * A namespace for `NotebookActions` static methods.
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
  function splitCell(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.deselectAll();

    const nbModel = notebook.model;
    const index = notebook.activeCellIndex;
    const child = notebook.widgets[index];
    const editor = child.editor;
    const position = editor.getCursorPosition();
    const offset = editor.getOffsetAt(position);
    const orig = child.model.value.text;

    // Create new models to preserve history.
    const clone0 = Private.cloneCell(nbModel, child.model);
    const clone1 = Private.cloneCell(nbModel, child.model);

    if (clone0.type === 'code') {
      (clone0 as ICodeCellModel).outputs.clear();
    }
    clone0.value.text = orig.slice(0, offset).replace(/^\n+/, '').replace(/\n+$/, '');
    clone1.value.text = orig.slice(offset).replace(/^\n+/, '').replace(/\n+$/, '');

    // Make the changes while preserving history.
    const cells = nbModel.cells;

    cells.beginCompoundOperation();
    cells.set(index, clone0);
    cells.insert(index + 1, clone1);
    cells.endCompoundOperation();

    notebook.activeCellIndex++;
    Private.handleState(notebook, state);
  }

  /**
   * Merge the selected cells.
   *
   * @param notebook - The target notebook widget.
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
  function mergeCells(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const toMerge: string[] = [];
    const toDelete: ICellModel[] = [];
    const model = notebook.model;
    const cells = model.cells;
    const primary = notebook.activeCell;
    const active = notebook.activeCellIndex;

    // Get the cells to merge.
    notebook.widgets.forEach((child, index) => {
      if (notebook.isSelectedOrActive(child)) {
        toMerge.push(child.model.value.text);
        if (index !== active) {
          toDelete.push(child.model);
        }
      }
    });

    // Check for only a single cell selected.
    if (toMerge.length === 1) {
      // Bail if it is the last cell.
      if (active === cells.length - 1) {
        return;
      }

      // Otherwise merge with the next cell.
      const cellModel = cells.get(active + 1);

      toMerge.push(cellModel.value.text);
      toDelete.push(cellModel);
    }

    notebook.deselectAll();

    // Create a new cell for the source to preserve history.
    const newModel = Private.cloneCell(model, primary.model);

    newModel.value.text = toMerge.join('\n\n');
    if (newModel.type === 'code') {
      (newModel as ICodeCellModel).outputs.clear();
    }

    // Make the changes while preserving history.
    cells.beginCompoundOperation();
    cells.set(active, newModel);
    toDelete.forEach(cell => { cells.removeValue(cell); });
    cells.endCompoundOperation();

    // If the original cell is a markdown cell, make sure
    // the new cell is unrendered.
    if (primary instanceof MarkdownCell) {
      (notebook.activeCell as MarkdownCell).rendered = false;
    }

    Private.handleState(notebook, state);
  }

  /**
   * Delete the selected cells.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The cell after the last selected cell will be activated.
   * It will add a code cell if all cells are deleted.
   * This action can be undone.
   */
  export
  function deleteCells(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    Private.deleteCells(notebook);
    Private.handleState(notebook, state);
  }

  /**
   * Insert a new code cell above the active cell.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This action can be undone.
   * The existing selection will be cleared.
   * The new cell will the active cell.
   */
  export
  function insertAbove(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const model = notebook.model;
    const cell = model.contentFactory.createCodeCell({ });
    const active = notebook.activeCellIndex;

    model.cells.insert(active, cell);

    // Make the newly inserted cell active.
    notebook.activeCellIndex = active;
    notebook.deselectAll();
    Private.handleState(notebook, state, true);
  }

  /**
   * Insert a new code cell below the active cell.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This action can be undone.
   * The existing selection will be cleared.
   * The new cell will be the active cell.
   */
  export
  function insertBelow(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const model = notebook.model;
    const cell = model.contentFactory.createCodeCell({});

    model.cells.insert(notebook.activeCellIndex + 1, cell);

    // Make the newly inserted cell active.
    notebook.activeCellIndex++;
    notebook.deselectAll();
    Private.handleState(notebook, state, true);
  }

  /**
   * Move the selected cell(s) down.
   *
   * @param notebook = The target notebook widget.
   */
  export
  function moveDown(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const cells = notebook.model.cells;
    const widgets = notebook.widgets;

    cells.beginCompoundOperation();
    for (let i = cells.length - 2; i > -1; i--) {
      if (notebook.isSelectedOrActive(widgets[i])) {
        if (!notebook.isSelectedOrActive(widgets[i + 1])) {
          cells.move(i, i + 1);
          if (notebook.activeCellIndex === i) {
            notebook.activeCellIndex++;
          }
          notebook.select(widgets[i + 1]);
          notebook.deselect(widgets[i]);
        }
      }
    }
    cells.endCompoundOperation();
    Private.handleState(notebook, state, true);
  }

  /**
   * Move the selected cell(s) up.
   *
   * @param widget - The target notebook widget.
   */
  export
  function moveUp(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const cells = notebook.model.cells;
    const widgets = notebook.widgets;

    cells.beginCompoundOperation();
    for (let i = 1; i < cells.length; i++) {
      if (notebook.isSelectedOrActive(widgets[i])) {
        if (!notebook.isSelectedOrActive(widgets[i - 1])) {
          cells.move(i, i - 1);
          if (notebook.activeCellIndex === i) {
            notebook.activeCellIndex--;
          }
          notebook.select(widgets[i - 1]);
          notebook.deselect(widgets[i]);
        }
      }
    }
    cells.endCompoundOperation();
    Private.handleState(notebook, state, true);
  }

  /**
   * Change the selected cell type(s).
   *
   * @param notebook - The target notebook widget.
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
  function changeCellType(notebook: Notebook, value: nbformat.CellType): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    Private.changeCellType(notebook, value);
    Private.handleState(notebook, state);
  }

  /**
   * Run the selected cell(s).
   *
   * @param notebook - The target notebook widget.
   *
   * @param session - The optional client session object.
   *
   * #### Notes
   * The last selected cell will be activated, but not scrolled into view.
   * The existing selection will be cleared.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   */
  export
  function run(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    if (!notebook.model || !notebook.activeCell) {
      return Promise.resolve(false);
    }

    const state = Private.getState(notebook);
    const promise = Private.runSelected(notebook, session);

    Private.handleRunState(notebook, state, false);
    return promise;
  }

  /**
   * Run the selected cell(s) and advance to the next cell.
   *
   * @param notebook - The target notebook widget.
   *
   * @param session - The optional client session object.
   *
   * #### Notes
   * The existing selection will be cleared.
   * The cell after the last selected cell will be activated and scrolled into view.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * If the last selected cell is the last cell, a new code cell
   * will be created in `'edit'` mode.  The new cell creation can be undone.
   */
  export
  function runAndAdvance(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    if (!notebook.model || !notebook.activeCell) {
      return Promise.resolve(false);
    }

    const state = Private.getState(notebook);
    const promise = Private.runSelected(notebook, session);
    const model = notebook.model;

    if (notebook.activeCellIndex === notebook.widgets.length - 1) {
      const cell = model.contentFactory.createCodeCell({});

      model.cells.push(cell);
      notebook.activeCellIndex++;
      notebook.mode = 'edit';
    } else {
      notebook.activeCellIndex++;
    }
    Private.handleRunState(notebook, state, true);
    return promise;
  }

  /**
   * Run the selected cell(s) and insert a new code cell.
   *
   * @param notebook - The target notebook widget.
   *
   * @param session - The optional client session object.
   *
   * #### Notes
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * The widget mode will be set to `'edit'` after running.
   * The existing selection will be cleared.
   * The cell insert can be undone.
   * The new cell will be scrolled into view.
   */
  export
  function runAndInsert(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    if (!notebook.model || !notebook.activeCell) {
      return Promise.resolve(false);
    }

    const state = Private.getState(notebook);
    const promise = Private.runSelected(notebook, session);
    const model = notebook.model;
    const cell = model.contentFactory.createCodeCell({ });

    model.cells.insert(notebook.activeCellIndex + 1, cell);
    notebook.activeCellIndex++;
    notebook.mode = 'edit';
    Private.handleRunState(notebook, state, true);
    return promise;
  }

  /**
   * Run all of the cells in the notebook.
   *
   * @param notebook - The target notebook widget.
   *
   * @param session - The optional client session object.
   *
   * #### Notes
   * The existing selection will be cleared.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * The last cell in the notebook will be activated and scrolled into view.
   */
  export
  function runAll(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    if (!notebook.model || !notebook.activeCell) {
      return Promise.resolve(false);
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(child => { notebook.select(child); });

    const promise = Private.runSelected(notebook, session);

    Private.handleRunState(notebook, state, true);
    return promise;
  }

  /**
   * Run all of the cells before the currently active cell (exclusive).
   *
   * @param notebook - The target notebook widget.
   *
   * @param session - The optional client session object.
   *
   * #### Notes
   * The existing selection will be cleared.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * The currently active cell will remain selected.
   */
  export
  function runAllAbove(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    const { activeCell, activeCellIndex, model } = notebook;

    if (!model || !activeCell || activeCellIndex < 1) {
      return Promise.resolve(false);
    }

    const state = Private.getState(notebook);

    notebook.activeCellIndex--;
    notebook.deselectAll();
    for (let i = 0; i < notebook.activeCellIndex; ++i) {
      notebook.select(notebook.widgets[i]);
    }

    const promise = Private.runSelected(notebook, session);

    notebook.activeCellIndex++;
    Private.handleRunState(notebook, state, true);
    return promise;
  }

  /**
   * Run all of the cells after the currently active cell (inclusive).
   *
   * @param notebook - The target notebook widget.
   *
   * @param session - The optional client session object.
   *
   * #### Notes
   * The existing selection will be cleared.
   * An execution error will prevent the remaining code cells from executing.
   * All markdown cells will be rendered.
   * The last cell in the notebook will be activated and scrolled into view.
   */
  export
  function runAllBelow(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    if (!notebook.model || !notebook.activeCell) {
      return Promise.resolve(false);
    }

    const state = Private.getState(notebook);

    notebook.deselectAll();
    for (let i = notebook.activeCellIndex; i < notebook.widgets.length; ++i) {
      notebook.select(notebook.widgets[i]);
    }

    const promise = Private.runSelected(notebook, session);

    Private.handleRunState(notebook, state, true);
    return promise;
  }

  /**
   * Select the above the active cell.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This is a no-op if the first cell is the active cell.
   * The existing selection will be cleared.
   */
  export
  function selectAbove(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }
    if (notebook.activeCellIndex === 0) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.activeCellIndex -= 1;
    notebook.deselectAll();
    Private.handleState(notebook, state, true);
  }

  /**
   * Select the cell below the active cell.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The widget mode will be preserved.
   * This is a no-op if the last cell is the active cell.
   * The existing selection will be cleared.
   */
  export
  function selectBelow(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }
    if (notebook.activeCellIndex === notebook.widgets.length - 1) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.activeCellIndex += 1;
    notebook.deselectAll();
    Private.handleState(notebook, state, true);
  }

  /**
   * Extend the selection to the cell above.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if the first cell is the active cell.
   * The new cell will be activated.
   */
  export
  function extendSelectionAbove(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }
    // Do not wrap around.
    if (notebook.activeCellIndex === 0) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.mode = 'command';
    notebook.extendContiguousSelectionTo(notebook.activeCellIndex - 1);
    Private.handleState(notebook, state, true);
  }

  /**
   * Extend the selection to the cell below.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if the last cell is the active cell.
   * The new cell will be activated.
   */
  export
  function extendSelectionBelow(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }
    // Do not wrap around.
    if (notebook.activeCellIndex === notebook.widgets.length - 1) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.mode = 'command';
    notebook.extendContiguousSelectionTo(notebook.activeCellIndex + 1);
    Private.handleState(notebook, state, true);
  }

  /**
   * Select all of the cells of the notebook.
   *
   * @param notebook - the targe notebook widget.
   */
  export
  function selectAll(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }
    notebook.widgets.forEach(child => { notebook.select(child); });
  }

  /**
   * Deselect all of the cells of the notebook.
   *
   * @param notebook - the targe notebook widget.
   */
  export
  function deselectAll(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }
    notebook.deselectAll();
  }

  /**
   * Copy the selected cell data to a clipboard.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function copy(notebook: Notebook): void {
    Private.copyOrCut(notebook, false);
  }

  /**
   * Cut the selected cell data to a clipboard.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * This action can be undone.
   * A new code cell is added if all cells are cut.
   */
  export
  function cut(notebook: Notebook): void {
    Private.copyOrCut(notebook, true);
  }

  /**
   * Paste cells from the application clipboard.
   *
   * @param notebook - The target notebook widget.
   *
   * @param mode - the mode of the paste operation: 'below' pastes cells
   *   below the active cell, 'above' pastes cells above the active cell,
   *   and 'replace' removes the currently selected cells and pastes cells
   *   in their place.
   *
   * #### Notes
   * The last pasted cell becomes the active cell.
   * This is a no-op if there is no cell data on the clipboard.
   * This action can be undone.
   */
  export
  function paste(notebook: Notebook, mode: 'below' | 'above' | 'replace' = 'below'): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const clipboard = Clipboard.getInstance();

    if (!clipboard.hasData(JUPYTER_CELL_MIME)) {
      return;
    }

    const state = Private.getState(notebook);
    const values = clipboard.getData(JUPYTER_CELL_MIME) as nbformat.IBaseCell[];
    const model = notebook.model;

    notebook.mode = 'command';

    const newCells = values.map(cell => {
      switch (cell.cell_type) {
      case 'code':
        return model.contentFactory.createCodeCell({ cell });
      case 'markdown':
        return model.contentFactory.createMarkdownCell({ cell });
      default:
        return model.contentFactory.createRawCell({ cell });
      }
    });

    const cells = notebook.model.cells;
    let index: number;

    cells.beginCompoundOperation();

    // Set the starting index of the paste operation depending upon the mode.
    switch (mode) {
      case 'below':
        index = notebook.activeCellIndex;
        break;
      case 'above':
        index = notebook.activeCellIndex - 1;
        break;
      case 'replace':
        // Find the cells to delete.
        const toDelete: number[] = [];

        notebook.widgets.forEach((child, index) => {
          const deletable = child.model.metadata.get('deletable') !== false;

          if (notebook.isSelectedOrActive(child) && deletable) {
            toDelete.push(index);
          }
        });

        // If cells are not deletable, we may not have anything to delete.
        if (toDelete.length > 0) {
          // Delete the cells as one undo event.
          toDelete.reverse().forEach(i => { cells.remove(i); });
        }
        index = toDelete[0];
        break;
      default:
        break;
    }

    newCells.forEach(cell => { cells.insert(++index, cell); });
    cells.endCompoundOperation();

    notebook.activeCellIndex += newCells.length;
    notebook.deselectAll();
    Private.handleState(notebook, state);
  }

  /**
   * Undo a cell action.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if if there are no cell actions to undo.
   */
  export
  function undo(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.mode = 'command';
    notebook.model.cells.undo();
    notebook.deselectAll();
    Private.handleState(notebook, state);
  }

  /**
   * Redo a cell action.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * This is a no-op if there are no cell actions to redo.
   */
  export
  function redo(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.mode = 'command';
    notebook.model.cells.redo();
    notebook.deselectAll();
    Private.handleState(notebook, state);
  }

  /**
   * Toggle the line number of all cells.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The original state is based on the state of the active cell.
   * The `mode` of the widget will be preserved.
   */
  export
  function toggleAllLineNumbers(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const config = notebook.editorConfig;
    const lineNumbers = !(config.code.lineNumbers &&
      config.markdown.lineNumbers && config.raw.lineNumbers);
    const newConfig = {
      code: { ...config.code, lineNumbers },
      markdown: { ...config.markdown, lineNumbers },
      raw: { ...config.raw, lineNumbers }
    };

    notebook.editorConfig = newConfig;
    Private.handleState(notebook, state);
  }

  /**
   * Clear the code outputs of the selected cells.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The widget `mode` will be preserved.
   */
  export
  function clearOutputs(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    each(notebook.model.cells, (cell: ICodeCellModel, index) => {
      const child = notebook.widgets[index];

      if (notebook.isSelectedOrActive(child) && cell.type === 'code') {
        cell.outputs.clear();
        (child as CodeCell).outputHidden = false;
        cell.executionCount = null;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Clear all the code outputs on the widget.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The widget `mode` will be preserved.
   */
  export
  function clearAllOutputs(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    each(notebook.model.cells, (cell: ICodeCellModel, index) => {
      const child = notebook.widgets[index];

      if (cell.type === 'code') {
        cell.outputs.clear();
        cell.executionCount = null;
        (child as CodeCell).outputHidden = false;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Hide the code on selected code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function hideCode(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (notebook.isSelectedOrActive(cell) && cell.model.type === 'code') {
        cell.inputHidden = true;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Show the code on selected code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function showCode(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (notebook.isSelectedOrActive(cell) && cell.model.type === 'code') {
        cell.inputHidden = false;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Hide the code on all code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function hideAllCode(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (cell.model.type === 'code') {
        cell.inputHidden = true;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Show the code on all code cells.
   *
   * @param widget - The target notebook widget.
   */
  export
  function showAllCode(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (cell.model.type === 'code') {
        cell.inputHidden = false;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Hide the output on selected code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function hideOutput(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (notebook.isSelectedOrActive(cell) && cell.model.type === 'code') {
        (cell as CodeCell).outputHidden = true;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Show the output on selected code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function showOutput(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (notebook.isSelectedOrActive(cell) && cell.model.type === 'code') {
        (cell as CodeCell).outputHidden = false;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Hide the output on all code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function hideAllOutputs(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (cell.model.type === 'code') {
        (cell as CodeCell).outputHidden = true;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Show the output on all code cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function showAllOutputs(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (cell.model.type === 'code') {
        (cell as CodeCell).outputHidden = false;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Enable output scrolling for all selected cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function enableOutputScrolling(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (notebook.isSelectedOrActive(cell) && cell.model.type === 'code') {
        (cell as CodeCell).outputsScrolled = true;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Disable output scrolling for all selected cells.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function disableOutputScrolling(notebook: Notebook): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      if (notebook.isSelectedOrActive(cell) && cell.model.type === 'code') {
        (cell as CodeCell).outputsScrolled = false;
      }
    });
    Private.handleState(notebook, state);
  }

  /**
   * Persists the collapsed state of all code cell outputs to the model.
   *
   * @param notebook - The target notebook widget.
   */
  export
  function persistViewState(notebook: Notebook): void {
    if (!notebook.model) {
      return;
    }

    const state = Private.getState(notebook);

    notebook.widgets.forEach(cell => {
      const {model, inputHidden} = cell;
      const metadata = model.metadata;
      const jupyter = metadata.get('jupyter') as any || {};

      if (inputHidden) {
        jupyter.source_hidden = true;
      } else {
        delete jupyter.source_hidden;
      }

      if (cell.model.type === 'code') {
        const {outputHidden, outputsScrolled} = (cell as CodeCell);

        // set both metadata keys
        // https://github.com/jupyterlab/jupyterlab/pull/3981#issuecomment-391139167
        if (outputHidden) {
          model.metadata.set('collapsed', true);
          jupyter.outputs_hidden = true;
        } else {
          model.metadata.delete('collapsed');
          delete jupyter.outputs_hidden;
        }

        if (outputsScrolled) {
          model.metadata.set('scrolled', true);
        } else {
          model.metadata.delete('scrolled');
        }
      }

      if (Object.keys(jupyter).length === 0) {
        metadata.delete('jupyter');
      } else {
        metadata.set('jupyter', jupyter);
      }
    });
    Private.handleState(notebook, state);
  }


  /**
   * Set the markdown header level.
   *
   * @param notebook - The target notebook widget.
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
  function setMarkdownHeader(notebook: Notebook, level: number) {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = Private.getState(notebook);
    const cells = notebook.model.cells;

    level = Math.min(Math.max(level, 1), 6);
    notebook.widgets.forEach((child, index) => {
      if (notebook.isSelectedOrActive(child)) {
        Private.setMarkdownHeader(cells.get(index), level);
      }
    });
    Private.changeCellType(notebook, 'markdown');
    Private.handleState(notebook, state);
  }

  /**
   * Trust the notebook after prompting the user.
   *
   * @param notebook - The target notebook widget.
   *
   * @returns a promise that resolves when the transaction is finished.
   *
   * #### Notes
   * No dialog will be presented if the notebook is already trusted.
   */
  export
  function trust(notebook: Notebook): Promise<void> {
    if (!notebook.model) {
      return Promise.resolve();
    }
    // Do nothing if already trusted.

    const cells = toArray(notebook.model.cells);
    const trusted = cells.every(cell => cell.trusted);

    if (trusted) {
      return showDialog({
        body: 'Notebook is already trusted',
        buttons: [Dialog.okButton()]
      }).then(() => undefined);
    }

    return showDialog({
      body: TRUST_MESSAGE,
      title: 'Trust this notebook?',
      buttons: [Dialog.cancelButton(), Dialog.warnButton()]
    }).then(result => {
      if (result.button.accept) {
        cells.forEach(cell => { cell.trusted = true; });
      }
    });
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal that emits whenever a cell is run.
   */
  export
  const executed = new Signal<any, { notebook: Notebook, cell: Cell }>({ });

  /**
   * The interface for a widget state.
   */
  export
  interface IState {
    /**
     * Whether the widget had focus.
     */
    wasFocused: boolean;

    /**
     * The active cell before the action.
     */
    activeCell: Cell;
  }

  /**
   * Get the state of a widget before running an action.
   */
  export
  function getState(notebook: Notebook): IState {
    return {
      wasFocused: notebook.node.contains(document.activeElement),
      activeCell: notebook.activeCell
    };
  }

  /**
   * Handle the state of a widget after running an action.
   */
  export
  function handleState(notebook: Notebook, state: IState, scrollIfNeeded=false): void {
    const { activeCell, node } = notebook;

    if (state.wasFocused || notebook.mode === 'edit') {
      notebook.activate();
    }

    if (scrollIfNeeded) {
      ElementExt.scrollIntoViewIfNeeded(node, activeCell.node);
    }
  }

  /**
   * Handle the state of a widget after running a run action.
   */
  export
  function handleRunState(notebook: Notebook, state: IState, scroll = false): void {
    if (state.wasFocused || notebook.mode === 'edit') {
      notebook.activate();
    }
    if (scroll) {
      // Scroll to the top of the previous active cell output.
      const rect = state.activeCell.inputArea.node.getBoundingClientRect();

      notebook.scrollToPosition(rect.bottom, 45);
    }
  }

  /**
   * Clone a cell model.
   */
  export
  function cloneCell(model: INotebookModel, cell: ICellModel): ICellModel {
    switch (cell.type) {
    case 'code':
      // TODO why isnt modeldb or id passed here?
      return model.contentFactory.createCodeCell({ cell: cell.toJSON() });
    case 'markdown':
      // TODO why isnt modeldb or id passed here?
      return model.contentFactory.createMarkdownCell({ cell: cell.toJSON() });
    default:
      // TODO why isnt modeldb or id passed here?
      return model.contentFactory.createRawCell({ cell: cell.toJSON() });
    }
  }

  /**
   * Run the selected cells.
   */
  export
  function runSelected(notebook: Notebook, session?: IClientSession): Promise<boolean> {
    notebook.mode = 'command';

    let lastIndex = notebook.activeCellIndex;
    const selected = notebook.widgets.filter((child, index) => {
      const active = notebook.isSelectedOrActive(child);

      if (active) {
        lastIndex = index;
      }

      return active;
    });

    notebook.activeCellIndex = lastIndex;
    notebook.deselectAll();

    return Promise.all(selected.map(child => runCell(notebook, child, session)))
      .then(results => {
        if (notebook.isDisposed) {
          return false;
        }

        // Post an update request.
        notebook.update();

        return results.every(result => result);
      });
  }

  /**
   * Run a cell.
   */
  function runCell(notebook: Notebook, cell: Cell, session?: IClientSession): Promise<boolean> {
    switch (cell.model.type) {
    case 'markdown':
      (cell as MarkdownCell).rendered = true;
      cell.inputHidden = false;
      executed.emit({ notebook, cell });
      break;
    case 'code':
      if (session) {
        return CodeCell.execute(cell as CodeCell, session).then(reply => {
          if (cell.isDisposed) {
            return false;
          }

          if (!reply) {
            return true;
          }

          if (reply.content.status === 'ok') {
            const content = reply.content as KernelMessage.IExecuteOkReply;

            if (content.payload && content.payload.length) {
              handlePayload(content, notebook, cell);
            }

            return true;
          }

          return false;
        }).catch(reason => {
          if (reason.message !== 'Canceled') {
            throw reason;
          }

          return false;
        }).then(ran => {
          if (ran) {
            executed.emit({ notebook, cell });
          }

          return ran;
        });
      }
      (cell.model as ICodeCellModel).executionCount = null;
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
   * See [Payloads (DEPRECATED)](https://jupyter-client.readthedocs.io/en/latest/messaging.html#payloads-deprecated).
   */
  function handlePayload(content: KernelMessage.IExecuteOkReply, notebook: Notebook, cell: Cell) {
    const setNextInput = content.payload.filter(i => {
      return (i as any).source === 'set_next_input';
    })[0];

    if (!setNextInput) {
      return;
    }

    const text = (setNextInput as any).text;
    const replace = (setNextInput as any).replace;

    if (replace) {
      cell.model.value.text = text;
      return;
    }

    // Create a new code cell and add as the next cell.
    const newCell = notebook.model.contentFactory.createCodeCell({ });
    const cells = notebook.model.cells;
    const index = ArrayExt.firstIndexOf(toArray(cells), cell.model);

    newCell.value.text = text;
    if (index === -1) {
      cells.push(newCell);
    } else {
      cells.insert(index + 1, newCell);
    }
  }

  /**
   * Copy or cut the selected cell data to the application clipboard.
   *
   * @param notebook - The target notebook widget.
   *
   * @param cut - Whether to copy or cut.
   */
  export
  function copyOrCut(notebook: Notebook, cut: boolean): void {
    if (!notebook.model || !notebook.activeCell) {
      return;
    }

    const state = getState(notebook);
    const clipboard = Clipboard.getInstance();

    notebook.mode = 'command';
    clipboard.clear();

    const data = notebook.widgets
      .filter(cell => notebook.isSelectedOrActive(cell))
      .map(cell => cell.model.toJSON())

    clipboard.setData(JUPYTER_CELL_MIME, data);
    if (cut) {
      deleteCells(notebook);
    } else {
      notebook.deselectAll();
    }
    handleState(notebook, state);
  }

  /**
   * Change the selected cell type(s).
   *
   * @param notebook - The target notebook widget.
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
  function changeCellType(notebook: Notebook, value: nbformat.CellType): void {
    const model = notebook.model;
    const cells = model.cells;

    cells.beginCompoundOperation();
    notebook.widgets.forEach((child, index) => {
      if (!notebook.isSelectedOrActive(child)) {
        return;
      }
      if (child.model.type !== value) {
        const cell = child.model.toJSON();
        let newCell: ICellModel;

        switch (value) {
        case 'code':
          newCell = model.contentFactory.createCodeCell({ cell });
          break;
        case 'markdown':
          newCell = model.contentFactory.createMarkdownCell({ cell });
          if (child.model.type === 'code') {
            newCell.trusted = false;
          }
          break;
        default:
          newCell = model.contentFactory.createRawCell({ cell });
          if (child.model.type === 'code') {
            newCell.trusted = false;
          }
        }
        cells.set(index, newCell);
      }
      if (value === 'markdown') {
        // Fetch the new widget and unrender it.
        child = notebook.widgets[index];
        (child as MarkdownCell).rendered = false;
      }
    });
    cells.endCompoundOperation();
    notebook.deselectAll();
  }

  /**
   * Delete the selected cells.
   *
   * @param notebook - The target notebook widget.
   *
   * #### Notes
   * The cell after the last selected cell will be activated.
   * If the last cell is deleted, then the previous one will be activated.
   * It will add a code cell if all cells are deleted.
   * This action can be undone.
   */
  export
  function deleteCells(notebook: Notebook): void {
    const model = notebook.model;
    const cells = model.cells;
    const toDelete: number[] = [];

    notebook.mode = 'command';

    // Find the cells to delete.
    notebook.widgets.forEach((child, index) => {
      const deletable = child.model.metadata.get('deletable') !== false;

      if (notebook.isSelectedOrActive(child) && deletable) {
        toDelete.push(index);
      }
    });

    // If cells are not deletable, we may not have anything to delete.
    if (toDelete.length > 0) {
      // Delete the cells as one undo event.
      cells.beginCompoundOperation();
      // Delete cells in reverse order to maintain the correct indices.
      toDelete.reverse().forEach(index => { cells.remove(index); });
      // Add a new cell if the notebook is empty. This is done
      // within the compound operation to make the deletion of
      // a notebook's last cell undoable.
      if (!cells.length) {
        cells.push(model.contentFactory.createCodeCell({}));
      }
      cells.endCompoundOperation();

      // Select the *first* interior cell not deleted or the cell
      // *after* the last selected cell.
      // Note: The activeCellIndex is clamped to the available cells,
      // so if the last cell is deleted the previous cell will be activated.
      // The *first* index is the index of the last cell in the initial
      // toDelete list due to the `reverse` operation above.
      notebook.activeCellIndex = toDelete[0] - toDelete.length + 1;
    }

    // Deselect any remaining, undeletable cells. Do this even if we don't
    // delete anything so that users are aware *something* happened.
    notebook.deselectAll();
  }

  /**
   * Set the markdown header level of a cell.
   */
  export
  function setMarkdownHeader(cell: ICellModel, level: number) {
    // Remove existing header or leading white space.
    let source = cell.value.text;
    const regex = /^(#+\s*)|^(\s*)/;
    const newHeader = Array(level + 1).join('#') + ' ';
    const matches = regex.exec(source);

    if (matches) {
      source = source.slice(matches[0].length);
    }
    cell.value.text = newHeader + source;
  }
}
