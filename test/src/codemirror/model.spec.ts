// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror
  from 'codemirror';

import {
  CodeMirrorModel
} from '../../../lib/codemirror';


describe('CodeMirrorModel', () => {

  let model: CodeMirrorModel;

  beforeEach(() => {
    model = new CodeMirrorModel();
  });

  afterEach(() => {
    model.dispose();
  });

  describe('#constructor()', () => {

    it('should create a CodeMirrorModel', () => {
      expect(model).to.be.a(CodeMirrorModel);
    });

  });

  describe('#mimeTypeChanged', () => {

    it('should be emitted when the mime type changes', () => {
      let called = false;
      model.mimeTypeChanged.connect((sender, args) => {
        expect(sender).to.be(model);
        expect(args.oldValue).to.be('text/plain');
        expect(args.newValue).to.be('text/foo');
        called = true;
      });
      model.mimeType = 'text/foo';
      expect(called).to.be(true);
    });

  });

  describe('#value', () => {

    it('should be the observable value of the model', () => {
      let called = false;
      model.value.changed.connect((sender, args) => {
        expect(sender).to.be(model.value);
        expect(args.type).to.be('set');
        expect(args.value).to.be('foo');
        called = true;
      });
      model.value.text = 'foo';
      expect(called).to.be(true);
    });

    it('should handle changes to the doc itself', (done) => {
      let doc = model.doc;
      model.value.changed.connect((sender, args) => {
        expect(args.type).to.be('set');
        expect(args.value).to.be('foo');
        done();
      });
      doc.setValue('foo');
    });

    it('should handle an insert', () => {
      let called = false;
      model.value.changed.connect((sender, args) => {
        expect(args.type).to.be('insert');
        expect(args.value).to.be('foo');
        called = true;
      });
      model.value.insert(0, 'foo');
      expect(called).to.be(true);
    });

    it('should handle a remove', () => {
      let called = false;
      model.value.text = 'foo';
      model.value.changed.connect((sender, args) => {
        expect(args.type).to.be('remove');
        expect(args.value).to.be('f');
        called = true;
      });
      model.value.remove(0, 1);
      expect(called).to.be(true);
    });

  });

  describe('#selections', () => {

    it('should be the selections associated with the model', () => {
      expect(model.selections.uuids.length).to.be(0);
    });

  });

  describe('#doc', () => {

    it('should be the underlying CodeMirror Doc', () => {
      expect(model.doc).to.be.a(CodeMirror.Doc);
    });

  });

  describe('#mimeType', () => {

    it('should be the mime type of the model', () => {
      expect(model.mimeType).to.be('text/plain');
      model.mimeType = 'text/foo';
      expect(model.mimeType).to.be('text/foo');
    });

  });

  describe('#lineCount', () => {

    it('should get the number of lines in the model', () => {
      expect(model.lineCount).to.be(1);
      model.value.text = 'foo\nbar';
      expect(model.lineCount).to.be(2);
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the model is disposed', () => {
      expect(model.isDisposed).to.be(false);
      model.dispose();
      expect(model.isDisposed).to.be(true);
    });

  });

  describe('#getLine()', () => {

    it('should get a line of text', () => {
      model.value.text = 'foo\nbar';
      expect(model.getLine(0)).to.be('foo');
      expect(model.getLine(1)).to.be('bar');
      expect(model.getLine(2)).to.be(void 0);
    });

  });

  describe('#getOffsetAt()', () => {

    it('should get the offset for a given position', () => {
      model.value.text = 'foo\nbar';
      let pos = {
        column: 2,
        line: 1
      };
      expect(model.getOffsetAt(pos)).to.be(6);
      pos = {
        column: 2,
        line: 5
      };
      expect(model.getOffsetAt(pos)).to.be(7);
    });
  });

  describe('#getPositionAt()', () => {

    it('should get the position for a given offset', () => {
      model.value.text = 'foo\nbar';
      let pos = model.getPositionAt(6);
      expect(pos.column).to.be(2);
      expect(pos.line).to.be(1);
      pos = model.getPositionAt(101);
      expect(pos.column).to.be(3);
      expect(pos.line).to.be(1);
    });

  });

  describe('#undo()', () => {

    it('should undo one edit', () => {
      model.value.text = 'foo';
      model.undo();
      expect(model.value.text).to.be('');
    });

  });

  describe('#redo()', () => {

    it('should redo one undone edit', () => {
      model.value.text = 'foo';
      model.undo();
      model.redo();
      expect(model.value.text).to.be('foo');
    });

  });

  describe('#clearHistory()', () => {

    it('should clear the undo history', () => {
      model.value.text = 'foo';
      model.clearHistory();
      model.undo();
      expect(model.value.text).to.be('foo');
    });

  });

});
