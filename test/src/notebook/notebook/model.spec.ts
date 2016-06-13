// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ObservableList, IListChangedArgs
} from 'phosphor-observablelist';

import {
  ICellModel
} from '../../../../lib/notebook/cells/model';

import {
  JSONObject, deepEqual
} from '../../../../lib/notebook/common/json';

import {
  ObservableUndoableList
} from '../../../../lib/notebook/common/undo';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  NotebookModel
} from '../../../../lib/notebook/notebook/model';


const DEFAULT_CONTENT: nbformat.INotebookContent = require('../../../../examples/notebook/test.ipynb') as nbformat.INotebookContent;


/**
 * A notebook model which tests protected methods.
 */
class LogNotebookModel extends NotebookModel {
  methods: string[] = [];

  protected onCellChanged(cell: ICellModel, change: any): void {
    super.onCellChanged(cell, change);
    this.methods.push('onCellsChanged');
  }

  protected onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    super.onCellsChanged(list, change);
    this.methods.push('onCellsChanged');
  }

  protected setCursorData(name: string, newValue: any): void {
    super.setCursorData(name, newValue);
    this.methods.push('setCursorData');
  }
}


describe('notebook/notebook', () => {

  describe('NotebookModel', () => {

    describe('#constructor()', () => {

      it('should create a notebook model', () => {
        let model = new NotebookModel();
        expect(model).to.be.a(NotebookModel);
      });

      it('should accept an optional language preference', () => {
        let model = new NotebookModel('python');
        let cursor = model.getMetadata('language_info');
        let lang = cursor.getValue() as nbformat.ILanguageInfoMetadata;
        expect(lang.name).to.be('python');
      });

    });

    describe('#metadataChanged', () => {

      it('should be emitted when a metadata field changes', () => {
        let model = new NotebookModel();
        let called = false;
        model.metadataChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('foo');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue).to.be(1);
          called = true;
        });
        let foo = model.getMetadata('foo');
        foo.setValue(1);
        expect(called).to.be(true);
      });

      it('should not be emitted when the value does not change', () => {
        let model = new NotebookModel();
        let called = false;
        let foo = model.getMetadata('foo');
        foo.setValue(1);
        model.metadataChanged.connect(() => { called = true; });
        foo.setValue(1);
        expect(called).to.be(false);
      });

    });

    describe('#cells', () => {

      it('should be an observable undoable list', () => {
        let model = new NotebookModel();
        expect(model.cells).to.be.an(ObservableUndoableList);
      });

      it('should default to an empty list', () => {
        let model = new NotebookModel();
        expect(model.cells.length).to.be(0);
      });

      it('should be reset when loading from disk', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        model.cells.add(cell);
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.cells.indexOf(cell)).to.be(-1);
        expect(model.cells.length).to.be(6);
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.cells = null; }).to.throwError();
      });

    });

    describe('#nbformat', () => {

      it('should get the major version number of the nbformat', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.nbformat).to.be(DEFAULT_CONTENT.nbformat);
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.nbformat = 0; }).to.throwError();
      });

    });

    describe('#nbformatMinor', () => {

      it('should get the minor version number of the nbformat', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.nbformatMinor).to.be(DEFAULT_CONTENT.nbformat_minor);
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.nbformatMinor = 0; }).to.throwError();
      });

    });

    describe('#defaultKernelName()', () => {

      it('should get the default kernel name of the document', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.defaultKernelName).to.be('python3');
      });

      it('should default to an empty string', () => {
        let model = new NotebookModel();
        expect(model.defaultKernelName).to.be('');
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.defaultKernelName = ''; }).to.throwError();
      });

    });

    describe('#defaultKernelLanguage', () => {

      it('should get the default kernel language of the document', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.defaultKernelLanguage).to.be('python');
      });

      it('should default to an empty string', () => {
        let model = new NotebookModel();
        expect(model.defaultKernelLanguage).to.be('');
      });

      it('should be set from the constructor arg', () => {
        let model = new NotebookModel('foo');
        expect(model.defaultKernelLanguage).to.be('foo');
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.defaultKernelLanguage = ''; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        model.dispose();
        expect(model.cells).to.be(null);
        expect(model.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let model = new NotebookModel();
        model.dispose();
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#toString()', () => {

      it('should serialize the model to a string', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        let text = model.toString();
        let data = JSON.parse(text);
        // TODO: use JSON types in services then deepEqual here.
        expect(data.cells[0]).to.eql(DEFAULT_CONTENT.cells[0]);
      });

    });

    describe('#fromString()', () => {

      it('should deserialize the model from a string', () => {
        let model = new NotebookModel();
        model.fromString(JSON.stringify(DEFAULT_CONTENT));
        expect(model.cells.length).to.be(6);
      });

      it('should set the dirty flag', () => {
        let model = new NotebookModel();
        model.dirty = false;
        model.fromString(JSON.stringify(DEFAULT_CONTENT));
        expect(model.dirty).to.be(true);
      });

    });

    describe('#toJSON()', () => {

      it('should serialize the model to JSON', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        let data = model.toJSON();
        // TODO: use JSON types in services then deepEqual here.
        expect(data.cells[0]).to.eql(DEFAULT_CONTENT.cells[0]);
      });

    });

    describe('#fromJSON()', () => {

      it('should serialize the model from JSON', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.cells.length).to.be(6);
        expect(model.nbformat).to.be(DEFAULT_CONTENT.nbformat);
        expect(model.nbformatMinor).to.be(DEFAULT_CONTENT.nbformat_minor);
      });

      it('should set the dirty flag', () => {
        let model = new NotebookModel();
        model.dirty = false;
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.dirty).to.be(true);
      });

    });

    describe('#initialize()', () => {

      it('should initialize the model state', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        model.cells.add(cell);
        expect(model.dirty).to.be(true);
        expect(model.cells.canUndo).to.be(true);
        model.initialize();
        expect(model.dirty).to.be(false);
        expect(model.cells.canUndo).to.be(false);
      });

    });

    describe('#createCodeCell()', () => {

      it('should create a new code cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        expect(cell.type).to.be('code');
      });

      it('should clone an existing code cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.source = 'foo';
        let newCell = model.createCodeCell(cell.toJSON());
        expect(newCell.source).to.be('foo');
      });

      it('should clone an existing raw cell', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        cell.source = 'foo';
        let newCell = model.createCodeCell(cell.toJSON());
        expect(newCell.source).to.be('foo');
      });

    });

    describe('#createRawCell()', () => {

      it('should create a new raw cell', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        expect(cell.type).to.be('raw');
      });

      it('should clone an existing raw cell', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        cell.source = 'foo';
        let newCell = model.createRawCell(cell.toJSON());
        expect(newCell.source).to.be('foo');
      });

      it('should clone an existing code cell', () => {
        let model = new NotebookModel();
        let cell = model.createCodeCell();
        cell.source = 'foo';
        let newCell = model.createRawCell(cell.toJSON());
        expect(newCell.source).to.be('foo');
      });

    });

    describe('#createMarkdownCell()', () => {

      it('should create a new markdown cell', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        expect(cell.type).to.be('markdown');
      });

      it('should clone an existing markdown cell', () => {
        let model = new NotebookModel();
        let cell = model.createMarkdownCell();
        cell.source = 'foo';
        let newCell = model.createMarkdownCell(cell.toJSON());
        expect(newCell.source).to.be('foo');
      });

      it('should clone an existing raw cell', () => {
        let model = new NotebookModel();
        let cell = model.createRawCell();
        cell.source = 'foo';
        let newCell = model.createMarkdownCell(cell.toJSON());
        expect(newCell.source).to.be('foo');
      });

    });

    describe('#getMetadata()', () => {

      it('should get a metadata cursor for the notebook', () => {
        let model = new NotebookModel();
        let cursor = model.getMetadata('foo');
        expect(cursor.getValue()).to.be(void 0);
      });

      it('should get the value for all cursors', () => {
        let model = new NotebookModel();
        let cursor0 = model.getMetadata('foo');
        let cursor1 = model.getMetadata('foo');
        cursor0.setValue(1);
        expect(cursor1.getValue()).to.be(1);
      });

    });

    describe('#listMetadata()', () => {

      it('should list the metadata namespace keys for the notebook', () => {
        let model = new NotebookModel();
        let keys = ['kernelspec', 'language_info', 'orig_nbformat'];
        expect(model.listMetadata()).to.eql(keys);
        let cursor = model.getMetadata('foo');
        expect(model.listMetadata()).to.eql(keys);
        cursor.setValue(1);
        keys.push('foo');
        expect(model.listMetadata()).to.eql(keys);
      });

    });

    describe('#onCellsChanged()', () => {

    });

    describe('#onCellChanged()', () => {

    });

    describe('#setCursorData()', () => {

    });

  });

});
