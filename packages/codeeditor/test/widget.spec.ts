// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

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
  const editorFactory = (options: CodeEditor.IOptions) => {
    options.uuid = 'foo';
    return new LogEditor(options);
  };

  beforeEach(() => {
    const model = new CodeEditor.Model();
    widget = new LogWidget({ factory: editorFactory, model });
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {
    it('should be a CodeEditorWrapper', () => {
      expect(widget).toBeInstanceOf(CodeEditorWrapper);
    });

    it('should add a focus listener', () => {
      widget.node.tabIndex = -1;
      simulate(widget.node, 'focus');
      const editor = widget.editor as LogEditor;
      expect(editor.events).toEqual(expect.arrayContaining(['focus']));
    });
  });

  describe('#editor', () => {
    it('should be a a code editor', () => {
      expect(widget.editor.getOption('lineNumbers')).toBe(false);
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources used by the widget', () => {
      expect(widget.isDisposed).toBe(false);
      widget.dispose();
      expect(widget.isDisposed).toBe(true);
      widget.dispose();
      expect(widget.isDisposed).toBe(true);
    });

    it('should remove the focus listener', () => {
      const editor = widget.editor as LogEditor;
      expect(editor.isDisposed).toBe(false);
      widget.dispose();
      expect(editor.isDisposed).toBe(true);

      widget.node.tabIndex = -1;
      simulate(widget.node, 'focus');
      expect(editor.events).toEqual(expect.not.arrayContaining(['focus']));
    });
  });

  describe('#handleEvent()', () => {
    describe('focus', () => {
      it('should be a no-op if the editor was not resized', () => {
        Widget.attach(widget, document.body);
        const editor = widget.editor as LogEditor;
        editor.methods = [];
        simulate(editor.editor.getInputField(), 'focus');
        expect(editor.methods).toEqual([]);
      });

      it('should refresh if editor was resized', () => {
        Widget.attach(widget, document.body);
        const editor = widget.editor as LogEditor;
        MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
        editor.methods = [];
        simulate(editor.editor.getInputField(), 'focus');
        expect(editor.methods).toEqual(['refresh']);
      });
    });
  });

  describe('#onActivateRequest()', () => {
    it('should focus the editor', () => {
      Widget.attach(widget, document.body);
      MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
      expect(widget.methods).toEqual(
        expect.arrayContaining(['onActivateRequest'])
      );
      expect(widget.editor.hasFocus()).toBe(true);
    });
  });

  describe('#onAfterAttach()', () => {
    it('should refresh the editor', async () => {
      Widget.attach(widget, document.body);
      const editor = widget.editor as LogEditor;
      await framePromise();
      expect(editor.methods).toEqual(expect.arrayContaining(['refresh']));
    });
  });

  describe('#onAfterShow()', () => {
    it('should refresh the editor', async () => {
      widget.hide();
      Widget.attach(widget, document.body);
      const editor = widget.editor as LogEditor;
      expect(editor.methods).toEqual(expect.not.arrayContaining(['refresh']));
      widget.show();
      expect(widget.methods).toEqual(expect.arrayContaining(['onAfterShow']));
      await framePromise();
      expect(editor.methods).toEqual(expect.arrayContaining(['refresh']));
    });
  });

  describe('#onResize()', () => {
    it('should set the size of the editor', () => {
      const msg = new Widget.ResizeMessage(10, 10);
      const editor = widget.editor as LogEditor;
      MessageLoop.sendMessage(widget, msg);
      expect(editor.methods).toEqual(expect.arrayContaining(['setSize']));
    });

    it('should refresh the editor', () => {
      const editor = widget.editor as LogEditor;
      Widget.attach(widget, document.body);
      editor.focus();
      editor.methods = [];
      MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
      expect(editor.methods).toEqual(expect.arrayContaining(['refresh']));
    });

    it('should defer the refresh until focused', () => {
      const editor = widget.editor as LogEditor;
      Widget.attach(widget, document.body);
      editor.methods = [];
      MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
      expect(editor.methods).toEqual([]);
      simulate(editor.editor.getInputField(), 'focus');
      expect(editor.methods).toEqual(['refresh']);
    });
  });
});
