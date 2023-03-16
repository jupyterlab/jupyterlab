// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { ISharedText, SourceChange, YFile } from '@jupyter/ydoc';

describe('CodeEditor.Model', () => {
  let model: CodeEditor.Model;

  beforeEach(() => {
    const sharedModel = new YFile();
    model = new CodeEditor.Model({ sharedModel });
  });

  afterEach(() => {
    model.dispose();
  });

  describe('#constructor()', () => {
    it('should create a CodeEditor Model', () => {
      expect(model).toBeInstanceOf(CodeEditor.Model);
      expect(model.sharedModel.getSource()).toBe('');
    });

    it('should create a CodeEditor Model with an initial value', () => {
      const sharedEditorModel = new YFile();
      sharedEditorModel.setSource('Initial text here');
      const other = new CodeEditor.Model({ sharedModel: sharedEditorModel });
      expect(other).toBeInstanceOf(CodeEditor.Model);
      expect(other.sharedModel.getSource()).toBe('Initial text here');
      other.dispose();
    });

    it('should create a CodeEditor Model with an initial mimetype', () => {
      const sharedEditorModel = new YFile();
      sharedEditorModel.setSource('import this');
      const other = new CodeEditor.Model({
        sharedModel: sharedEditorModel,
        mimeType: 'text/x-python'
      });
      expect(other).toBeInstanceOf(CodeEditor.Model);
      expect(other.mimeType).toBe('text/x-python');
      expect(other.sharedModel.getSource()).toBe('import this');
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
      const handler = (sender: ISharedText, args: SourceChange) => {
        expect(sender).toBe(model.sharedModel);
        expect(args.sourceChange).toEqual([{ insert: 'foo' }]);
        called = true;
      };
      model.sharedModel.changed.connect(handler);
      model.sharedModel.setSource('foo');
      expect(called).toBe(true);
      model.sharedModel.changed.disconnect(handler);
    });

    it('should handle an insert', () => {
      let called = false;
      const handler = (sender: ISharedText, args: SourceChange) => {
        expect(args.sourceChange).toEqual([{ insert: 'foo' }]);
        called = true;
      };
      model.sharedModel.changed.connect(handler);
      model.sharedModel.updateSource(0, 0, 'foo');
      expect(called).toBe(true);
      model.sharedModel.changed.disconnect(handler);
    });

    it('should handle a remove', () => {
      let called = false;
      model.sharedModel.setSource('foo');
      const handler = (sender: ISharedText, args: SourceChange) => {
        expect(args.sourceChange).toEqual([{ delete: 1 }]);
        called = true;
      };
      model.sharedModel.changed.connect(handler);
      model.sharedModel.updateSource(0, 1);
      expect(called).toBe(true);
      model.sharedModel.changed.disconnect(handler);
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
      expect(model.isDisposed).toBe(false);
      model.dispose();
      expect(model.isDisposed).toBe(true);
    });
  });
});
