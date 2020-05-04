// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { CodeEditor } from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditorFactory,
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

class ExposeCodeMirrorEditorFactory extends CodeMirrorEditorFactory {
  public inlineCodeMirrorConfig: CodeMirrorEditor.IConfig;
  public documentCodeMirrorConfig: CodeMirrorEditor.IConfig;
}

describe('CodeMirrorEditorFactory', () => {
  let host: HTMLElement;
  let model: CodeEditor.IModel;

  const options: Partial<CodeMirrorEditor.IConfig> = {
    lineNumbers: false,
    lineWrap: 'on',
    extraKeys: {
      'Ctrl-Tab': 'indentAuto'
    }
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    model = new CodeEditor.Model();
  });

  afterEach(() => {
    document.body.removeChild(host);
  });

  describe('#constructor()', () => {
    it('should create a CodeMirrorEditorFactory', () => {
      const factory = new CodeMirrorEditorFactory();
      expect(factory).toBeInstanceOf(CodeMirrorEditorFactory);
    });

    it('should create a CodeMirrorEditorFactory with options', () => {
      const factory = new ExposeCodeMirrorEditorFactory(options);
      expect(factory).toBeInstanceOf(CodeMirrorEditorFactory);
      expect(factory.inlineCodeMirrorConfig.extraKeys).toEqual(
        options.extraKeys
      );
      expect(factory.documentCodeMirrorConfig.extraKeys).toEqual(
        options.extraKeys
      );
    });
  });

  describe('#newInlineEditor', () => {
    it('should create a new editor', () => {
      const factory = new CodeMirrorEditorFactory();
      const editor = factory.newInlineEditor({ host, model });
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
      editor.dispose();
    });

    it('should create a new editor with given options', () => {
      const factory = new CodeMirrorEditorFactory(options);
      const editor = factory.newInlineEditor({
        host,
        model
      }) as CodeMirrorEditor;
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
      for (const key in Object.keys(options)) {
        const option = key as keyof CodeMirrorEditor.IConfig;
        expect(editor.getOption(option)).toBe(options[option]);
      }
      editor.dispose();
    });
  });

  describe('#newDocumentEditor', () => {
    it('should create a new editor', () => {
      const factory = new CodeMirrorEditorFactory();
      const editor = factory.newDocumentEditor({ host, model });
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
      editor.dispose();
    });

    it('should create a new editor with given options', () => {
      const factory = new CodeMirrorEditorFactory(options);
      const editor = factory.newDocumentEditor({
        host,
        model
      }) as CodeMirrorEditor;
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
      for (const key in Object.keys(options)) {
        const option = key as keyof CodeMirrorEditor.IConfig;
        expect(editor.getOption(option)).toBe(options[option]);
      }
      editor.dispose();
    });
  });
});
