// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelMessage
} from 'jupyter-js-services';

import {
  INotebookModel
} from './model';

import {
  ICellModel, isCodeCellModel, isMarkdownCellModel,
  CodeCellModel, MarkdownCellModel
} from '../cells';

import {
  IMarkdownCell, ICodeCell,
  isMarkdownCell, isCodeCell,
  IDisplayData, isDisplayData,
  IExecuteResult, isExecuteResult,
  IStream, isStream, ICell, INotebookContent,
  IError, isError, IOutput, IOutputType,
  MAJOR_VERSION, MINOR_VERSION
} from './nbformat';


/**
 * Build a complete notebook model from the notebook data.
 */
export
function populateNotebookModel(nb: INotebookModel, data: INotebookContent): void {
  nb.cells.clear();

  // Iterate through the cell data, creating cell models.
  data.cells.forEach((c) => {
    if (isMarkdownCell(c)) {
      let cell = nb.createMarkdownCell();
      cell.input.textEditor.text = c.source;
      cell.rendered = true;
      nb.cells.add(cell);
    } else if (isCodeCell(c)) {
      let cell = nb.createCodeCell();
      cell.input.textEditor.text = c.source;
      for (let i = 0; i < c.outputs.length; i++) {
        cell.output.add(c.outputs[i]);
      }
      nb.cells.add(cell);
    }
  });
  
  if (nb.cells.length) {
    nb.selectedCellIndex = 0;
  }
  nb.metadata = data.metadata;
}


/**
 * Convert a kernel message to an output model.
 */
export
function messageToModel(msg: IKernelMessage) {
  let m: IOutput = msg.content;
  m.output_type = msg.header.msg_type as IOutputType;
  return m
}


/**
 * Get the current notebook content.
 */
export
function getNotebookContent(nb: INotebookModel): INotebookContent {
  return {
    cells: getNotebookCells(nb),
    metadata: nb.metadata, 
    nbformat: MAJOR_VERSION, 
    nbformat_minor: MINOR_VERSION 
  };
}


/**
 * Get the cell data for a given notebook.
 */
function getNotebookCells(nb: INotebookModel): ICell[] {
  let cells: ICell[] = [];
  for (let i = 0; i < nb.cells.length; i++) {
    let cell = nb.cells.get(i);
    let text = cell.input.textEditor.text;
    let tags: string[] = [];
    if (cell.tags) {
      for (let i = 0; i < cell.tags.length; i++) {
        tags.push(cell.tags.get(i));
      }    
    }
    if (isCodeCellModel(cell)) {
      cells.push({
        source: text,
        cell_type: 'code',
        metadata: { tags },
        outputs: getOutputData(cell as CodeCellModel),
        execution_count: cell.executionCount
      });
    } else if (isMarkdownCellModel(cell)) {
      cells.push({
        cell_type: 'markdown',
        source: text,
        metadata: { tags },
      })
    }
  }
  return cells;
}


/**
 * Get the output data for a given cell.
 */
function getOutputData(cell: CodeCellModel): IOutput[] {
  let outputs: IOutput[] = [];
  for (let i = 0; i < cell.output.outputs.length; i++) {
    outputs.push(cell.output.outputs.get(i));
  }
  return outputs;
}
