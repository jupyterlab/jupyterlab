// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IObservableString } from '@jupyterlab/observables';

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
      expect(model).to.be.an.instanceof(CodeEditor.Model);
      expect(model.value.text).to.equal('');
    });

    it('should create a CodeEditor Model with an initial value', () => {
      let other = new CodeEditor.Model({ value: 'Initial text here' });
      expect(other).to.be.an.instanceof(CodeEditor.Model);
      expect(other.value.text).to.equal('Initial text here');
      other.dispose();
    });

    it('should create a CodeEditor Model with an initial mimetype', () => {
      let other = new CodeEditor.Model({
        value: 'import this',
        mimeType: 'text/x-python'
      });
      expect(other).to.be.an.instanceof(CodeEditor.Model);
      expect(other.mimeType).to.equal('text/x-python');
      expect(other.value.text).to.equal('import this');
      other.dispose();
    });
  });

  describe('#mimeTypeChanged', () => {
    it('should be emitted when the mime type changes', () => {
      let called = false;
      model.mimeTypeChanged.connect((sender, args) => {
        expect(sender).to.equal(model);
        expect(args.oldValue).to.equal('text/plain');
        expect(args.newValue).to.equal('text/foo');
        called = true;
      });
      model.mimeType = 'text/foo';
      expect(called).to.be.true;
    });
  });

  describe('#value', () => {
    it('should be the observable value of the model', () => {
      let called = false;
      const handler = (
        sender: IObservableString,
        args: IObservableString.IChangedArgs
      ) => {
        expect(sender).to.equal(model.value);
        expect(args.type).to.equal('set');
        expect(args.value).to.equal('foo');
        called = true;
      };
      model.value.changed.connect(handler);
      model.value.text = 'foo';
      expect(called).to.be.true;
      model.value.changed.disconnect(handler);
    });

    it('should handle an insert', () => {
      let called = false;
      const handler = (
        sender: IObservableString,
        args: IObservableString.IChangedArgs
      ) => {
        expect(args.type).to.equal('insert');
        expect(args.value).to.equal('foo');
        called = true;
      };
      model.value.changed.connect(handler);
      model.value.insert(0, 'foo');
      expect(called).to.be.true;
      model.value.changed.disconnect(handler);
    });

    it('should handle a remove', () => {
      let called = false;
      model.value.text = 'foo';
      const handler = (
        sender: IObservableString,
        args: IObservableString.IChangedArgs
      ) => {
        expect(args.type).to.equal('remove');
        expect(args.value).to.equal('f');
        called = true;
      };
      model.value.changed.connect(handler);
      model.value.remove(0, 1);
      expect(called).to.be.true;
      model.value.changed.disconnect(handler);
    });
  });

  describe('#selections', () => {
    it('should be the selections associated with the model', () => {
      expect(model.selections.keys().length).to.equal(0);
    });
  });

  describe('#mimeType', () => {
    it('should be the mime type of the model', () => {
      expect(model.mimeType).to.equal('text/plain');
      model.mimeType = 'text/foo';
      expect(model.mimeType).to.equal('text/foo');
    });
  });

  describe('#modelDB', () => {
    it('should get the modelDB object associated with the model', () => {
      expect(model.modelDB.has('value')).to.be.true;
    });
  });

  describe('#isDisposed', () => {
    it('should test whether the model is disposed', () => {
      expect(model.isDisposed).to.be.false;
      model.dispose();
      expect(model.isDisposed).to.be.true;
    });
  });
});
