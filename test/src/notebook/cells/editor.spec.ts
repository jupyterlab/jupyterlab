// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror
  from 'codemirror';

import {
  simulate, generate
} from 'simulate-event';

import {
  CellModel
} from '../../../../lib/notebook/cells';

import {
  CellEditorWidget, ITextChange, ICompletionRequest
} from '../../../../lib/notebook/cells/editor';


const UP_ARROW = 38;

const DOWN_ARROW = 40;

const TAB = 9;


describe('notebook/cells/editor', () => {

  describe('CellEditorWidget', () => {

    describe('#constructor()', () => {

      it('should create a cell editor widget', () => {
        let widget = new CellEditorWidget(new CellModel());
        expect(widget).to.be.a(CellEditorWidget);
      });

    });

    describe('#edgeRequested', () => {

      it('should emit a signal when the top edge is requested', () => {
        let widget = new CellEditorWidget(new CellModel());
        let called = false;
        let event = generate('keydown', { keyCode: UP_ARROW });
        widget.edgeRequested.connect(() => { called = true; });
        expect(called).to.be(false);
        widget.editor.triggerOnKeyDown(event);
        expect(called).to.be(true);
      });

      it('should emit a signal when the bottom edge is requested', () => {
        let widget = new CellEditorWidget(new CellModel());
        let called = false;
        let event = generate('keydown', { keyCode: DOWN_ARROW });
        widget.edgeRequested.connect(() => { called = true; });
        expect(called).to.be(false);
        widget.editor.triggerOnKeyDown(event);
        expect(called).to.be(true);
      });

    });

    describe('#textChanged', () => {

      it('should emit a signal when editor text is changed', () => {
        let widget = new CellEditorWidget(new CellModel());
        let doc = widget.editor.getDoc();
        let want = { oldValue: '', newValue: 'foo' };
        let fromPos = { line: 0, ch: 0 };
        let toPos = { line: 0, ch: 0 };
        let change: ITextChange = null;
        let listener = (sender: any, args: ITextChange) => {
          change = args;
        };
        widget.textChanged.connect(listener);

        // CellEditorWidget suppresses signals when the code mirror instance's
        // content is changed programmatically via the `setValue` method, so
        // for this test, the `replaceRange` method is being used to generate
        // the text change.
        expect(change).to.not.be.ok();
        doc.replaceRange(want.newValue, fromPos, toPos);
        expect(change).to.be.ok();
        expect(change.oldValue).to.equal(want.oldValue);
        expect(change.newValue).to.equal(want.newValue);
      });

    });

    describe('#completionRequested', () => {

      it('should emit a signal when the user requests a tab completion', () => {
        let widget = new CellEditorWidget(new CellModel());
        let doc = widget.editor.getDoc();
        let want = { currentValue: 'foo', line: 0, ch: 3 };
        let fromPos = { line: 0, ch: 0 };
        let toPos = { line: 0, ch: 0 };
        let request: ICompletionRequest = null;
        let listener = (sender: any, args: ICompletionRequest) => {
          request = args;
        };
        let event = generate('keydown', { keyCode: TAB });
        widget.completionRequested.connect(listener);

        expect(request).to.not.be.ok();
        doc.replaceRange(want.currentValue, fromPos, toPos);
        widget.editor.triggerOnKeyDown(event);
        expect(request).to.be.ok();
        expect(request.currentValue).to.equal(want.currentValue);
        expect(request.ch).to.equal(want.ch);
        expect(request.line).to.equal(want.line);
      });

    });

    describe('#model', () => {

      it('should be settable', () => {
        let model = new CellModel();
        let widget = new CellEditorWidget(new CellModel());
        expect(widget.model).to.be.ok();
        expect(widget.model).to.be.a(CellModel);
        expect(widget.model).to.not.be(model);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should be safe to set multiple times', () => {
        let model = new CellModel();
        let widget = new CellEditorWidget(model);
        expect(widget.model).to.be(model);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should empty the code mirror if set to null', () => {
        let widget = new CellEditorWidget(new CellModel());
        widget.model.source = 'foo';
        expect(widget.editor.getDoc().getValue()).to.be('foo');
        widget.model = null;
        expect(widget.editor.getDoc().getValue()).to.be.empty();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CellEditorWidget(new CellModel());
        expect(widget.model).to.be.ok();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        expect(widget.model).to.not.be.ok();
      });

    });

    describe('#getCursorPosition()', () => {

      it('should return the cursor position of the editor', () => {
        let widget = new CellEditorWidget(new CellModel());
        let doc = widget.editor.getDoc();
        let fromPos = { line: 0, ch: 0 };
        let toPos = { line: 0, ch: 0 };

        expect(widget.getCursorPosition()).to.be(0);
        doc.replaceRange('foo', fromPos, toPos);
        expect(widget.getCursorPosition()).to.be(3);
      });

    });

    describe('#setCursorPosition()', () => {

      it('should set the cursor position of the editor', () => {
        let widget = new CellEditorWidget(new CellModel());
        expect(widget.getCursorPosition()).to.be(0);
        widget.model.source = 'foo';
        expect(widget.getCursorPosition()).to.be(0);
        widget.setCursorPosition(3);
        expect(widget.getCursorPosition()).to.be(3);
      });

    });

  });

});
