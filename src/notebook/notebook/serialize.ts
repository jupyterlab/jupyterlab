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
  InputAreaModel
} from '../input-area';

import {
  EditorModel
} from '../editor';

import {
  IOutputAreaModel, OutputAreaModel,
  DisplayDataModel, ExecuteResultModel,
  ExecuteErrorModel, StreamModel,
  StreamName, OutputType, OutputModel
} from '../output-area';

import {
  MarkdownCell, CodeCell,
  isMarkdownCell, isCodeCell,
  DisplayData, isDisplayData,
  ExecuteResult, isExecuteResult,
  Stream, isStream, Cell, NotebookContent,
  JupyterError, isJupyterError, Output, BaseOutput,
  MAJOR_VERSION, MINOR_VERSION
} from './nbformat';


/**
 * Build a complete notebook model from the notebook data.
 */
export
function populateNotebookModel(nb: INotebookModel, data: NotebookContent): void {
  nb.cells.clear();

  // iterate through the cell data, creating cell models
  data.cells.forEach((c) => {
    let input = new InputAreaModel();
    input.textEditor = new EditorModel({ lineNumbers: false });
    input.textEditor.text = c.source;

    if (isMarkdownCell(c)) {
      let cell = new MarkdownCellModel();
      cell.input = input;
      cell.rendered = true;
      nb.cells.add(cell);
    } else if (isCodeCell(c)) {
      let cell = new CodeCellModel();
      cell.input = input;
      let outputArea = new OutputAreaModel();
      cell.output = outputArea;
      for (let i=0; i<c.outputs.length; i++) {
        outputArea.add(buildOutputModel(c.outputs[i]));
      }
      nb.cells.add(cell);
    }
  });

  nb.defaultMimetype = 'text/x-python';
  if (nb.cells.length) {
    nb.selectedCellIndex = 0;
  }
  nb.metadata = data.metadata;
}


/**
 * Build an output model from output message data.
 */
export
function buildOutputModel(out: Output): OutputModel {
  if (isDisplayData(out)) {
    let outmodel = new DisplayDataModel();
    outmodel.data = out.data;
    outmodel.metadata = out.metadata;
    return outmodel;
  } 
  if (isStream(out)) {
    let outmodel = new StreamModel();
    switch (out.name) {
    case 'stdout':
      outmodel.name = StreamName.StdOut;
      break;
    case 'stderr':
      outmodel.name = StreamName.StdErr;
      break;
    default:
      console.error('Unrecognized stream name: %s', out.name);
    }
    outmodel.text = out.text;
    return outmodel;
  } 
  if (isJupyterError(out)) {
    let outmodel = new ExecuteErrorModel();
    outmodel.ename = out.ename;
    outmodel.evalue = out.evalue;
    outmodel.traceback = out.traceback.join('\n');
    return outmodel;
  }
  if (isExecuteResult(out)) {
    let outmodel = new ExecuteResultModel();
    outmodel.data = out.data;
    outmodel.executionCount = out.execution_count;
    outmodel.metadata = out.metadata;
    return outmodel;
  }
}


/**
 * Convert a kernel message to an output model.
 */
export
function messageToModel(msg: IKernelMessage) {
  let m: Output = msg.content;
  let type = msg.header.msg_type;
  if (type === 'execute_result') {
    m.output_type = 'display_data';
  } else {
    m.output_type = type;
  }
  return buildOutputModel(m);
}


/**
 * Get the current notebook content.
 */
export
function getNotebookContent(nb: INotebookModel): NotebookContent {
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
function getNotebookCells(nb: INotebookModel): Cell[] {
  let cells: Cell[] = [];
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
function getOutputData(cell: CodeCellModel): Output[] {
  let outputs: Output[] = [];
  for (let i = 0; i < cell.output.outputs.length; i++) {
    let output = cell.output.outputs.get(i);
    if (output instanceof ExecuteResultModel) {
      outputs.push({
        output_type: 'execute_result',
        execution_count: cell.executionCount,
        data: output.data,
        metadata: output.metadata
      });
    } else if (output instanceof StreamModel) {
      let name = output.name === StreamName.StdOut ? 'stdout' : 'stderr';
      outputs.push({
        output_type: 'stream',
        name: name,
        text: output.text
      });
    } else if (output instanceof DisplayDataModel) {
      outputs.push({
        output_type: 'display_data',
        data: output.data,
        metadata: output.metadata
      });
    } else if (output instanceof ExecuteErrorModel) {
      outputs.push({
        output_type: 'error',
        ename: output.ename,
        evalue: output.evalue,
        traceback: output.traceback.split('\n')
      });
    }
  }
  return outputs;
}
