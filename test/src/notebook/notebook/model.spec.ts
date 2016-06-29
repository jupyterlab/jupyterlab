// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeCellModel
} from '../../../../lib/notebook/cells/model';

import {
  ObservableUndoableList
} from '../../../../lib/notebook/common/undo';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  DEFAULT_CONTENT
} from '../utils';


describe('notebook/notebook', () => {

  describe('NotebookModel', () => {

    describe('#constructor()', () => {

      it('should create a notebook model', () => {
        let model = new NotebookModel();
        expect(model).to.be.a(NotebookModel);
      });

      it('should accept an optional language preference', () => {
        let model = new NotebookModel({ languagePreference: 'python' });
        let cursor = model.getMetadata('language_info');
        let lang = cursor.getValue() as nbformat.ILanguageInfoMetadata;
        expect(lang.name).to.be('python');
      });

      it('should add a single code cell by default', () => {
        let model = new NotebookModel();
        expect(model.cells.length).to.be(1);
        expect(model.cells.get(0)).to.be.a(CodeCellModel);
      });

      it('should accept an optional factory', () => {
        let factory = new NotebookModel.Factory();
        let model = new NotebookModel({ factory });
        expect(model.factory).to.be(factory);
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

      it('should add an empty code cell by default', () => {
        let model = new NotebookModel();
        expect(model.cells.length).to.be(1);
        expect(model.cells.get(0)).to.be.a(CodeCellModel);
      });

      it('should be reset when loading from disk', () => {
        let model = new NotebookModel();
        let cell = model.factory.createCodeCell();
        model.cells.add(cell);
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.cells.indexOf(cell)).to.be(-1);
        expect(model.cells.length).to.be(6);
      });

      it('should allow undoing a change', () => {
        let model = new NotebookModel();
        let cell = model.factory.createCodeCell();
        cell.source = 'foo';
        model.cells.add(cell);
        model.fromJSON(DEFAULT_CONTENT);
        model.cells.undo();
        expect(model.cells.length).to.be(2);
        expect(model.cells.get(1).source).to.be('foo');
        expect(model.cells.get(1)).to.not.be(cell);  // should be a clone.
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.cells = null; }).to.throwError();
      });

      context('cells `changed` signal', () => {

        it('should emit a `contentChanged` signal', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          let called = false;
          model.contentChanged.connect(() => { called = true; });
          model.cells.add(cell);
          expect(called).to.be(true);
        });

        it('should set the dirty flag', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          model.cells.add(cell);
          expect(model.dirty).to.be(true);
        });

        it('should dispose of old cells', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          model.cells.add(cell);
          model.cells.clear();
          expect(cell.isDisposed).to.be(true);
        });

      });

      describe('cell `changed` signal', () => {

        it('should be called when a cell content changes', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          model.cells.add(cell);
          cell.source = 'foo';
        });

        it('should emit the `contentChanged` signal', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          model.cells.add(cell);
          let called = false;
          model.contentChanged.connect(() => { called = true; });
          let cursor = cell.getMetadata('foo');
          cursor.setValue('bar');
          expect(called).to.be(true);
        });

        it('should set the dirty flag', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          model.cells.add(cell);
          model.dirty = false;
          cell.source = 'foo';
          expect(model.dirty).to.be(true);
        });

      });

    });

    describe('#factory', () => {

      it('should be the cell model factory used by the model', () => {
        let model = new NotebookModel();
        expect(model.factory).to.be(NotebookModel.defaultFactory);
      });

      it('should be read-only', () => {
        let model = new NotebookModel();
        expect(() => { model.factory = null; }).to.throwError();
      });

      context('createCodeCell()', () => {

        it('should create a new code cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          expect(cell.type).to.be('code');
        });

        it('should clone an existing code cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          cell.source = 'foo';
          let newCell = model.factory.createCodeCell(cell.toJSON());
          expect(newCell.source).to.be('foo');
        });

        it('should clone an existing raw cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createRawCell();
          cell.source = 'foo';
          let newCell = model.factory.createCodeCell(cell.toJSON());
          expect(newCell.source).to.be('foo');
        });

      });

      context('createRawCell()', () => {

        it('should create a new raw cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createRawCell();
          expect(cell.type).to.be('raw');
        });

        it('should clone an existing raw cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createRawCell();
          cell.source = 'foo';
          let newCell = model.factory.createRawCell(cell.toJSON());
          expect(newCell.source).to.be('foo');
        });

        it('should clone an existing code cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createCodeCell();
          cell.source = 'foo';
          let newCell = model.factory.createRawCell(cell.toJSON());
          expect(newCell.source).to.be('foo');
        });

      });

      describe('createMarkdownCell()', () => {

        it('should create a new markdown cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createMarkdownCell();
          expect(cell.type).to.be('markdown');
        });

        it('should clone an existing markdown cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createMarkdownCell();
          cell.source = 'foo';
          let newCell = model.factory.createMarkdownCell(cell.toJSON());
          expect(newCell.source).to.be('foo');
        });

        it('should clone an existing raw cell', () => {
          let model = new NotebookModel();
          let cell = model.factory.createRawCell();
          cell.source = 'foo';
          let newCell = model.factory.createMarkdownCell(cell.toJSON());
          expect(newCell.source).to.be('foo');
        });

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
        let model = new NotebookModel({ languagePreference: 'foo' });
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
        expect(data.cells.length).to.be(6);
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
        expect(data.cells.length).to.be(6);
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

      it('should set the dirty flag', () => {
        let model = new NotebookModel();
        let cursor = model.getMetadata('foo');
        cursor.setValue('bar');
        expect(model.dirty).to.be(true);
      });

      it('should emit the `contentChanged` signal', () => {
        let model = new NotebookModel();
        let cursor = model.getMetadata('foo');
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        cursor.setValue('bar');
        expect(called).to.be(true);
      });

      it('should emit the `metadataChanged` signal', () => {
        let model = new NotebookModel();
        let cursor = model.getMetadata('foo');
        let called = false;
        model.metadataChanged.connect((sender, args) => {
          expect(sender).to.be(model);
          expect(args.name).to.be('foo');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue).to.be('bar');
          called = true;
        });
        cursor.setValue('bar');
        expect(called).to.be(true);
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

  });

});
