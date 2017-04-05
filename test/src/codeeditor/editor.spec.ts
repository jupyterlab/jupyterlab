// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

describe('CodeEditor.Model', () => {

  let model: CodeEditor.Model;

  beforeEach(() => {
    model = new CodeEditor.Model();
  });

  afterEach(() => {
    model.dispose();
  });

  describe('#constructor()', () => {

    it('should create a CodeEditor Model', () => {
      expect(model).to.be.a(CodeEditor.Model);
      expect(model.value.text).to.equal('');
    });

    it('should create a CodeEditor Model with an initial value', () => {
      let other = new CodeEditor.Model({value: 'Initial text here'});
      expect(other).to.be.a(CodeEditor.Model);
      expect(other.value.text).to.equal('Initial text here');
      other.dispose();
    });

    it('should create a CodeEditor Model with an initial mimetype', () => {
      let other = new CodeEditor.Model({value: 'import this', mimeType: 'text/x-python'});
      expect(other).to.be.a(CodeEditor.Model);
      expect(other.mimeType).to.equal('text/x-python');
      expect(other.value.text).to.equal('import this');
      other.dispose();
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
        console.log('hi', args.value)
        expect(sender).to.be(model.value);
        expect(args.type).to.be('set');
        expect(args.value).to.be('foo');
        called = true;
      });
      model.value.text = 'foo';
      expect(called).to.be(true);
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
      expect(model.selections.keys().length).to.be(0);
    });

  });

  describe('#mimeType', () => {

    it('should be the mime type of the model', () => {
      expect(model.mimeType).to.be('text/plain');
      model.mimeType = 'text/foo';
      expect(model.mimeType).to.be('text/foo');
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the model is disposed', () => {
      expect(model.isDisposed).to.be(false);
      model.dispose();
      expect(model.isDisposed).to.be(true);
    });

  });

});
