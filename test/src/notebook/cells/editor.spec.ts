// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror
  from 'codemirror';

import {
  generate
} from 'simulate-event';

import {
  CellModel, ICellModel
} from '../../../../lib/notebook/cells';

import {
  CompletableCodeMirrorCellEditorWidget, 
  ICompletionRequest,
  ITextChange,
  EdgeLocation,
  IPosition,
  CellEditorPresenter,
  UP_ARROW, DOWN_ARROW, TAB
} from '../../../../lib/notebook/codemirror/completion/editor';

class LogCellEditorPresenter extends CellEditorPresenter {

  methods: string[];

  protected onModelStateChanged(model: ICellModel, args: any): void {
    super.onModelStateChanged(model, args);
    this.methods.push('onModelStateChanged');
  }

}

class LogEditorWidget extends CompletableCodeMirrorCellEditorWidget {
  methods: string[] = [];

  constructor() {
    super();
    const presenter = new LogCellEditorPresenter(this);
    presenter.methods = this.methods; 
    this.presenter = presenter;
  }

  protected onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange): void {
    super.onDocChange(doc, change);
    this.methods.push('onDocChange');
  }

  protected onEditorKeydown(editor: CodeMirror.Editor, event: KeyboardEvent): void {
    super.onEditorKeydown(editor, event);
    this.methods.push('onEditorKeydown');
  }

  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    super.onTabEvent(event, ch, line);
    this.methods.push('onTabEvent');
  }
}


describe('notebook/cells/editor', () => {

  describe('CodeMirrorCellEditorWidget', () => {

    describe('#constructor()', () => {

      it('should create a cell editor widget', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        expect(widget).to.be.a(CompletableCodeMirrorCellEditorWidget);
      });

      it('should accept editor configuration options', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget({
          value: 'foo',
          mode: 'bar'
        });
        expect(widget.editor.getOption('value')).to.be('foo');
        expect(widget.editor.getOption('mode')).to.be('bar');
      });

    });

    describe('#lineNumbers', () => {

      it('should get the line numbers state of the editor', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        expect(widget.lineNumbers).to.be(widget.editor.getOption('lineNumbers'));
      });

      it('should set the line numbers state of the editor', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.lineNumbers = !widget.lineNumbers;
        expect(widget.lineNumbers).to.be(widget.editor.getOption('lineNumbers'));
      });

    });

    describe('#edgeRequested', () => {

      it('should emit a signal when the top edge is requested', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        let edge: EdgeLocation = null;
        let event = generate('keydown', { keyCode: UP_ARROW });
        let listener = (sender: any, args: EdgeLocation) => { edge = args; }
        widget.edgeRequested.connect(listener);
        expect(edge).to.be(null);
        widget.editor.triggerOnKeyDown(event);
        expect(edge).to.be('top');
      });

      it('should emit a signal when the bottom edge is requested', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        let edge: EdgeLocation = null;
        let event = generate('keydown', { keyCode: DOWN_ARROW });
        let listener = (sender: any, args: EdgeLocation) => { edge = args; }
        widget.edgeRequested.connect(listener);
        expect(edge).to.be(null);
        widget.editor.triggerOnKeyDown(event);
        expect(edge).to.be('bottom');
      });

    });

    describe('#contentChanged', () => {

      it('should emit a signal when editor text is changed', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        widget.presenter.model = new CellModel();
        let doc = widget.editor.getDoc();
        let want = { newValue: 'foo' };
        let fromPos = { line: 0, ch: 0 };
        let toPos = { line: 0, ch: 0 };
        let change: ITextChange = null;
        let listener = (sender: any, args: ITextChange) => {
          change = args;
        };
        widget.textChanged.connect(listener);

        // CodeMirrorCellEditorWidget suppresses signals when the code mirror
        // instance's content is changed programmatically via the `setValue`
        // method, so for this test, the `replaceRange` method is being used to
        // generate the text change.
        expect(change).to.not.be.ok();
        doc.replaceRange(want.newValue, fromPos, toPos);
        expect(change).to.be.ok();
        expect(change.newValue).to.equal(want.newValue);
      });

    });

    describe('#completionRequested', () => {

      it('should emit a signal when the user requests a tab completion', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        widget.presenter.model = new CellModel();
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
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        expect(widget.presenter.model).to.be(null);
        widget.presenter.model = model;
        expect(widget.presenter.model).to.be(model);
      });

      it('should be safe to set multiple times', () => {
        let model = new CellModel();
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        widget.presenter.model = new CellModel();
        widget.presenter.model = model;
        expect(widget.presenter.model).to.be(model);
      });

      it('should empty the code mirror if set to null', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        widget.presenter.model = new CellModel();
        widget.presenter.model.source = 'foo';
        expect(widget.editor.getDoc().getValue()).to.be('foo');
        widget.presenter.model = null;
        expect(widget.editor.getDoc().getValue()).to.be.empty();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        const widget = new CompletableCodeMirrorCellEditorWidget();
        const presenter = new CellEditorPresenter(widget);
        const model = new CellModel();
        widget.presenter = presenter;
        widget.presenter.model = model;
        expect(widget.presenter.model).to.be.ok();

        widget.dispose();
        expect(model.isDisposed).to.be(true);
        expect(presenter.isDisposed).to.be(true);
        expect(widget.isDisposed).to.be(true);
        expect(widget.presenter).to.not.be.ok();
      });

    });

    describe('#getCursorPosition()', () => {

      it('should return the cursor position of the editor', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        widget.presenter.model = new CellModel();
        let doc = widget.editor.getDoc();
        let fromPos = { line: 0, ch: 0 };
        let toPos = { line: 0, ch: 0 };

        expect(IPosition.isStartPosition(widget.position)).be(true)

        doc.replaceRange('foo', fromPos, toPos);
        expect(widget.position).eql(IPosition.create(0, 3));
      });

    });

    describe('#setCursorPosition()', () => {

      it('should set the cursor position of the editor', () => {
        let widget = new CompletableCodeMirrorCellEditorWidget();
        widget.presenter = new CellEditorPresenter(widget);
        
        widget.presenter.model = new CellModel();
        expect(IPosition.isStartPosition(widget.position)).be(true)

        widget.presenter.model.source = 'foo';
        expect(IPosition.isStartPosition(widget.position)).be(true)

        widget.position = IPosition.create(0, 3);
        expect(widget.position).eql(IPosition.create(0, 3));
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should run the model state changes', () => {
        let widget = new LogEditorWidget();
        widget.presenter.model = new CellModel();
        expect(widget.methods).to.not.contain('onModelStateChanged');
        widget.presenter.model.source = 'foo';
        expect(widget.methods).to.contain('onModelStateChanged');
      });

    });

    describe('#onDocChange()', () => {

      it('should run when the code mirror document changes', () => {
        let widget = new LogEditorWidget();
        widget.presenter.model = new CellModel();
        let doc = widget.editor.getDoc();
        let fromPos = { line: 0, ch: 0 };
        let toPos = { line: 0, ch: 0 };
        expect(widget.methods).to.not.contain('onDocChange');
        doc.replaceRange('foo', fromPos, toPos);
        expect(widget.methods).to.contain('onDocChange');
      });

    });

    describe('#onEditorKeydown()', () => {

      it('should run when there is a keydown event on the editor', () => {
        let widget = new LogEditorWidget();
        widget.presenter.model = new CellModel();
        let event = generate('keydown', { keyCode: UP_ARROW });
        expect(widget.methods).to.not.contain('onEditorKeydown');
        widget.editor.triggerOnKeyDown(event);
        expect(widget.methods).to.contain('onEditorKeydown');
      });

    });

    describe('#onTabEvent()', () => {

      it('should run when there is a tab keydown event on the editor', () => {
        let widget = new LogEditorWidget();
        widget.presenter.model = new CellModel();
        let event = generate('keydown', { keyCode: TAB });
        expect(widget.methods).to.not.contain('onTabEvent');
        widget.editor.triggerOnKeyDown(event);
        expect(widget.methods).to.contain('onTabEvent');
      });

    });

  });

});
