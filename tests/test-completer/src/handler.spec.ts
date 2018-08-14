// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IClientSession } from '@jupyterlab/apputils';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import {
  Completer,
  CompletionHandler,
  CompleterModel,
  KernelConnector
} from '@jupyterlab/completer';

import { createClientSession } from '@jupyterlab/testutils';

function createEditorWidget(): CodeEditorWrapper {
  const model = new CodeEditor.Model();
  const factory = (options: CodeEditor.IOptions) => {
    return new CodeMirrorEditor(options);
  };
  return new CodeEditorWrapper({ factory, model });
}

class TestCompleterModel extends CompleterModel {
  methods: string[] = [];

  createPatch(patch: string): Completer.IPatch {
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
  let session: IClientSession;

  before(async () => {
    session = await createClientSession();
    await session.initialize();
    connector = new KernelConnector({ session });
  });

  after(() => session.shutdown());

  describe('CompletionHandler', () => {
    describe('#constructor()', () => {
      it('should create a completer handler', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler).to.be.an.instanceof(CompletionHandler);
      });
    });

    describe('#connector', () => {
      it('should be a data connector', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.connector).to.have.property('fetch');
        expect(handler.connector).to.have.property('remove');
        expect(handler.connector).to.have.property('save');
      });
    });

    describe('#editor', () => {
      it('should default to null', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.editor).to.be.null;
      });

      it('should be settable', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        const widget = createEditorWidget();
        expect(handler.editor).to.be.null;
        handler.editor = widget.editor;
        expect(handler.editor).to.equal(widget.editor);
      });

      it('should be resettable', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        const one = createEditorWidget();
        const two = createEditorWidget();
        expect(handler.editor).to.be.null;
        handler.editor = one.editor;
        expect(handler.editor).to.equal(one.editor);
        handler.editor = two.editor;
        expect(handler.editor).to.equal(two.editor);
      });
    });

    describe('#isDisposed', () => {
      it('should be true if handler has been disposed', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).to.equal(false);
        handler.dispose();
        expect(handler.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the handler resources', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).to.equal(false);
        handler.dispose();
        expect(handler.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const handler = new CompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).to.equal(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.equal(true);
      });
    });

    describe('#onTextChanged()', () => {
      it('should fire when the active editor emits a text change', () => {
        const handler = new TestCompletionHandler({
          connector,
          completer: new Completer({ editor: null })
        });
        handler.editor = createEditorWidget().editor;
        expect(handler.methods).to.not.contain('onTextChanged');
        handler.editor.model.value.text = 'foo';
        expect(handler.methods).to.contain('onTextChanged');
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
        expect(model.methods).to.not.contain('handleTextChange');
        editor.model.value.text = 'bar';
        editor.setCursorPosition({ line: 0, column: 2 });
        // This signal is emitted (again) because the cursor position that
        // a natural user would create need to be recreated here.
        (editor.model.value.changed as any).emit(void 0);
        expect(model.methods).to.contain('handleTextChange');
      });
    });

    describe('#onCompletionSelected()', () => {
      it('should fire when the completer widget emits a signal', () => {
        const completer = new Completer({ editor: null });
        const handler = new TestCompletionHandler({ completer, connector });

        expect(handler.methods).to.not.contain('onCompletionSelected');
        (completer.selected as any).emit('foo');
        expect(handler.methods).to.contain('onCompletionSelected');
      });

      it('should call model create patch method if model exists', () => {
        const completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        const handler = new TestCompletionHandler({ completer, connector });
        const model = completer.model as TestCompleterModel;

        handler.editor = createEditorWidget().editor;
        expect(model.methods).to.not.contain('createPatch');
        (completer.selected as any).emit('foo');
        expect(model.methods).to.contain('createPatch');
      });

      it('should update cell if patch exists', () => {
        const model = new CompleterModel();
        const patch = 'foobar';
        const completer = new Completer({ editor: null, model });
        const handler = new TestCompletionHandler({ completer, connector });
        const editor = createEditorWidget().editor;
        const text = 'eggs\nfoo # comment\nbaz';
        const want = 'eggs\nfoobar # comment\nbaz';
        const request: Completer.ITextState = {
          column: 5,
          line: 1,
          lineHeight: 0,
          charWidth: 0,
          coords: null,
          text
        };

        handler.editor = editor;
        handler.editor.model.value.text = text;
        model.original = request;
        model.cursor = { start: 5, end: 8 };
        (completer.selected as any).emit(patch);
        expect(handler.editor.model.value.text).to.equal(want);
      });
    });
  });
});
