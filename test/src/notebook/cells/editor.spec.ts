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
  CodeMirrorEditorFactory, CodeMirrorEditor
} from '../../../../lib/codemirror';

import {
  IChangedArgs
} from '../../../../lib/common/interfaces';

import {
  CellModel, ICellModel, CellEditorWidget
} from '../../../../lib/notebook/cells';

import {
  createCellEditor
} from '../utils';


const UP_ARROW = 38;

const DOWN_ARROW = 40;

const TAB = 9;

const factory = new CodeMirrorEditorFactory();
const model = new CellModel();


class LogEditorWidget extends CellEditorWidget {

  methods: string[] = [];

  constructor() {
    super({
      factory: options => factory.newInlineEditor(options),
      model: new CellModel()
    });
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

  describe('CellEditorWidget', () => {

    describe('#constructor()', () => {

      it('should create a cell editor widget', () => {
        let widget = createCellEditor();
        expect(widget).to.be.a(CellEditorWidget);
      });

    });

    describe('#edgeRequested', () => {

      it('should emit a signal when the top edge is requested', () => {
        let widget = createCellEditor();
        let edge: CellEditorWidget.EdgeLocation = null;
        let event = generate('keydown', { keyCode: UP_ARROW });
        let listener = (sender: any, args: CellEditorWidget.EdgeLocation) => { edge = args; };
        widget.edgeRequested.connect(listener);
        expect(edge).to.be(null);
        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(edge).to.be('top');
      });

      it('should emit a signal when the bottom edge is requested', () => {
        let widget = createCellEditor();
        let edge: CellEditorWidget.EdgeLocation = null;
        let event = generate('keydown', { keyCode: DOWN_ARROW });
        let listener = (sender: any, args: CellEditorWidget.EdgeLocation) => { edge = args; };
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
        let want = { oldValue: '', newValue: 'foo' };
        let change: CellEditorWidget.ITextChange = null;
        let listener = (sender: any, args: CellEditorWidget.ITextChange) => {
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
        let want = { currentValue: 'foo', line: 0, ch: 3 };
        let request: CellEditorWidget.ICompletionRequest = null;
        let listener = (sender: any, args: CellEditorWidget.ICompletionRequest) => {
          request = args;
        };
        let event = generate('keydown', { keyCode: TAB });
        widget.completionRequested.connect(listener);

        expect(request).to.not.be.ok();
        let editor = widget.editor as CodeMirrorEditor;
        editor.model.value.text = want.currentValue;
        editor.setCursorPosition(editor.getPositionAt(3));

        editor.editor.triggerOnKeyDown(event);
        expect(request).to.be.ok();
        expect(request.currentValue).to.equal(want.currentValue);
        expect(request.ch).to.equal(want.ch);
        expect(request.line).to.equal(want.line);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = createCellEditor();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should run the model state changes', () => {
        let widget = new LogEditorWidget();
        expect(widget.methods).to.not.contain('onModelStateChanged');
        widget.editor.model.value.text = 'foo';
        expect(widget.methods).to.contain('onModelStateChanged');
      });

    });

    describe('#onEditorKeydown()', () => {

      it('should run when there is a keydown event on the editor', () => {
        let widget = new LogEditorWidget();
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
        let event = generate('keydown', { keyCode: TAB });
        expect(widget.methods).to.not.contain('onTabEvent');
        let editor = (widget.editor as any).editor as CodeMirror.Editor;
        editor.triggerOnKeyDown(event);
        expect(widget.methods).to.contain('onTabEvent');
      });

    });

  });

});
