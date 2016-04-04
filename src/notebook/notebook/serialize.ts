// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  ICellModel, IRawCellModel,
  isRawCellModel, isCodeCellModel
} from '../cells';

import {
  INotebookContent, ICell, MAJOR_VERSION, MINOR_VERSION,
  IRawCell, ICodeCell, isRawCell, isMarkdownCell,
  isCodeCell
} from './nbformat';

import {
  INotebookModel
} from './model';


/**
 * Serialize a notebook model.
 */
export
function serialize(nb: INotebookModel): INotebookContent {
  let cells: ICell[] = [];
  for (let i = 0; i < nb.cells.length; i++) {
    let cell = nb.cells.get(i);
    cells.push(serializeCell(cell));
  }
  let metadata: any = {
    kernelspec: nb.kernelspec,
    language_info: nb.languageInfo,
    orig_nbformat: nb.origNbformat
  }
  for (let key of nb.listMetadata()) {
    let cursor = nb.getMetadata(key);
    metadata[key] = cursor.getValue();
  }
  return {
    cells: cells,
    metadata: metadata,
    nbformat: MAJOR_VERSION,
    nbformat_minor: MINOR_VERSION
  };
}

/**
 * Deserialize notebook content into a model.
 */
export
function deserialize(data: INotebookContent, model: INotebookModel): void {
  model.cells.clear();
  let cell: ICellModel;

  // Iterate through the cell data, creating cell models.
  if (data && data.cells) {
    data.cells.forEach(c => {
      if (isMarkdownCell(c)) {
        cell = model.createMarkdownCell();
      } else if (isCodeCell(c)) {
        cell = model.createCodeCell();
      } else if (isRawCell(c)) {
        cell = model.createRawCell();
      }
      deserializeCell(c, cell);
      model.cells.add(cell);
    });
  }

  if (!model.cells.length) {
    cell = model.createCodeCell();
    model.cells.add(cell);
  }
  model.activeCellIndex = 0;

  if (data && data.metadata) {
    let metadata = data.metadata;
    for (let key of data.metadata) {
      switch(key) {
      case 'kernelspec':
        model.kernelspec = metadata.kernelspec;
        break;
      case 'language_info':
        model.languageInfo = metadata.language_info;
        break;
      case 'orig_nbformat':
        model.origNbformat = metadata.origNbformat;
        break;
      default:
        let cursor = model.getMetadata(key);
        cursor.setValue(metadata[key]);
      }
    }
  }
}


/**
 * Serialize a cell model.
 */
export
function serializeCell(cell: ICellModel): ICell {
  let output: ICell = {
    source: cell.input.textEditor.text,
    cell_type: cell.type,
    metadata: { trusted: cell.trusted }
  };
  if (cell.tags) {
    output.metadata.tags = cell.tags;
  }
  if (cell.name) {
    output.metadata.name = cell.name;
  }
  if (isRawCellModel(cell)) {
    (output as IRawCell).metadata.format = (cell as IRawCellModel).format;
  } else if (isCodeCellModel(cell)) {
    let out = output as ICodeCell;
    out.metadata.scrolled = cell.scrolled;
    out.metadata.collapsed = cell.collapsed;
    out.outputs = [];
    for (let i = 0; i < cell.output.outputs.length; i++) {
       out.outputs.push(cell.output.outputs.get(i));
    }
    out.execution_count = cell.executionCount;
  }
  return output;
}


/**
 * Deserialize cell data.
 */
export
function deserializeCell(data: ICell, model: ICellModel): void {
  let source: string = data.source;
  model.input.textEditor.text = source;
  model.tags = data.metadata.tags;
  model.name = data.metadata.name;
  model.trusted = data.metadata.trusted;

  if (isCodeCellModel(model)) {
    let value = data as ICodeCell;
    model.collapsed = value.metadata.collapsed;
    model.scrolled = value.metadata.scrolled;
    model.executionCount = value.execution_count;
    for (let i = 0; i < value.outputs.length; i++) {
      model.output.add(value.outputs[i]);
    }
  } else if (isRawCellModel(model)) {
    (model as IRawCellModel).format = (data as IRawCell).metadata.format;
  }
}
