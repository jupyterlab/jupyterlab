// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditorFactory, CodeMirrorEditor
} from '@jupyterlab/codemirror';


class ExposeCodeMirrorEditorFactory extends CodeMirrorEditorFactory {
  public inlineCodeMirrorOptions: CodeMirror.EditorConfiguration;
  public documentCodeMirrorOptions: CodeMirror.EditorConfiguration;
}


describe('CodeMirrorEditorFactory', () => {
  let host: HTMLElement;
  let model: CodeEditor.IModel;

  const options: CodeMirror.EditorConfiguration = {
    lineNumbers: false,
    lineWrapping: true,
    extraKeys: {
      'Ctrl-Tab': 'indentAuto',
    },
    undoDepth: 5,
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
      let factory = new CodeMirrorEditorFactory();
      expect(factory).to.be.a(CodeMirrorEditorFactory);
    });

    it('should create a CodeMirrorEditorFactory', () => {

      let factory = new ExposeCodeMirrorEditorFactory(options);
      expect(factory).to.be.a(CodeMirrorEditorFactory);
      expect(factory.inlineCodeMirrorOptions).to.eql(options);
      expect(factory.documentCodeMirrorOptions).to.eql(options);
    });

  });

  describe('#newInlineEditor', () => {

    it('should create a new editor', () => {
      let factory = new CodeMirrorEditorFactory();
      let editor = factory.newInlineEditor({host, model});
      expect(editor).to.be.a(CodeMirrorEditor);
      editor.dispose();
    });

    it('should create a new editor with given options', () => {
      let factory = new CodeMirrorEditorFactory(options);
      let editor = factory.newInlineEditor({host, model});
      expect(editor).to.be.a(CodeMirrorEditor);
      let inner = (editor as CodeMirrorEditor).editor;
      for (let key of Object.keys(options)) {
        expect(inner.getOption(key)).to.equal((options as any)[key]);
      }
      editor.dispose();
    });

  });

  describe('#newDocumentEditor', () => {

    it('should create a new editor', () => {
      let factory = new CodeMirrorEditorFactory();
      let editor = factory.newDocumentEditor({host, model});
      expect(editor).to.be.a(CodeMirrorEditor);
      editor.dispose();
    });

    it('should create a new editor with given options', () => {
      let factory = new CodeMirrorEditorFactory(options);
      let editor = factory.newDocumentEditor({host, model});
      expect(editor).to.be.a(CodeMirrorEditor);
      let inner = (editor as CodeMirrorEditor).editor;
      for (let key of Object.keys(options)) {
        expect(inner.getOption(key)).to.equal((options as any)[key]);
      }
      editor.dispose();
    });

  });

});
