// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { ISharedString, SharedDoc } from '@jupyterlab/shared-models';

describe('CodeEditor.Model', () => {
  let model: CodeEditor.Model;

  beforeEach(() => {
    model = new CodeEditor.Model({ isStandalone: true });
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
      const sharedDoc = new SharedDoc();
      const value = sharedDoc.createString('source');
      value.text = 'Initial text here';
      const other = new CodeEditor.Model({ isStandalone: true, sharedDoc });
      expect(other).toBeInstanceOf(CodeEditor.Model);
      expect(other.value.text).toBe('Initial text here');
      other.dispose();
    });

    it('should create a CodeEditor Model with an initial mimetype', () => {
      const other = new CodeEditor.Model({
        isStandalone: true,
        mimeType: 'text/x-python'
      });
      expect(other).toBeInstanceOf(CodeEditor.Model);
      expect(other.mimeType).toBe('text/x-python');
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
        sender: ISharedString,
        args: ISharedString.IChangedArgs
      ) => {
        expect(sender).toBe(model.value);
        expect(args[0].insert).toBe('foo');
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
        sender: ISharedString,
        args: ISharedString.IChangedArgs
      ) => {
        expect(sender).toBe(model.value);
        expect(args[0].insert).toBe('foo');
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
        sender: ISharedString,
        args: ISharedString.IChangedArgs
      ) => {
        expect(sender).toBe(model.value);
        expect(args[0].delete).toBe(1);
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

  describe('#isDisposed', () => {
    it('should test whether the model is disposed', () => {
      expect(model.value.isDisposed).toBe(false);
      expect(model.isDisposed).toBe(false);
      model.dispose();
      expect(model.value.isDisposed).toBe(true);
      expect(model.isDisposed).toBe(true);
    });
  });
});
