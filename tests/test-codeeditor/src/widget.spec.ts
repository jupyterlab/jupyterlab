// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Message, MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { simulate } from 'simulate-event';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { framePromise } from '@jupyterlab/testutils';

class LogEditor extends CodeMirrorEditor {
  methods: string[] = [];
  events: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  refresh(): void {
    super.refresh();
    this.methods.push('refresh');
  }

  setSize(dims: CodeEditor.IDimension | null): void {
    super.setSize(dims);
    this.methods.push('setSize');
  }
}

class LogWidget extends CodeEditorWrapper {
  methods: string[] = [];

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

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this.methods.push('onResize');
  }
}

describe('CodeEditorWrapper', () => {
  let widget: LogWidget;
  let editorFactory = (options: CodeEditor.IOptions) => {
    options.uuid = 'foo';
    return new LogEditor(options);
  };

  beforeEach(() => {
    let model = new CodeEditor.Model();
    widget = new LogWidget({ factory: editorFactory, model });
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {
    it('should be a CodeEditorWrapper', () => {
      expect(widget).to.be.an.instanceof(CodeEditorWrapper);
    });

    it('should add a focus listener', () => {
      widget.node.tabIndex = -1;
      simulate(widget.node, 'focus');
      let editor = widget.editor as LogEditor;
      expect(editor.events).to.contain('focus');
    });
  });

  describe('#editor', () => {
    it('should be a a code editor', () => {
      expect(widget.editor.getOption('lineNumbers')).to.be.false;
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources used by the widget', () => {
      expect(widget.isDisposed).to.be.false;
      widget.dispose();
      expect(widget.isDisposed).to.be.true;
      widget.dispose();
      expect(widget.isDisposed).to.be.true;
    });

    it('should remove the focus listener', () => {
      let editor = widget.editor as LogEditor;
      expect(editor.isDisposed).to.be.false;
      widget.dispose();
      expect(editor.isDisposed).to.be.true;

      widget.node.tabIndex = -1;
      simulate(widget.node, 'focus');
      expect(editor.events).to.not.contain('focus');
    });
  });

  describe('#handleEvent()', () => {
    describe('focus', () => {
      it('should be a no-op if the editor was not resized', () => {
        Widget.attach(widget, document.body);
        let editor = widget.editor as LogEditor;
        editor.methods = [];
        simulate(editor.editor.getInputField(), 'focus');
        expect(editor.methods).to.eql([]);
      });

      it('should refresh if editor was resized', () => {
        Widget.attach(widget, document.body);
        let editor = widget.editor as LogEditor;
        MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
        editor.methods = [];
        simulate(editor.editor.getInputField(), 'focus');
        expect(editor.methods).to.deep.equal(['refresh']);
      });
    });
  });

  describe('#onActivateRequest()', () => {
    it('should focus the editor', () => {
      Widget.attach(widget, document.body);
      MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
      expect(widget.methods).to.contain('onActivateRequest');
      expect(widget.editor.hasFocus()).to.be.true;
    });
  });

  describe('#onAfterAttach()', () => {
    it('should refresh the editor', async () => {
      Widget.attach(widget, document.body);
      let editor = widget.editor as LogEditor;
      await framePromise();
      expect(editor.methods).to.contain('refresh');
    });
  });

  describe('#onAfterShow()', () => {
    it('should refresh the editor', async () => {
      widget.hide();
      Widget.attach(widget, document.body);
      let editor = widget.editor as LogEditor;
      expect(editor.methods).to.not.contain('refresh');
      widget.show();
      expect(widget.methods).to.contain('onAfterShow');
      await framePromise();
      expect(editor.methods).to.contain('refresh');
    });
  });

  describe('#onResize()', () => {
    it('should set the size of the editor', () => {
      let msg = new Widget.ResizeMessage(10, 10);
      let editor = widget.editor as LogEditor;
      MessageLoop.sendMessage(widget, msg);
      expect(editor.methods).to.contain('setSize');
    });

    it('should refresh the editor', () => {
      let editor = widget.editor as LogEditor;
      Widget.attach(widget, document.body);
      editor.focus();
      editor.methods = [];
      MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
      expect(editor.methods).to.contain('refresh');
    });

    it('should defer the refresh until focused', () => {
      let editor = widget.editor as LogEditor;
      Widget.attach(widget, document.body);
      editor.methods = [];
      MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
      expect(editor.methods).to.eql([]);
      simulate(editor.editor.getInputField(), 'focus');
      expect(editor.methods).to.eql(['refresh']);
    });
  });
});
