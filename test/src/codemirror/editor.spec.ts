// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  generate
} from 'simulate-event';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditor
} from '@jupyterlab/codemirror';


const UP_ARROW = 38;

const DOWN_ARROW = 40;

const ENTER = 13;


class LogEditorWidget extends CodeMirrorEditor {

  methods: string[] = [];

  protected onKeydown(event: KeyboardEvent): boolean {
    let value = super.onKeydown(event);
    this.methods.push('onKeydown');
    return value;
  }
}


describe('CodeMirrorEditor', () => {

  let editor: LogEditorWidget;
  let host: HTMLElement;
  let model: CodeEditor.IModel;
  const TEXT = new Array(100).join('foo bar baz\n');

  beforeEach(() => {
    host = document.createElement('div');
    host.style.height = '200px';
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
      expect(editor).to.be.ok();
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

    it('should set the size of the editor in pixels', () => {
      editor.setSize({ width: 100, height: 100 });
      editor.setSize(null);
      expect(editor).to.be.ok();
    });

  });

  describe('#revealPosition()', () => {

    it('should reveal the given position in the editor', () => {
      model.value.text = TEXT;
      editor.revealPosition({ line: 50, column: 0 });
      expect(editor).to.be.ok();
    });

  });

  describe('#revealSelection()', () => {

    it('should reveal the given selection in the editor', () => {
      model.value.text = TEXT;
      let start = { line: 50, column: 0 };
      let end = { line: 52, column: 0 };
      editor.setSelection({ start, end });
      editor.revealSelection(editor.getSelection());
      expect(editor).to.be.ok();
    });

  });

  describe('#getCoordinateForPosition()', () => {

    it('should get the window coordinates given a cursor position', () => {
      model.value.text = TEXT;
      let coord = editor.getCoordinateForPosition({ line: 10, column: 1 });
      expect(coord.left).to.be.above(0);
    });

  });

  describe('#getPositionForCoordinate()', () => {

    it('should get the window coordinates given a cursor position', () => {
      model.value.text = TEXT;
      let pos = { line: 10, column: 1 };
      let coord = editor.getCoordinateForPosition(pos);
      expect(editor.getPositionForCoordinate(coord)).to.eql(pos);
    });

  });

  describe('#getCursorPosition()', () => {

    it('should get the primary position of the cursor', () => {
      model.value.text = TEXT;
      let pos = editor.getCursorPosition();
      expect(pos.line).to.be(0);
      expect(pos.column).to.be(0);

      editor.setCursorPosition({ line: 12, column: 3 });
      pos = editor.getCursorPosition();
      expect(pos.line).to.be(12);
      expect(pos.column).to.be(3);
    });

  });

  describe('#setCursorPosition()', () => {

    it('should set the primary position of the cursor', () => {
      model.value.text = TEXT;
      editor.setCursorPosition({ line: 12, column: 3 });
      let pos = editor.getCursorPosition();
      expect(pos.line).to.be(12);
      expect(pos.column).to.be(3);
    });

  });

  describe('#getSelection()', () => {

    it('should get the primary selection of the editor', () => {
      let selection = editor.getSelection();
      expect(selection.start.line).to.be(0);
      expect(selection.end.line).to.be(0);
    });

  });

  describe('#setSelection()', () => {

    it('should set the primary selection of the editor', () => {
      model.value.text = TEXT;
      let start = { line: 50, column: 0 };
      let end = { line: 52, column: 0 };
      editor.setSelection({ start, end });
      expect(editor.getSelection().start).to.eql(start);
      expect(editor.getSelection().end).to.eql(end);
    });

    it('should remove any secondary cursors', () => {
      model.value.text = TEXT;
      let range0 = {
        start: { line: 50, column: 0 },
        end: { line: 52, column: 0 }
      };
      let range1 = {
        start: { line: 53, column: 0 },
        end: { line: 54, column: 0 }
      };
      editor.setSelections([range0, range1]);
      editor.setSelection(range1);
      expect(editor.getSelections().length).to.be(1);
    });

  });

  describe('#getSelections()', () => {

    it('should get the selections for all the cursors', () => {
      model.value.text = TEXT;
      let range0 = {
        start: { line: 50, column: 0 },
        end: { line: 52, column: 0 }
      };
      let range1 = {
        start: { line: 53, column: 0 },
        end: { line: 54, column: 0 }
      };
      editor.setSelections([range0, range1]);
      let selections = editor.getSelections();
      expect(selections[0].start.line).to.be(50);
      expect(selections[1].end.line).to.be(54);
    });

  });

  describe('#setSelections()', () => {

    it('should set the selections for all the cursors', () => {
      model.value.text = TEXT;
      let range0 = {
        start: { line: 50, column: 0 },
        end: { line: 52, column: 0 }
      };
      let range1 = {
        start: { line: 53, column: 0 },
        end: { line: 54, column: 0 }
      };
      editor.setSelections([range0, range1]);
      let selections = editor.getSelections();
      expect(selections[0].start.line).to.be(50);
      expect(selections[1].end.line).to.be(54);
    });

    it('should set a default selection for an empty array', () => {
      model.value.text = TEXT;
      editor.setSelections([]);
      let selection = editor.getSelection();
      expect(selection.start.line).to.be(0);
      expect(selection.end.line).to.be(0);
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

});
