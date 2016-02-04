// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookModel, INotebookModel
} from './model';

import {
  ICellModel,
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
  NBData, MarkdownCell, CodeCell,
  isMarkdownCell, isCodeCell,
  DisplayData, isDisplayData,
  ExecuteResult, isExecuteResult,
  Stream, isStream,
  JupyterError, isJupyterError, Output
} from './nbformat';

/**
 * Build a complete notebook model from the notebook data.
 */
export
function populateNotebookModel(nb: INotebookModel, data: NBData): void {
  nb.cells.clear();

  // iterate through the cell data, creating cell models
  data.content.cells.forEach((c) => {
    let input = new InputAreaModel();
    input.textEditor = new EditorModel();
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
  } else if (isStream(out)) {
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
  } else if (isJupyterError(out)) {
    let outmodel = new ExecuteErrorModel();
    outmodel.ename = out.ename;
    outmodel.evalue = out.evalue;
    outmodel.traceback = out.traceback.join('\n');
    return outmodel;
  } else if (isExecuteResult(out)) {
    let outmodel = new ExecuteResultModel();
    outmodel.data = out.data;
    outmodel.executionCount = out.execution_count;
    outmodel.metadata = out.metadata;
    return outmodel;
  }
}
