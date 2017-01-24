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

const ENTER = 13;


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

  describe('#uuid', () => {

    it('should be the unique id of the editor', () => {
      expect(editor.uuid).to.be.ok();
      let uuid = 'foo';
      editor = new LogEditorWidget({ model, host, uuid });
      expect(editor.uuid).to.be('foo');
    });

  });

  describe('#selectionStyle', () => {

    it('should be the selection style of the editor', () => {
      expect(editor.selectionStyle).to.eql({});
    });

    it('should be settable', () => {
      let style = {
        className: 'foo',
        displayName: 'bar'
      };
      editor.selectionStyle = style;
      expect(editor.selectionStyle).to.eql(style);
    });

  });

  describe('#editor', () => {

    it('should be the codemirror editor wrapped by the editor', () => {
      let cm = editor.editor;
      expect(cm.getDoc()).to.be(editor.doc);
    });

  });

  describe('#doc', () => {

    it('should be the codemirror doc wrapped by the editor', () => {
      let doc = editor.doc;
      expect(doc.getEditor()).to.be(editor.editor);
    });

  });

  describe('#lineCount', () => {

    it('should get the number of lines in the editor', () => {
      expect(editor.lineCount).to.be(1);
      editor.model.value.text = 'foo\nbar\nbaz';
      expect(editor.lineCount).to.be(3);
    });

  });

  describe('#lineNumbers', () => {

    it('should get whether line numbers should be shown', () => {
      expect(editor.lineNumbers).to.be(false);
    });

    it('should set whether line numbers should be shown', () => {
      editor.lineNumbers = true;
      expect(editor.lineNumbers).to.be(true);
    });

  });

  describe('#wordWrap', () => {

    it('should get whether horizontally scrolling should be used', () => {
      expect(editor.wordWrap).to.be(true);
    });

    it('should set whether horizontally scrolling should be used', () => {
      editor.wordWrap = false;
      expect(editor.wordWrap).to.be(false);
    });

  });

  describe('#readOnly', () => {

    it('should get whether the editor is readonly', () => {
      expect(editor.readOnly).to.be(false);
    });

    it('should set whether the editor is readonly', () => {
      editor.readOnly = true;
      expect(editor.readOnly).to.be(true);
    });

  });

  describe('#model', () => {

    it('should get the model used by the editor', () => {
      expect(editor.model).to.be(model);
    });

  });

  describe('#lineHeight', () => {

    it('should get the text height of a line in the editor', () => {
      expect(editor.lineHeight).to.be.above(0);
    });

  });

  describe('#charWidth', () => {

    it('should get the character width in the editor', () => {
      expect(editor.charWidth).to.be.above(0);
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the editor is disposed', () => {
      expect(editor.isDisposed).to.be(false);
      editor.dispose();
      expect(editor.isDisposed).to.be(true);
    });

  });

  describe('#dispose()', () => {

    it('should dispose of the resources used by the editor', () => {
      expect(editor.isDisposed).to.be(false);
      editor.dispose();
      expect(editor.isDisposed).to.be(true);
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

  describe('#focus()', () => {

    it('should give focus to the editor', () => {
      expect(host.contains(document.activeElement)).to.be(false);
      editor.focus();
      expect(host.contains(document.activeElement)).to.be(true);
    });

  });

  describe('#hasFocus()', () => {

    it('should test whether the editor has focus', () => {
      expect(editor.hasFocus()).to.be(false);
      editor.focus();
      expect(editor.hasFocus()).to.be(true);
    });

  });

  describe('#refresh()', () => {

    it('should repaint the editor', () => {
      editor.refresh();
    });

  });

  describe('#addKeydownHandler()', () => {

    it('should add a keydown handler to the editor', () => {
      let called = 0;
      let handler = () => {
        called++;
        return true;
      };
      let disposable = editor.addKeydownHandler(handler);
      let evt = generate('keydown', { keyCode: ENTER });
      editor.editor.triggerOnKeyDown(evt);
      expect(called).to.be(1);
      disposable.dispose();
      expect(disposable.isDisposed).to.be(true);

      evt = generate('keydown', { keyCode: ENTER });
      editor.editor.triggerOnKeyDown(evt);
      expect(called).to.be(1);
    });

  });

  describe('#setSize()', () => {

  });

  describe('#revealPosition()', () => {

  });

  describe('#revealSelection()', () => {

  });

  describe('#getCoordinate()', () => {

  });

  describe('#getCursorPosition()', () => {

  });

  describe('#setCursorPosition()', () => {

  });

  describe('#getSelection()', () => {

  });

  describe('#setSelection()', () => {

  });

  describe('#getSelections()', () => {

  });

  describe('#setSelections()', () => {

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

});
