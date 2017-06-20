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
  public inlineCodeMirrorConfig: CodeMirrorEditor.IConfig;
  public documentCodeMirrorConfig: CodeMirrorEditor.IConfig;
}


describe('CodeMirrorEditorFactory', () => {
  let host: HTMLElement;
  let model: CodeEditor.IModel;

  const options: Partial<CodeMirrorEditor.IConfig> = {
    lineNumbers: false,
    lineWrap: true,
    extraKeys: {
      'Ctrl-Tab': 'indentAuto',
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
      let factory = new CodeMirrorEditorFactory();
      expect(factory).to.be.a(CodeMirrorEditorFactory);
    });

    it('should create a CodeMirrorEditorFactory', () => {

      let factory = new ExposeCodeMirrorEditorFactory(options);
      expect(factory).to.be.a(CodeMirrorEditorFactory);
      expect(factory.inlineCodeMirrorConfig.extraKeys).to.eql(options.extraKeys);
      expect(factory.documentCodeMirrorConfig.extraKeys).to.eql(options.extraKeys);
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
      let editor = factory.newInlineEditor({host, model}) as CodeMirrorEditor;
      expect(editor).to.be.a(CodeMirrorEditor);
      for (let key in Object.keys(options)) {
        let option = key as keyof CodeMirrorEditor.IConfig;
        expect(editor.getOption(option)).to.equal(options[option]);
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
      let editor = factory.newDocumentEditor({host, model}) as CodeMirrorEditor;
      expect(editor).to.be.a(CodeMirrorEditor);
      for (let key in Object.keys(options)) {
        let option = key as keyof CodeMirrorEditor.IConfig;
        expect(editor.getOption(option)).to.equal(options[option]);
      }
      editor.dispose();
    });

  });

});
