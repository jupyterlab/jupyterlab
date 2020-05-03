// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

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
      expect(model).toBeInstanceOf(CodeEditor.Model);
      expect(model.value.text).toBe('');
    });

    it('should create a CodeEditor Model with an initial value', () => {
      const other = new CodeEditor.Model({ value: 'Initial text here' });
      expect(other).toBeInstanceOf(CodeEditor.Model);
      expect(other.value.text).toBe('Initial text here');
      other.dispose();
    });

    it('should create a CodeEditor Model with an initial mimetype', () => {
      const other = new CodeEditor.Model({
        value: 'import this',
        mimeType: 'text/x-python'
      });
      expect(other).toBeInstanceOf(CodeEditor.Model);
      expect(other.mimeType).toBe('text/x-python');
      expect(other.value.text).toBe('import this');
      other.dispose();
    });
  });

  describe('#mimeTypeChanged', () => {
    it('should be emitted when the mime type changes', () => {
      let called = false;
      model.mimeTypeChanged.connect((sender, args) => {
        expect(sender).toBe(model);
        expect(args.oldValue).toBe('text/plain');
        expect(args.newValue).toBe('text/foo');
        called = true;
      });
      model.mimeType = 'text/foo';
      expect(called).toBe(true);
    });
  });

  describe('#value', () => {
    it('should be the observable value of the model', () => {
      let called = false;
      const handler = (
        sender: IObservableString,
        args: IObservableString.IChangedArgs
      ) => {
        expect(sender).toBe(model.value);
        expect(args.type).toBe('set');
        expect(args.value).toBe('foo');
        called = true;
      };
      model.value.changed.connect(handler);
      model.value.text = 'foo';
      expect(called).toBe(true);
      model.value.changed.disconnect(handler);
    });

    it('should handle an insert', () => {
      let called = false;
      const handler = (
        sender: IObservableString,
        args: IObservableString.IChangedArgs
      ) => {
        expect(args.type).toBe('insert');
        expect(args.value).toBe('foo');
        called = true;
      };
      model.value.changed.connect(handler);
      model.value.insert(0, 'foo');
      expect(called).toBe(true);
      model.value.changed.disconnect(handler);
    });

    it('should handle a remove', () => {
      let called = false;
      model.value.text = 'foo';
      const handler = (
        sender: IObservableString,
        args: IObservableString.IChangedArgs
      ) => {
        expect(args.type).toBe('remove');
        expect(args.value).toBe('f');
        called = true;
      };
      model.value.changed.connect(handler);
      model.value.remove(0, 1);
      expect(called).toBe(true);
      model.value.changed.disconnect(handler);
    });
  });

  describe('#selections', () => {
    it('should be the selections associated with the model', () => {
      expect(model.selections.keys().length).toBe(0);
    });
  });

  describe('#mimeType', () => {
    it('should be the mime type of the model', () => {
      expect(model.mimeType).toBe('text/plain');
      model.mimeType = 'text/foo';
      expect(model.mimeType).toBe('text/foo');
    });
  });

  describe('#modelDB', () => {
    it('should get the modelDB object associated with the model', () => {
      expect(model.modelDB.has('value')).toBe(true);
    });
  });

  describe('#isDisposed', () => {
    it('should test whether the model is disposed', () => {
      expect(model.isDisposed).toBe(false);
      model.dispose();
      expect(model.isDisposed).toBe(true);
    });
  });
});
