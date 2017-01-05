// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror
  from 'codemirror';

import {
  CodeEditor
} from '../../../lib/codeeditor';

import {
  CodeMirrorEditor
} from '../../../lib/codemirror';


describe('CodeMirrorEditor', () => {

  let editor: CodeMirrorEditor;
  let host: HTMLElement;
  let model: CodeEditor.IModel;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    model = new CodeEditor.Model();
    editor = new CodeMirrorEditor({ host, model }, {});
  });

  afterEach(() => {
    editor.dispose();
    document.body.removeChild(host);
  });

  describe('#constructor()', () => {

    it('should create a CodeMirrorEditor', () => {
      expect(editor).to.be.a(CodeMirrorEditor);
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the editor is disposed', () => {
      expect(editor.isDisposed).to.be(false);
      editor.dispose();
      expect(editor.isDisposed).to.be(true);
    });

  });

  describe('#getLine()', () => {

    it('should get a line of text', () => {
      model.value.text = 'foo\nbar';
      expect(editor.getLine(0)).to.be('foo');
      expect(editor.getLine(1)).to.be('bar');
      expect(editor.getLine(2)).to.be(void 0);
    });

  });

  describe('#getOffsetAt()', () => {

    it('should get the offset for a given position', () => {
      model.value.text = 'foo\nbar';
      let pos = {
        column: 2,
        line: 1
      };
      expect(editor.getOffsetAt(pos)).to.be(6);
      pos = {
        column: 2,
        line: 5
      };
      expect(editor.getOffsetAt(pos)).to.be(7);
    });
  });

  describe('#getPositionAt()', () => {

    it('should get the position for a given offset', () => {
      model.value.text = 'foo\nbar';
      let pos = editor.getPositionAt(6);
      expect(pos.column).to.be(2);
      expect(pos.line).to.be(1);
      pos = editor.getPositionAt(101);
      expect(pos.column).to.be(3);
      expect(pos.line).to.be(1);
    });

  });

  describe('#undo()', () => {

    it('should undo one edit', () => {
      model.value.text = 'foo';
      editor.undo();
      expect(model.value.text).to.be('');
    });

  });

  describe('#redo()', () => {

    it('should redo one undone edit', () => {
      model.value.text = 'foo';
      editor.undo();
      editor.redo();
      expect(model.value.text).to.be('foo');
    });

  });

  describe('#clearHistory()', () => {

    it('should clear the undo history', () => {
      model.value.text = 'foo';
      editor.clearHistory();
      editor.undo();
      expect(model.value.text).to.be('foo');
    });

  });

});
