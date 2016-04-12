// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  EditorModel
} from '../../../lib/editor/model';

import {
  InputAreaModel
} from '../../../lib/input-area/model';

import {
  OutputAreaModel
} from '../../../lib/output-area/model';

import {
  BaseCellModel, CodeCellModel, MarkdownCellModel, MetadataCursor,
  RawCellModel, isMarkdownCellModel, isRawCellModel, isCodeCellModel
} from '../../../lib/cells/model';

import {
  MockKernel
} from '../notebook/mock';


/**
 * A cell model which tests protected methods.
 */
class MyCellModel extends BaseCellModel {
  called = false

  protected onTrustChanged(value: boolean): void {
    super.onTrustChanged(value);
    this.called = true;
  }
}


describe('jupyter-js-notebook', () => {

  describe('BaseCellModel', () => {

    describe('#constructor()', () => {

      it('should create an base cell model', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model instanceof BaseCellModel).to.be(true);
      });

    });

    describe('#stateChanged', () => {

      it('should be emitted when the state changes', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('trusted');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.trusted = true;
        expect(called).to.be(true);
      });

    });

    describe('#metadataChanged', () => {

      it('should be emitted when metadata changes', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let called = false;
        model.metadataChanged.connect((cell, name) => {
          expect(name).to.be('foo');
          called = true;
        });
        let foo = model.getMetadata('foo');
        foo.setValue(1);
        expect(called).to.be(true);
      });

      it('should throw an error on blacklisted names', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let blacklist = ['tags', 'name', 'trusted', 'collapsed', 'scrolled',
                     'execution_count', 'format'];
        for (let key of blacklist) {
          expect(() => { model.getMetadata(key); }).to.throwError();
        }
      });

    });

    describe('#input', () => {

      it('should be the input area model', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model.input).to.be(input);
      });

      it('should be read only', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(() => { model.input = null; }).to.throwError();
      });

    });

    describe('#trusted', () => {

      it('should default to false', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model.trusted).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('trusted');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.trusted = true;
        expect(called).to.be(true);
      });

    });

    describe('#name', () => {

      it('should default to null', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model.name).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('name');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be('foo');
          called = true;
        });
        model.name = 'foo';
        expect(called).to.be(true);
      });

    });

    describe('#tags', () => {

      it('should default to an empty array', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model.tags).to.eql([]);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('tags');
          expect(change.oldValue).to.eql([]);
          expect(change.newValue).to.eql(['foo']);
          called = true;
        });
        model.tags = ['foo'];
        expect(called).to.be(true);
      });

      it('should return a read-only copy', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        model.tags = ['foo'];
        let tags = model.tags;
        tags.push('bar');
        expect(model.tags).to.eql(['foo']);
      });

    });

    describe('#isDisposed', () => {

      it('should indicate whether the model is disposed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model.isDisposed).to.be(false);
        model.dispose();
        expect(model.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let called = false;
        model.stateChanged.connect(() => { called = true; });
        model.dispose();
        model.trusted = true;
        expect(called).to.be(false);
        expect(model.input).to.be(null);
      });

      it('should be safe to call multiple times', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        model.dispose();
        model.dispose();
      });

    });

    describe('#getMetadata()', () => {

      it('should get a metadata cursor for the cell', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        let cursor = model.getMetadata('foo');
        expect(cursor.getValue()).to.be(null);
        cursor.setValue(1);
        expect(cursor.getValue()).to.be(1);
        let cursor2 = model.getMetadata('foo');
        expect(cursor2.getValue()).to.be(1);
        cursor2.setValue(2);
        expect(cursor.getValue()).to.be(2);
      });

    });

    describe('#listMetadata()', () => {

      it('should get a list of user metadata keys', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new BaseCellModel(input);
        expect(model.listMetadata()).to.eql([]);
        let cursor = model.getMetadata('foo');
        expect(model.listMetadata()).to.eql([]);
        cursor.setValue(1);
        expect(model.listMetadata()).to.eql(['foo']);
      });

    });

    describe('#onTrustChanged()', () => {

      it('should be called when trust changes', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new MyCellModel(input);
        model.trusted = true;
        expect(model.called).to.be(true);
      });

    });

  });

  describe('CodeCellModel', () => {

    describe('#constructor()', () => {

      it('should construct a new code cell model', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        expect(model instanceof CodeCellModel).to.be(true);
      });

    });

    describe('#output', () => {

      it('should be the output area model', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        expect(model.output).to.be(output);
      });

      it('should be read-only', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        expect(() => { model.output = null; }).to.throwError();
      });

    });

    describe('#executionCount', () => {

      it('should default to null', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        expect(model.executionCount).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('executionCount');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be(1);
          called = true;
        });
        model.executionCount = 1;
        expect(called).to.be(true);
      });

    });

    describe('#collapsed', () => {

      it('should default to false', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        expect(model.collapsed).to.be(false);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('collapsed');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.collapsed = true;
        expect(called).to.be(true);
      });

    });

    describe('#scrolled', () => {

      it('should default to false', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        expect(model.scrolled).to.be(false);
      });

      it('should be a boolean or `auto`', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        model.scrolled = false;
        model.scrolled = true;
        model.scrolled = 'auto';
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('scrolled');
          expect(change.oldValue).to.be(false);
          expect(change.newValue).to.be(true);
          called = true;
        });
        model.scrolled = true;
        expect(called).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the model', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        model.dispose();
        expect(model.output).to.be(null);
        model.dispose();
      });

    });

    describe('#execute()', () => {

      it('should clear the prompt on a code cell if there is no text', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        let kernel = new MockKernel();
        model.input.prompt = '';
        model.execute(kernel);
        expect(model.input.prompt).to.be('In [ ]:');
      });

      it('should set the prompt to busy when executing', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        model.input.textEditor.text = 'a = 1';
        let kernel = new MockKernel();
        model.execute(kernel);
        expect(model.input.prompt).to.be('In [*]:');
      });

    });

    describe('#onTrustChanged()', () => {

      it('should set the trusted value of the output area', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let output = new OutputAreaModel();
        let model = new CodeCellModel(input, output);
        model.trusted = true;
        expect(model.output.trusted).to.be(true);
      });

    });

  });

  describe('MarkdownCellModel', () => {


    describe('#rendered', () => {

      it('should default to true', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new MarkdownCellModel(input);
        expect(model.rendered).to.be(true);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new MarkdownCellModel(input);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('rendered');
          expect(change.oldValue).to.be(true);
          expect(change.newValue).to.be(false);
          called = true;
        });
        model.rendered = false;
        expect(called).to.be(true);
      });

    });

  });

  describe('RawCellModel', () => {


    describe('#format', () => {

      it('should default to null', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new RawCellModel(input);
        expect(model.format).to.be(null);
      });

      it('should emit a stateChanged signal when changed', () => {
        let editor = new EditorModel();
        let input = new InputAreaModel(editor);
        let model = new RawCellModel(input);
        let called = false;
        model.stateChanged.connect((cell, change) => {
          expect(change.name).to.be('format');
          expect(change.oldValue).to.be(null);
          expect(change.newValue).to.be('foo');
          called = true;
        });
        model.format = 'foo';
        expect(called).to.be(true);
      });

    });

  });

  describe('isMarkdownCellModel', () => {

    it('should indicate whether a cell is of markdown type', () => {
      let editor = new EditorModel();
      let input = new InputAreaModel(editor);
      let raw = new RawCellModel(input);
      let md = new MarkdownCellModel(input);
      expect(isMarkdownCellModel(raw)).to.be(false);
      expect(isMarkdownCellModel(md)).to.be(true);
    });

  });

  describe('isCodeCellModel', () => {

    it('should indicate whether a cell is of code type', () => {
      let editor = new EditorModel();
      let input = new InputAreaModel(editor);
      let raw = new RawCellModel(input);
      let output = new OutputAreaModel();
      let code = new CodeCellModel(input, output);
      expect(isCodeCellModel(raw)).to.be(false);
      expect(isCodeCellModel(code)).to.be(true);
    });

  });

  describe('isRawCellModel', () => {

    it('should indicate whether a cell is of raw type', () => {
      let editor = new EditorModel();
      let input = new InputAreaModel(editor);
      let raw = new RawCellModel(input);
      let md = new MarkdownCellModel(input);
      expect(isRawCellModel(raw)).to.be(true);
      expect(isRawCellModel(md)).to.be(false);
    });

  });

  describe('MetadataCursor', () => {

    describe('#constructor()', () => {

      it('should construct a new metadata cursor', () => {
        let cursor = new MetadataCursor('foo', {}, name => { });
        expect(cursor instanceof MetadataCursor).to.be(true);
      });

    });

    describe('#name', () => {

      it('should be the name of the cursor', () => {
        let cursor = new MetadataCursor('foo', {}, name => { });
        expect(cursor.name).to.be('foo');
      });

      it('should be read-only', () => {
        let cursor = new MetadataCursor('foo', {}, name => { });
        expect(() => { cursor.name = ''; }).to.throwError();
      });

    });

    describe('#getValue()', () => {

      it('should get the value of the metadata', () => {
        let cursor = new MetadataCursor('foo', {}, name => { });
        expect(cursor.getValue()).to.be(null);
        cursor.setValue(1);
        expect(cursor.getValue()).to.be(1);
      });

    });

    describe('#setValue()', () => {

      it('should set the value of the metadata', () => {
        let cursor = new MetadataCursor('foo', {}, name => { });
        cursor.setValue(1);
        expect(cursor.getValue()).to.be(1);
      });

      it('should trigger the callback', () => {
        let called = false;
        let cursor = new MetadataCursor('foo', {}, name => {
          expect(name).to.be('foo');
          called = true;
        });
        cursor.setValue('bar');
      });

    });

  });

});
