// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  IEditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { YFile } from '@jupyter/ydoc';

describe('CodeMirrorEditorFactory', () => {
  let host: HTMLElement;
  let model: CodeEditor.IModel;
  let extensions: IEditorExtensionRegistry;

  const defaults: Record<string, any> = {
    lineNumbers: false,
    lineWrap: true
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    extensions = new EditorExtensionRegistry();
    extensions.addExtension({
      name: 'lineNumbers',
      default: true,
      factory: () => EditorExtensionRegistry.createImmutableExtension([])
    });
    extensions.addExtension({
      name: 'lineWrap',
      default: false,
      factory: () => EditorExtensionRegistry.createImmutableExtension([])
    });
    model = new CodeEditor.Model({
      sharedModel: new YFile()
    });
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
      const languages = new EditorLanguageRegistry();
      const findBest = jest.spyOn(languages, 'findBest');
      const factory = new CodeMirrorEditorFactory({ languages });
      expect(factory).toBeInstanceOf(CodeMirrorEditorFactory);
      factory.newInlineEditor({ host, model });
      expect(findBest).toHaveBeenCalled();
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
      const factory = new CodeMirrorEditorFactory();
      const editor = factory.newInlineEditor({
        host,
        model
      }) as CodeMirrorEditor;
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
      for (const key in Object.keys(defaults)) {
        const option = key as keyof Record<string, any>;
        expect(editor.getOption(option)).toBe(defaults[option]);
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
      const factory = new CodeMirrorEditorFactory({ extensions });
      const editor = factory.newDocumentEditor({
        host,
        model,
        config: defaults
      }) as CodeMirrorEditor;
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
      for (const key in Object.keys(defaults)) {
        expect(editor.getOption(key)).toBe(defaults[key]);
      }
      editor.dispose();
    });
  });
});
