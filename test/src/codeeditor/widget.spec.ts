// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, MessageLoop.sendMessage
} from '@phosphor/messaging';

import {
  ResizeMessage, Widget, WidgetMessage
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  CodeEditor, CodeEditorWidget
} from '../../../lib/codeeditor';

import {
  CodeMirrorEditor
} from '../../../lib/codemirror';


class LogEditor extends CodeMirrorEditor {

  methods: string[] = [];

  refresh(): void {
    super.refresh();
    this.methods.push('refresh');
  }

  setSize(dims: CodeEditor.IDimension | null): void {
    super.setSize(dims);
    this.methods.push('setSize');
  }
}


class LogWidget extends CodeEditorWidget {

  methods: string[] = [];
  events: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }

  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.methods.push('onAfterShow');
  }

  protected onResize(msg: ResizeMessage): void {
    super.onResize(msg);
    this.methods.push('onResize');
  }
}


describe('CodeEditorWidget', () => {

  let widget: LogWidget;
  let editorFactory = (options: CodeEditor.IOptions) => {
    options.uuid = 'foo';
    return new LogEditor(options, {});
  };

  beforeEach(() => {
    let model = new CodeEditor.Model();
    widget = new LogWidget({ factory: editorFactory, model });
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {

    it('should be a CodeEditorWidget', () => {
      expect(widget).to.be.a(CodeEditorWidget);
    });

  });

  describe('#editor', () => {

    it('should be a a code editor', () => {
      expect(widget.editor.lineNumbers).to.be(false);
    });

  });

  describe('#dispose()', () => {

    it('should dispose of the resources used by the widget', () => {
      expect(widget.isDisposed).to.be(false);
      widget.dispose();
      expect(widget.isDisposed).to.be(true);
      widget.dispose();
      expect(widget.isDisposed).to.be(true);
    });

  });

  describe('#handleEvent()', () => {

    context('focus', () => {

      it('should refresh the editor', () => {
        Widget.attach(widget, document.body);
        widget.methods = [];
        widget.editor.focus();
        widget.node.tabIndex = -1;
        simulate(widget.node, 'focus');
        expect(widget.events).to.contain('focus');
        let editor = widget.editor as LogEditor;
        expect(editor.methods).to.contain('refresh');
      });

    });

  });

  describe('#onActivateRequest()', () => {

    it('should focus the editor', () => {
      Widget.attach(widget, document.body);
      MessageLoop.sendMessage(widget, WidgetMessage.ActivateRequest);
      expect(widget.methods).to.contain('onActivateRequest');
      expect(widget.editor.hasFocus()).to.be(true);
    });

  });

  describe('#onAfterAttach()', () => {

    it('should add a focus listener', () => {
      Widget.attach(widget, document.body);
      expect(widget.methods).to.contain('onAfterAttach');
      widget.node.tabIndex = -1;
      simulate(widget.node, 'focus');
      expect(widget.events).to.contain('focus');
    });

    it('should refresh the editor', () => {
      Widget.attach(widget, document.body);
      let editor = widget.editor as LogEditor;
      expect(editor.methods).to.contain('refresh');
    });

  });

  describe('#onBeforeDetach()', () => {

    it('should remove the focus listener', () => {
      Widget.attach(widget, document.body);
      Widget.detach(widget);
      expect(widget.methods).to.contain('onBeforeDetach');
      widget.node.tabIndex = -1;
      simulate(widget.node, 'focus');
      expect(widget.events).to.not.contain('focus');
    });

  });

  describe('#onAfterShow()', () => {

    it('should refresh the editor', () => {
      widget.hide();
      Widget.attach(widget, document.body);
      let editor = widget.editor as LogEditor;
      expect(editor.methods).to.not.contain('refresh');
      widget.show();
      expect(widget.methods).to.contain('onAfterShow');
      expect(editor.methods).to.contain('refresh');
    });

  });

  describe('#onResize()', () => {

    it('should set the size of the editor', () => {
      let msg = new ResizeMessage(10, 10);
      let editor = widget.editor as LogEditor;
      MessageLoop.sendMessage(widget, msg);
      expect(editor.methods).to.contain('setSize');
    });

    it('should set the size of the editor', () => {
      let editor = widget.editor as LogEditor;
      MessageLoop.sendMessage(widget, ResizeMessage.UnknownSize);
      expect(editor.methods).to.contain('setSize');
    });

    it('should make a subsequent request wait', () => {
      let editor = widget.editor as LogEditor;
      MessageLoop.sendMessage(widget, ResizeMessage.UnknownSize);
      expect(editor.methods).to.contain('setSize');
      editor.methods = [];
      MessageLoop.sendMessage(widget, ResizeMessage.UnknownSize);
      expect(editor.methods).to.not.contain('setSize');
    });

  });

});
