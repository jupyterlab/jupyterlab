// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookViewModel, INotebookViewModel
} from './NotebookViewModel';

import {
  ICellViewModel,
  CodeCellViewModel, MarkdownCellViewModel
} from 'jupyter-js-cells';

import {
  InputAreaViewModel
} from 'jupyter-js-input-area';

import {
  EditorModel
} from 'jupyter-js-editor';

import {
  IOutputAreaViewModel, OutputAreaViewModel,
  DisplayDataViewModel, ExecuteResultViewModel,
  ExecuteErrorViewModel, StreamViewModel,
  StreamName, OutputType, OutputViewModel
} from 'jupyter-js-output-area';

import {
  NBData, MarkdownCell, CodeCell, 
  isMarkdownCell, isCodeCell,
  DisplayData, isDisplayData, 
  ExecuteResult, isExecuteResult,
  Stream, isStream,
  JupyterError, isJupyterError, Output
} from './nbformat';

export
function makeModels(data: NBData): NotebookViewModel {
  // Construct the entire model hierarchy explicitly  
  let nb = new NotebookViewModel();
  nb.defaultMimetype = 'text/x-python';
  
  // iterate through the cell data, creating cell models
  data.content.cells.forEach((c) => {
    let input = new InputAreaViewModel();
    input.textEditor = new EditorModel();
    input.textEditor.text = c.source;
    
    if (isMarkdownCell(c)) {
      let cell = new MarkdownCellViewModel();
      cell.input = input;
      cell.rendered = true;
      nb.cells.add(cell);
    } else if (isCodeCell(c)) {
      let cell = new CodeCellViewModel();
      cell.input = input;
      let outputArea = new OutputAreaViewModel();
      cell.output = outputArea;
      for (let i=0; i<c.outputs.length; i++) {
        outputArea.add(buildOutputViewModel(c.outputs[i]));
      }
      nb.cells.add(cell);
    }
  });
  if (nb.cells.length) {
    nb.selectedCellIndex = 0;
  }
  return nb;
}

export
function buildOutputViewModel(out: Output): OutputViewModel {
  if (isDisplayData(out)) {
    let outmodel = new DisplayDataViewModel();
    outmodel.data = out.data;
    outmodel.metadata = out.metadata;
    return outmodel;
  } else if (isStream(out)) {
    let outmodel = new StreamViewModel();
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
    let outmodel = new ExecuteErrorViewModel();
    outmodel.ename = out.ename;
    outmodel.evalue = out.evalue;
    outmodel.traceback = out.traceback.join('\n');
    return outmodel;
  } else if (isExecuteResult(out)) {
    let outmodel = new ExecuteResultViewModel();
    outmodel.data = out.data;
    outmodel.executionCount = out.execution_count;
    outmodel.metadata = out.metadata;
    return outmodel;
  }
}
