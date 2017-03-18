// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ArrayExt, toArray
} from '@phosphor/algorithm';

import {
  CodeCellModel
} from '@jupyterlab/cells';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  NotebookModel
} from '@jupyterlab/notebook';

import {
  DEFAULT_CONTENT
} from './utils';


describe('notebook/notebook/model', () => {

  describe('NotebookModel', () => {

    describe('#constructor()', () => {

      it('should create a notebook model', () => {
        let model = new NotebookModel();
        expect(model).to.be.a(NotebookModel);
      });

      it('should accept an optional language preference', () => {
        let model = new NotebookModel({ languagePreference: 'python' });
        let lang = model.metadata.get('language_info') as nbformat.ILanguageInfoMetadata;
        expect(lang.name).to.be('python');
      });

      it('should add a single code cell by default', () => {
        let model = new NotebookModel();
        expect(model.cells.length).to.be(1);
        expect(model.cells.at(0)).to.be.a(CodeCellModel);
      });

      it('should accept an optional factory', () => {
        let contentFactory = new NotebookModel.ContentFactory({});
        let model = new NotebookModel({ contentFactory });
        expect(model.contentFactory).to.be(contentFactory);
      });

    });

    describe('#metadataChanged', () => {

      it('should be emitted when a metadata field changes', () => {
        let model = new NotebookModel();
        let called = false;
        model.metadata.changed.connect((sender, args) => {
          expect(sender).to.be(model.metadata);
          expect(args.key).to.be('foo');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue).to.be(1);
          called = true;
        });
        model.metadata.set('foo', 1);
        expect(called).to.be(true);
      });

      it('should not be emitted when the value does not change', () => {
        let model = new NotebookModel();
        let called = false;
        model.metadata.set('foo', 1);
        model.metadata.changed.connect(() => { called = true; });
        model.metadata.set('foo', 1);
        expect(called).to.be(false);
      });

    });

    describe('#cells', () => {

      it('should add an empty code cell by default', () => {
        let model = new NotebookModel();
        expect(model.cells.length).to.be(1);
        expect(model.cells.at(0)).to.be.a(CodeCellModel);
      });

      it('should be reset when loading from disk', () => {
        let model = new NotebookModel();
        let cell = model.contentFactory.createCodeCell({});
        model.cells.pushBack(cell);
        model.fromJSON(DEFAULT_CONTENT);
        expect(ArrayExt.firstIndexOf(toArray(model.cells), cell)).to.be(-1);
        expect(model.cells.length).to.be(6);
      });

      it('should allow undoing a change', () => {
        let model = new NotebookModel();
        let cell = model.contentFactory.createCodeCell({});
        cell.value.text = 'foo';
        model.cells.pushBack(cell);
        model.fromJSON(DEFAULT_CONTENT);
        model.cells.undo();
        expect(model.cells.length).to.be(2);
        expect(model.cells.at(1).value.text).to.be('foo');
        expect(model.cells.at(1)).to.be(cell);  // should be ===.
      });

      context('cells `changed` signal', () => {

        it('should emit a `contentChanged` signal', () => {
          let model = new NotebookModel();
          let cell = model.contentFactory.createCodeCell({});
          let called = false;
          model.contentChanged.connect(() => { called = true; });
          model.cells.pushBack(cell);
          expect(called).to.be(true);
        });

        it('should set the dirty flag', () => {
          let model = new NotebookModel();
          let cell = model.contentFactory.createCodeCell({});
          model.cells.pushBack(cell);
          expect(model.dirty).to.be(true);
        });

        it('should add a new code cell when cells are cleared', (done) => {
          let model = new NotebookModel();
          model.cells.clear();
          requestAnimationFrame(() => {
            expect(model.cells.length).to.be(1);
            expect(model.cells.at(0)).to.be.a(CodeCellModel);
            done();
          });
        });

      });

      describe('cell `changed` signal', () => {

        it('should be called when a cell content changes', () => {
          let model = new NotebookModel();
          let cell = model.contentFactory.createCodeCell({});
          model.cells.pushBack(cell);
          cell.value.text = 'foo';
        });

        it('should emit the `contentChanged` signal', () => {
          let model = new NotebookModel();
          let cell = model.contentFactory.createCodeCell({});
          model.cells.pushBack(cell);
          let called = false;
          model.contentChanged.connect(() => { called = true; });
          model.metadata.set('foo', 'bar');
          expect(called).to.be(true);
        });

        it('should set the dirty flag', () => {
          let model = new NotebookModel();
          let cell = model.contentFactory.createCodeCell({});
          model.cells.pushBack(cell);
          model.dirty = false;
          cell.value.text = 'foo';
          expect(model.dirty).to.be(true);
        });

      });

    });

    describe('#contentFactory', () => {

      it('should be the cell model factory used by the model', () => {
        let model = new NotebookModel();
        expect(model.contentFactory).to.be(NotebookModel.defaultContentFactory);
      });

    });

    describe('#nbformat', () => {

      it('should get the major version number of the nbformat', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.nbformat).to.be(DEFAULT_CONTENT.nbformat);
      });

    });

    describe('#nbformatMinor', () => {

      it('should get the minor version number of the nbformat', () => {
        let model = new NotebookModel();
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.nbformatMinor).to.be(nbformat.MINOR_VERSION);
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
        expect(model.nbformatMinor).to.be(nbformat.MINOR_VERSION);
      });

      it('should set the dirty flag', () => {
        let model = new NotebookModel();
        model.dirty = false;
        model.fromJSON(DEFAULT_CONTENT);
        expect(model.dirty).to.be(true);
      });

    });

    describe('#metadata', () => {

      it('should have default values', () => {
        let model = new NotebookModel();
        let metadata = model.metadata;
        expect(metadata.has('kernelspec'));
        expect(metadata.has('language_info'));
        expect(metadata.size).to.be(2);
      });

      it('should set the dirty flag when changed', () => {
        let model = new NotebookModel();
        expect(model.dirty).to.be(false);
        model.metadata.set('foo', 'bar');
        expect(model.dirty).to.be(true);
      });

      it('should emit the `contentChanged` signal', () => {
        let model = new NotebookModel();
        let called = false;
        model.contentChanged.connect(() => { called = true; });
        model.metadata.set('foo', 'bar');
        expect(called).to.be(true);
      });

      it('should emit the `metadataChanged` signal', () => {
        let model = new NotebookModel();
        let called = false;
        model.metadata.changed.connect((sender, args) => {
          expect(sender).to.be(model.metadata);
          expect(args.key).to.be('foo');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue).to.be('bar');
          called = true;
        });
        model.metadata.set('foo', 'bar');
        expect(called).to.be(true);
      });

    });

    describe('.ContentFactory', () => {

      let factory = new NotebookModel.ContentFactory({});

      context('#codeCellContentFactory', () => {

        it('should be a code cell content factory', () => {
          expect(factory.codeCellContentFactory).to.be(CodeCellModel.defaultContentFactory);
        });

        it('should be settable in the constructor', () => {
          let codeCellContentFactory = new CodeCellModel.ContentFactory();
          factory = new NotebookModel.ContentFactory({ codeCellContentFactory });
          expect(factory.codeCellContentFactory).to.be(codeCellContentFactory);
        });

      });

      context('#createCodeCell()', () => {

        it('should create a new code cell', () => {
          let cell = factory.createCodeCell({});
          expect(cell.type).to.be('code');
        });

        it('should clone an existing code cell', () => {
          let orig = factory.createCodeCell({});
          orig.value.text = 'foo';
          let cell = orig.toJSON();
          let newCell = factory.createCodeCell({ cell });
          expect(newCell.value.text).to.be('foo');
        });

        it('should clone an existing raw cell', () => {
          let orig = factory.createRawCell({});
          orig.value.text = 'foo';
          let cell = orig.toJSON();
          let newCell = factory.createCodeCell({ cell });
          expect(newCell.value.text).to.be('foo');
        });

      });

      context('#createRawCell()', () => {

        it('should create a new raw cell', () => {
          let cell = factory.createRawCell({});
          expect(cell.type).to.be('raw');
        });

        it('should clone an existing raw cell', () => {
          let orig = factory.createRawCell({});
          orig.value.text = 'foo';
          let cell = orig.toJSON();
          let newCell = factory.createRawCell({ cell });
          expect(newCell.value.text).to.be('foo');
        });

        it('should clone an existing code cell', () => {
          let orig = factory.createCodeCell({});
          orig.value.text = 'foo';
          let cell = orig.toJSON();
          let newCell = factory.createRawCell({ cell });
          expect(newCell.value.text).to.be('foo');
        });

      });

      describe('#createMarkdownCell()', () => {

        it('should create a new markdown cell', () => {
          let cell = factory.createMarkdownCell({});
          expect(cell.type).to.be('markdown');
        });

        it('should clone an existing markdown cell', () => {
          let orig = factory.createMarkdownCell({});
          orig.value.text = 'foo';
          let cell = orig.toJSON();
          let newCell = factory.createMarkdownCell({ cell });
          expect(newCell.value.text).to.be('foo');
        });

        it('should clone an existing raw cell', () => {
          let orig = factory.createRawCell({});
          orig.value.text = 'foo';
          let cell = orig.toJSON();
          let newCell = factory.createMarkdownCell({ cell });
          expect(newCell.value.text).to.be('foo');
        });

      });

    });

    describe('.defaultContentFactory', () => {

      it('should be a ContentFactory', () => {
        expect(NotebookModel.defaultContentFactory).to.be.a(NotebookModel.ContentFactory);
      });

    });

  });

});
