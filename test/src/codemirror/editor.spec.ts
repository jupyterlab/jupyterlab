// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror
  from 'codemirror';

import {
  generate
} from 'simulate-event';

import {
  CodeEditor
} from '../../../lib/codeeditor';

import {
  CodeMirrorEditor
} from '../../../lib/codemirror';



const UP_ARROW = 38;

const DOWN_ARROW = 40;

const TAB = 9;


class LogEditorWidget extends CodeMirrorEditor {

  methods: string[] = [];

  protected onKeydown(event: KeyboardEvent): boolean {
    let value = super.onKeydown(event);
    this.methods.push('onKeydown');
    return value;
  }

  protected onTabEvent(event: KeyboardEvent, position: CodeEditor.IPosition): void {
    super.onTabEvent(event, position);
    this.methods.push('onTabEvent');
  }
}


describe('CodeMirrorEditor', () => {

  let editor: LogEditorWidget;
  let host: HTMLElement;
  let model: CodeEditor.IModel;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    model = new CodeEditor.Model();
    editor = new LogEditorWidget({ host, model }, {});
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

  describe('#edgeRequested', () => {

    it('should emit a signal when the top edge is requested', () => {
      let edge: CodeEditor.EdgeLocation = null;
      let event = generate('keydown', { keyCode: UP_ARROW });
      let listener = (sender: any, args: CodeEditor.EdgeLocation) => { edge = args; };
      editor.edgeRequested.connect(listener);
      expect(edge).to.be(null);
      editor.editor.triggerOnKeyDown(event);
      expect(edge).to.be('top');
    });

    it('should emit a signal when the bottom edge is requested', () => {
      let edge: CodeEditor.EdgeLocation = null;
      let event = generate('keydown', { keyCode: DOWN_ARROW });
      let listener = (sender: any, args: CodeEditor.EdgeLocation) => { edge = args; };
      editor.edgeRequested.connect(listener);
      expect(edge).to.be(null);
      editor.editor.triggerOnKeyDown(event);
      expect(edge).to.be('bottom');
    });

  });

  describe('#completionRequested', () => {

    it('should emit a signal when the user requests a tab completion', () => {
      let want = { line: 0, column: 3 };
      let request: CodeEditor.IPosition = null;
      let listener = (sender: any, args: CodeEditor.IPosition) => {
        request = args;
      };
      let event = generate('keydown', { keyCode: TAB });
      editor.completionRequested.connect(listener);

      expect(request).to.not.be.ok();
      editor.model.value.text = 'foo';
      editor.setCursorPosition(editor.getPositionAt(3));

      editor.editor.triggerOnKeyDown(event);
      expect(request).to.be.ok();
      expect(request.column).to.equal(want.column);
      expect(request.line).to.equal(want.line);
    });

  });

  describe('#onKeydown()', () => {

    it('should run when there is a keydown event on the editor', () => {
      let event = generate('keydown', { keyCode: UP_ARROW });
      expect(editor.methods).to.not.contain('onKeydown');
      editor.editor.triggerOnKeyDown(event);
      expect(editor.methods).to.contain('onKeydown');
    });

  });

  describe('#onTabEvent()', () => {

    it('should run when there is a tab keydown event on the editor', () => {
      let event = generate('keydown', { keyCode: TAB });
      expect(editor.methods).to.not.contain('onTabEvent');
      editor.editor.triggerOnKeyDown(event);
      expect(editor.methods).to.contain('onTabEvent');
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
