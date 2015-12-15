// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NBData, MarkdownCell, CodeCell, 
  isMarkdownCell, isCodeCell,
  DisplayData, isDisplayData, 
  ExecuteResult, isExecuteResult,
  Stream, isStream,
  JupyterError, isJupyterError
} from './nbformat';

export
function makeModels(data: NBData): NotebookViewModel {
  // Construct the entire model hierarchy explicitly  
  let nb = new NotebookViewModel();
  nb.defaultMimetype = 'text/x-python';
  
  // iterate through the cell data, creating cell models
  data.content.cells.forEach((c) => {
    let input = new InputAreaViewModel();
    input.textEditor = new TextEditorViewModel();
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
        let out = c.outputs[i];
        if (isDisplayData(out)) {
          let outmodel = new DisplayDataViewModel();
          outmodel.data = out.data;
          outmodel.metadata = out.metadata;
          outputArea.add(outmodel);
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
          outputArea.add(outmodel);          
        } else if (isJupyterError(out)) {
          let outmodel = new ExecuteErrorViewModel();
          outmodel.ename = out.ename;
          outmodel.evalue = out.evalue;
          outmodel.traceback = out.traceback.join('\n');
          outputArea.add(outmodel);
        } else if (isExecuteResult(out)) {
          let outmodel = new ExecuteResultViewModel();
          outmodel.data = out.data;
          outmodel.executionCount = out.execution_count;
          outmodel.metadata = out.metadata;
          outputArea.add(outmodel);
        }
      }
      nb.cells.add(cell);
    }
  });
  if (nb.cells.length) {
    nb.selectedCellIndex = 0;
  }
  return nb;
}

/**
  * A function to update an output area viewmodel to reflect a stream of messages 
  */
export
function consumeMessage(msg: any, outputArea: IOutputAreaViewModel): void {
    let output: any = {};
    let content = msg.content;
    switch (msg.header.msg_type) {
    case 'clear_output':
      outputArea.clear(content.wait)
      break;
    case 'stream':
      output.outputType = OutputType.Stream;
      output.text = content.text;
      switch(content.name) {
      case "stderr":
        output.name = StreamName.StdErr;
        break;
      case "stdout":
        output.name = StreamName.StdOut;
        break;
      default:
        throw new Error(`Unrecognized stream type ${content.name}`);
      }
      outputArea.add(output);
      break;
    case 'display_data':
      output.outputType = OutputType.DisplayData;
      output.data = content.data;
      output.metadata = content.metadata;
      outputArea.add(output);
      break;
    case 'execute_result':
      output.outputType = OutputType.ExecuteResult;
      output.data = content.data;
      output.metadata = content.metadata;
      output.execution_count = content.execution_count;
      outputArea.add(output);
      break;
    case 'error':
      output.outputType = OutputType.Error;
      output.ename = content.ename;
      output.evalue = content.evalue;
      output.traceback = content.traceback.join('\n');
      outputArea.add(output);
      break;
    default:
      console.error('Unhandled message', msg);
    }
}

