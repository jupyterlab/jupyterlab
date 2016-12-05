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
} from '../../../../lib/codeeditor';

import {
  CodeMirrorEditorFactory
} from '../../../../lib/codemirror';

import {
  IChangedArgs
} from '../../../../lib/common/interfaces';

import {
  CellModel, ICellModel, CodeCellEditorWidget
} from '../../../../lib/notebook/cells';

import {
  ITextChange, ICompletionRequest, EdgeLocation
} from '../../../../lib/notebook/cells/editor';

import {
  createCellEditor
} from '../../../../lib/notebook/codemirror';


const UP_ARROW = 38;

const DOWN_ARROW = 40;

const TAB = 9;

const factory = new CodeMirrorEditorFactory();


class LogEditorWidget extends CodeCellEditorWidget {

  methods: string[] = [];

  constructor() {
    super(host => factory.newInlineEditor(host.node, {}));
  }

  protected onModelChanged(oldValue: ICellModel | null, newValue: ICellModel | null): void {
    super.onModelChanged(oldValue, newValue);
    this.methods.push('onModelChanged');
  }

  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    super.onModelStateChanged(model, args);
    this.methods.push('onModelStateChanged');
  }

  protected onEditorModelChange(): void {
    super.onEditorModelChange();
    this.methods.push('onEditorModelChange');
  }

  protected onEditorKeydown(editor: CodeEditor.IEditor, event: KeyboardEvent): boolean {
    let value = super.onEditorKeydown(editor, event);
    this.methods.push('onEditorKeydown');
    return value;
  }

  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    super.onTabEvent(event, ch, line);
    this.methods.push('onTabEvent');
  }
}


describe('notebook/cells/editor', () => {

  describe('CodeCellEditorWidget', () => {

    describe('#constructor()', () => {

      it('should create a cell editor widget', () => {
        let widget = createCellEditor();
        expect(widget).to.be.a(CodeCellEditorWidget);
      });

    });

    describe('#lineNumbers', () => {

      it('should get the line numbers state of the editor', () => {
        let widget = createCellEditor();
        expect(widget.lineNumbers).to.be(widget.editor.lineNumbers);
      });

      it('should set the line numbers state of the editor', () => {
        let widget = createCellEditor();
        widget.lineNumbers = !widget.lineNumbers;
        expect(widget.lineNumbers).to.be(widget.editor.lineNumbers);
      });

    });

    describe('#edgeRequested', () => {

      it('should emit a signal when the top edge is requested', () => {
        let widget = createCellEditor();
        let edge: EdgeLocation = null;
        let event = generate('keydown', { keyCode: UP_ARROW });
        let listener = (sender: any, args: EdgeLocation) => { edge = args; };
        widget.edgeRequested.connect(listener);
        expect(edge).to.be(null);
        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(edge).to.be('top');
      });

      it('should emit a signal when the bottom edge is requested', () => {
        let widget = createCellEditor();
        let edge: EdgeLocation = null;
        let event = generate('keydown', { keyCode: DOWN_ARROW });
        let listener = (sender: any, args: EdgeLocation) => { edge = args; };
        widget.edgeRequested.connect(listener);
        expect(edge).to.be(null);
        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(edge).to.be('bottom');
      });

    });

    describe('#textChanged', () => {

      it('should emit a signal when editor text is changed', () => {
        let widget = createCellEditor();
        widget.model = new CellModel();
        let want = { oldValue: '', newValue: 'foo' };
        let change: ITextChange = null;
        let listener = (sender: any, args: ITextChange) => {
          change = args;
        };
        widget.textChanged.connect(listener);

        // CodeMirror editor suppresses signals when the code mirror
        // instance's content is changed programmatically via the `setValue`
        // method, so for this test, the `replaceRange` method is being used to
        // generate the text change.
        expect(change).to.not.be.ok();
        widget.editor.model.value.text = want.newValue;
        expect(change).to.be.ok();
        expect(change.newValue).to.equal(want.newValue);
      });

    });

    describe('#completionRequested', () => {

      it('should emit a signal when the user requests a tab completion', () => {
        let widget = createCellEditor();
        widget.model = new CellModel();
        let want = { currentValue: 'foo', line: 0, ch: 3 };
        let request: ICompletionRequest = null;
        let listener = (sender: any, args: ICompletionRequest) => {
          request = args;
        };
        let event = generate('keydown', { keyCode: TAB });
        widget.completionRequested.connect(listener);

        expect(request).to.not.be.ok();
        widget.editor.model.value.text = want.currentValue;
        widget.setCursorPosition(3);

        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(request).to.be.ok();
        expect(request.currentValue).to.equal(want.currentValue);
        expect(request.ch).to.equal(want.ch);
        expect(request.line).to.equal(want.line);
      });

    });

    describe('#model', () => {

      it('should be settable', () => {
        let model = new CellModel();
        let widget = createCellEditor();
        expect(widget.model).to.be(null);
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should be safe to set multiple times', () => {
        let model = new CellModel();
        let widget = createCellEditor();
        widget.model = new CellModel();
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should empty the code mirror if set to null', () => {
        let widget = createCellEditor();
        widget.model = new CellModel();
        widget.model.source = 'foo';
        expect(widget.editor.model.value).to.be('foo');
        widget.model = null;
        expect(widget.editor.model.value).to.be.empty();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = createCellEditor();
        widget.model = new CellModel();
        expect(widget.model).to.be.ok();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
        expect(widget.model).to.not.be.ok();
      });

    });

    describe('#getCursorPosition()', () => {

      it('should return the cursor position of the editor', () => {
        let widget = createCellEditor();
        widget.model = new CellModel();

        expect(widget.getCursorPosition()).to.be(0);
        widget.model.source = 'foo';
        widget.setCursorPosition(3);
        expect(widget.getCursorPosition()).to.be(3);
      });

    });

    describe('#setCursorPosition()', () => {

      it('should set the cursor position of the editor', () => {
        let widget = createCellEditor();
        widget.model = new CellModel();
        expect(widget.getCursorPosition()).to.be(0);
        widget.model.source = 'foo';
        expect(widget.getCursorPosition()).to.be(0);
        widget.setCursorPosition(3);
        expect(widget.getCursorPosition()).to.be(3);
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should run the model state changes', () => {
        let widget = new LogEditorWidget();
        widget.model = new CellModel();
        expect(widget.methods).to.not.contain('onModelStateChanged');
        widget.model.source = 'foo';
        expect(widget.methods).to.contain('onModelStateChanged');
      });

    });

    describe('#onEditorKeydown()', () => {

      it('should run when there is a keydown event on the editor', () => {
        let widget = new LogEditorWidget();
        widget.model = new CellModel();
        let event = generate('keydown', { keyCode: UP_ARROW });
        expect(widget.methods).to.not.contain('onEditorKeydown');
        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(widget.methods).to.contain('onEditorKeydown');
      });

    });

    describe('#onTabEvent()', () => {

      it('should run when there is a tab keydown event on the editor', () => {
        let widget = new LogEditorWidget();
        widget.model = new CellModel();
        let event = generate('keydown', { keyCode: TAB });
        expect(widget.methods).to.not.contain('onTabEvent');
        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(widget.methods).to.contain('onTabEvent');
      });

    });

  });

});
