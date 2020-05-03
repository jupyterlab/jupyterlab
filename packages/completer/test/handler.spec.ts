// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { SessionContext, ISessionContext } from '@jupyterlab/apputils';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import {
  Completer,
  CompletionHandler,
  CompleterModel,
  KernelConnector
} from '@jupyterlab/completer';

import { createSessionContext } from '@jupyterlab/testutils';

function createEditorWidget(): CodeEditorWrapper {
  const model = new CodeEditor.Model();
  const factory = (options: CodeEditor.IOptions) => {
    return new CodeMirrorEditor(options);
  };
  return new CodeEditorWrapper({ factory, model });
}

class TestCompleterModel extends CompleterModel {
  methods: string[] = [];

  createPatch(patch: string): Completer.IPatch | undefined {
    this.methods.push('createPatch');
    return super.createPatch(patch);
  }

  handleTextChange(change: Completer.ITextState): void {
    this.methods.push('handleTextChange');
    super.handleTextChange(change);
  }
}

class TestCompletionHandler extends CompletionHandler {
  methods: string[] = [];

  onTextChanged(): void {
    super.onTextChanged();
    this.methods.push('onTextChanged');
  }

  onCompletionSelected(widget: Completer, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
  }
}

describe('@jupyterlab/completer', () => {
  let connector: KernelConnector;
  let sessionContext: ISessionContext;

  beforeAll(async () => {
    sessionContext = await createSessionContext();
    await (sessionContext as SessionContext).initialize();
    connector = new KernelConnector({ session: sessionContext.session });
  });

  afterAll(() => sessionContext.shutdown());

  describe('CompletionHandler', () => {
    describe('#constructor()', () => {
      it('should create a completer handler', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler).toBeInstanceOf(CompletionHandler);
      });
    });

    describe('#connector', () => {
      it('should be a data connector', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.connector).toHaveProperty('fetch');
        expect(handler.connector).toHaveProperty('remove');
        expect(handler.connector).toHaveProperty('save');
      });
    });

    describe('#editor', () => {
      it('should default to null', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.editor).toBeNull();
      });

      it('should be settable', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        const widget = createEditorWidget();
        expect(handler.editor).toBeNull();
        handler.editor = widget.editor;
        expect(handler.editor).toBe(widget.editor);
      });

      it('should be resettable', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        const one = createEditorWidget();
        const two = createEditorWidget();
        expect(handler.editor).toBeNull();
        handler.editor = one.editor;
        expect(handler.editor).toBe(one.editor);
        handler.editor = two.editor;
        expect(handler.editor).toBe(two.editor);
      });

      it('should remove the completer active and enabled classes of the old editor', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        const widget = createEditorWidget();
        handler.editor = widget.editor;
        widget.toggleClass('jp-mod-completer-enabled');
        widget.toggleClass('jp-mod-completer-active');
        handler.editor = null;
        expect(widget.hasClass('jp-mod-completer-enabled')).toBe(false);
        expect(widget.hasClass('jp-mod-completer-active')).toBe(false);
      });
    });

    describe('#isDisposed', () => {
      it('should be true if handler has been disposed', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the handler resources', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).toBe(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).toBe(true);
      });
    });

    describe('#onTextChanged()', () => {
      it('should fire when the active editor emits a text change', () => {
        const handler = new TestCompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        handler.editor = createEditorWidget().editor;
        expect(handler.methods).toEqual(
          expect.not.arrayContaining(['onTextChanged'])
        );
        handler.editor.model.value.text = 'foo';
        expect(handler.methods).toEqual(
          expect.arrayContaining(['onTextChanged'])
        );
      });

      it('should call model change handler if model exists', () => {
        const completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        const handler = new TestCompletionHandler({ completer, connector });
        const editor = createEditorWidget().editor;
        const model = completer.model as TestCompleterModel;

        handler.editor = editor;
        expect(model.methods).toEqual(
          expect.not.arrayContaining(['handleTextChange'])
        );
        editor.model.value.text = 'bar';
        editor.setCursorPosition({ line: 0, column: 2 });
        // This signal is emitted (again) because the cursor position that
        // a natural user would create need to be recreated here.
        (editor.model.value.changed as any).emit({ type: 'set', value: 'bar' });
        expect(model.methods).toEqual(
          expect.arrayContaining(['handleTextChange'])
        );
      });
    });

    describe('#onCompletionSelected()', () => {
      it('should fire when the completer widget emits a signal', () => {
        const completer = new Completer({ editor: null });
        const handler = new TestCompletionHandler({ completer, connector });

        expect(handler.methods).toEqual(
          expect.not.arrayContaining(['onCompletionSelected'])
        );
        (completer.selected as any).emit('foo');
        expect(handler.methods).toEqual(
          expect.arrayContaining(['onCompletionSelected'])
        );
      });

      it('should call model create patch method if model exists', () => {
        const completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        const handler = new TestCompletionHandler({ completer, connector });
        const model = completer.model as TestCompleterModel;

        handler.editor = createEditorWidget().editor;
        expect(model.methods).toEqual(
          expect.not.arrayContaining(['createPatch'])
        );
        (completer.selected as any).emit('foo');
        expect(model.methods).toEqual(expect.arrayContaining(['createPatch']));
      });

      it('should update cell if patch exists', () => {
        const model = new CompleterModel();
        const patch = 'foobar';
        const completer = new Completer({ editor: null, model });
        const handler = new TestCompletionHandler({ completer, connector });
        const editor = createEditorWidget().editor;
        const text = 'eggs\nfoo # comment\nbaz';
        const want = 'eggs\nfoobar # comment\nbaz';
        const line = 1;
        const column = 5;
        const request: Completer.ITextState = {
          column,
          line,
          lineHeight: 0,
          charWidth: 0,
          coords: null,
          text
        };

        handler.editor = editor;
        handler.editor.model.value.text = text;
        handler.editor.setCursorPosition({ line, column: column + 3 });
        model.original = request;
        model.cursor = { start: column, end: column + 3 };
        (completer.selected as any).emit(patch);
        expect(handler.editor.model.value.text).toBe(want);
        expect(handler.editor.getCursorPosition()).toEqual({
          line,
          column: column + 6
        });
      });

      it('should be undoable and redoable', () => {
        const model = new CompleterModel();
        const patch = 'foobar';
        const completer = new Completer({ editor: null, model });
        const handler = new TestCompletionHandler({ completer, connector });
        const editor = createEditorWidget().editor;
        const text = 'eggs\nfoo # comment\nbaz';
        const want = 'eggs\nfoobar # comment\nbaz';
        const line = 1;
        const column = 5;
        const request: Completer.ITextState = {
          column,
          line,
          lineHeight: 0,
          charWidth: 0,
          coords: null,
          text
        };

        handler.editor = editor;
        handler.editor.model.value.text = text;
        handler.editor.setCursorPosition({ line, column: column + 3 });
        model.original = request;
        model.cursor = { start: column, end: column + 3 };
        // Make the completion, check its value and cursor position.
        (completer.selected as any).emit(patch);
        expect(editor.model.value.text).toBe(want);
        expect(editor.getCursorPosition()).toEqual({
          line,
          column: column + 6
        });
        console.warn(editor.getCursorPosition());
        // Undo the completion, check its value and cursor position.
        editor.undo();
        expect(editor.model.value.text).toBe(text);
        expect(editor.getCursorPosition()).toEqual({
          line,
          column: column + 3
        });
        console.warn(editor.getCursorPosition());
        // Redo the completion, check its value and cursor position.
        editor.redo();
        expect(editor.model.value.text).toBe(want);
        expect(editor.getCursorPosition()).toEqual({
          line,
          column: column + 6
        });
        console.warn(editor.getCursorPosition());
      });
    });
  });
});
