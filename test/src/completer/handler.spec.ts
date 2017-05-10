// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  KernelMessage
} from '@jupyterlab/services';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  CodeEditor, CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  Completer, CompletionHandler, CompleterModel
} from '@jupyterlab/completer';

import {
  createClientSession
} from '../utils';


function createEditorWidget(): CodeEditorWrapper {
  let model = new CodeEditor.Model();
  let factory = (options: CodeEditor.IOptions) => {
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

  makeRequest(request: CodeEditor.IPosition): Promise<void> {
    let promise = super.makeRequest(request);
    this.methods.push('makeRequest');
    return promise;
  }

  onReply(state: Completer.ITextState, reply: KernelMessage.ICompleteReplyMsg): void {
    super.onReply(state, reply);
    this.methods.push('onReply');
  }

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

  let session: IClientSession;

  before(() => {
    return createClientSession().then(s => {
      session = s;
      return s.initialize();
    });
  });

  after(() => {
    return session.shutdown();
  });

  describe('CompletionHandler', () => {

    describe('#constructor()', () => {

      it('should create a completer handler', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        expect(handler).to.be.a(CompletionHandler);
      });

    });

    describe('#session', () => {

      it('should be the client session object', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        expect(handler.session).to.be(session);
      });

    });


    describe('#editor', () => {

      it('should default to null', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        expect(handler.editor).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        let widget = createEditorWidget();
        expect(handler.editor).to.be(null);
        handler.editor = widget.editor;
        expect(handler.editor).to.be(widget.editor);
      });

      it('should be resettable', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        let one = createEditorWidget();
        let two = createEditorWidget();
        expect(handler.editor).to.be(null);
        handler.editor = one.editor;
        expect(handler.editor).to.be(one.editor);
        handler.editor = two.editor;
        expect(handler.editor).to.be(two.editor);
      });

    });

    describe('#isDisposed', () => {

      it('should be true if handler has been disposed', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the handler resources', () => {
        let handler = new CompletionHandler({
          completer: new Completer({ editor: null }),
          session
        });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let handler = new CompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#makeRequest()', () => {

      it('should reject if handler has no kernel', () => {
        return createClientSession().then(session => {
          let handler = new TestCompletionHandler({
            session,
            completer: new Completer({ editor: null })
          });
          handler.editor = createEditorWidget().editor;
          let request = {
            column: 0,
            line: 0
          };
          return handler.makeRequest(request).then(
            () => { throw Error('Should have rejected'); },
            reason => { expect(reason).to.be.an(Error); }
          );
        });
      });

      it('should reject if handler has no active cell', () => {
        let handler = new TestCompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        let request = {
          column: 0,
          line: 0
        };
        return handler.makeRequest(request).then(
          () => { throw Error('Should have rejected'); },
          reason => { expect(reason).to.be.an(Error); }
        );
      });

      it('should resolve if handler has a kernel and an active cell', () => {
        let handler = new TestCompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        let request = {
          column: 0,
          line: 0
        };
        handler.editor = createEditorWidget().editor;
        handler.editor.model.value.text = 'a=1';

        return handler.makeRequest(request);
      });

    });

    describe('#onReply()', () => {

      it('should reset model if status is not ok', () => {
        let completer = new Completer({ editor: null });
        let handler = new TestCompletionHandler({ session, completer });
        let options = ['a', 'b', 'c'];
        let request: Completer.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords: null,
          text: 'f'
        };
        let reply: KernelMessage.ICompleteReplyMsg = {
          header: null,
          parent_header: {},
          metadata: {},
          buffers: null,
          channel: 'shell',
          content: {
            status: 'error',
            cursor_start: 0,
            cursor_end: 0,
            metadata: {},
            matches: ['foo']
          }
        };
        completer.model = new CompleterModel();
        completer.model.setOptions(options);
        expect(toArray(completer.model.options())).to.eql(options);
        handler.onReply(request, reply);
        expect(toArray(completer.model.options())).to.eql([]);
      });

      it('should update model if status is ok', () => {
        let completer = new Completer({ editor: null });
        let handler = new TestCompletionHandler({ session, completer });
        let options = ['a', 'b', 'c'];
        let request: Completer.ITextState = {
          column: 0,
          lineHeight: 0,
          charWidth: 0,
          line: 0,
          coords: null,
          text: 'f'
        };
        let reply: KernelMessage.ICompleteReplyMsg = {
          header: null,
          parent_header: {},
          metadata: {},
          buffers: null,
          channel: 'shell',
          content: {
            status: 'ok',
            cursor_start: 0,
            cursor_end: 0,
            metadata: {},
            matches: ['foo']
          }
        };
        completer.model = new CompleterModel();
        completer.model.setOptions(options);
        expect(toArray(completer.model.options())).to.eql(options);
        handler.onReply(request, reply);
        expect(toArray(completer.model.options())).to.eql(reply.content.matches);
      });

    });

    describe('#onTextChanged()', () => {

      it('should fire when the active editor emits a text change', () => {
        let handler = new TestCompletionHandler({
          session,
          completer: new Completer({ editor: null })
        });
        handler.editor = createEditorWidget().editor;
        expect(handler.methods).to.not.contain('onTextChanged');
        handler.editor.model.value.text = 'foo';
        expect(handler.methods).to.contain('onTextChanged');
      });

      it('should call model change handler if model exists', () => {
        let completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        let handler = new TestCompletionHandler({ session, completer });
        let editor = createEditorWidget().editor;
        let model = completer.model as TestCompleterModel;

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
        let completer = new Completer({ editor: null });
        let handler = new TestCompletionHandler({ session, completer });

        expect(handler.methods).to.not.contain('onCompletionSelected');
        (completer.selected as any).emit('foo');
        expect(handler.methods).to.contain('onCompletionSelected');
      });

      it('should call model create patch method if model exists', () => {
        let completer = new Completer({
          editor: null,
          model: new TestCompleterModel()
        });
        let handler = new TestCompletionHandler({ session, completer });
        let model = completer.model as TestCompleterModel;

        handler.editor = createEditorWidget().editor;
        expect(model.methods).to.not.contain('createPatch');
        (completer.selected as any).emit('foo');
        expect(model.methods).to.contain('createPatch');
      });

      it('should update cell if patch exists', () => {
        let model = new CompleterModel();
        let patch = 'foobar';
        let completer = new Completer({ editor: null, model });
        let handler = new TestCompletionHandler({ session, completer });
        let editor = createEditorWidget().editor;
        let text = 'eggs\nfoo # comment\nbaz';
        let want = 'eggs\nfoobar # comment\nbaz';
        let request: Completer.ITextState = {
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
