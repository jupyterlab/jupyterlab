// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  ICodeCellModel, IRawCellModel
} from '../../../lib/cells/model';

import {
  IStream, ICodeCell, IRawCell, INotebookContent
} from '../../../lib/notebook/nbformat';

import {
  serialize, deserialize, serializeCell, deserializeCell
} from '../../../lib/notebook/serialize';

import {
  NotebookModel
} from '../../../lib/notebook/model';


// Create a sample code cell.
function createCodeCell(): ICodeCellModel {
  let model = new NotebookModel();
  let cell = model.createCodeCell();
  cell.tags = ['foo', 'bar'];
  cell.name = 'baz';
  let output: IStream = {
    output_type: 'stream',
    name: 'stdout',
    text: 'foo\nbar'
  };
  cell.output.add(output);
  let cursor = cell.getMetadata('foo');
  cursor.setValue('bar');
  return cell;
}



describe('jupyter-js-notebook', () => {

  describe('serialize()', () => {

  it('should serialize a notebook model', () => {
    let model = new NotebookModel();
    let cell = model.createCodeCell();
    let cursor = model.getMetadata('foo');
    cursor.setValue('bar');
    model.cells.add(cell);
    let content = serialize(model);
    expect(content.cells.length).to.be(1);
    expect(content.metadata.kernelspec.name).to.be('unknown');
    expect((content.metadata as any).foo).to.be('bar');
  });

  });

  describe('serializeCell()', () => {

    it('should serialize a code cell', () => {
      let cell = createCodeCell();
      let content = serializeCell(cell) as ICodeCell;
      expect(content.metadata.tags).to.eql(cell.tags);
      expect(content.metadata.name).to.be('baz');
      expect((content.metadata as any).foo).to.be('bar');
      expect(content.outputs.length).to.be(1);
    });

    it('should serialize a raw cell', () => {
      let model = new NotebookModel();
      let cell = model.createRawCell();
      cell.format = 'foo';
      let content = serializeCell(cell) as IRawCell;
      expect(content.metadata.format).to.be('foo');
    });

  });

  describe('deserialize()', () => {

    it('should deserialize notebook data', () => {
      let data = require('../../../examples/notebook/test.ipynb');
      let model = new NotebookModel();
      deserialize(data as INotebookContent, model);
      expect(model.kernelspec.name).to.be('python3');
      expect(model.languageInfo.mimetype).to.be('text/x-python');
      expect(model.dirty).to.be(false);
      expect(model.defaultMimetype).to.be('text/x-ipython');
      expect(model.mode).to.be('command');
    });

    it('should deserialize when there are no cells', () => {
      let model = new NotebookModel();
      model.origNbformat = 4;
      let cursor = model.getMetadata('foo');
      cursor.setValue('bar');
      let content = serialize(model);
      let newModel = new NotebookModel();
      deserialize(content, newModel);
      expect(newModel.cells.length).to.be(1);
      cursor = newModel.getMetadata('foo');
      expect(cursor.getValue()).to.be('bar');
    });

    it('should handle raw cells', () => {
      let model = new NotebookModel();
      let cell = model.createRawCell();
      cell.format = 'foo';
      model.cells.add(cell);
      let content = serialize(model);
      let newModel = new NotebookModel();
      deserialize(content, newModel);
      let newCell = newModel.cells.get(0) as IRawCellModel;
      expect(newCell.format).to.be('foo');
    });

  });

  describe('deserializeCell()', () => {

    it('should deserialize a raw cell', () => {
      let model = new NotebookModel();
      let cell = model.createRawCell();
      cell.format = 'foo';
      let newCell = model.createRawCell();
      let content = serializeCell(cell);
      deserializeCell(content, newCell);
      expect(cell.format).to.be(newCell.format);
    });

    it('should deserialize a code cell', () => {
      let cell = createCodeCell();
      let model = new NotebookModel();
      let newCell = model.createCodeCell();
      let content = serializeCell(cell);
      deserializeCell(content, newCell);
      expect(cell.name).to.be(newCell.name);
      expect(newCell.output.outputs.length).to.be(1);
    });

  });

});
