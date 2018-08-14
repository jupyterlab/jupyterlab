// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IClientSession } from '@jupyterlab/apputils';

import { KernelMessage } from '@jupyterlab/services';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { ConsoleHistory } from '@jupyterlab/console';

import { createClientSession, signalToPromise } from '@jupyterlab/testutils';

const mockHistory: KernelMessage.IHistoryReplyMsg = {
  header: null,
  parent_header: {},
  metadata: null,
  buffers: null,
  channel: 'shell',
  content: {
    history: [[0, 0, 'foo'], [0, 0, 'bar'], [0, 0, 'baz'], [0, 0, 'qux']]
  }
};

class TestHistory extends ConsoleHistory {
  methods: string[] = [];

  onEdgeRequest(
    editor: CodeEditor.IEditor,
    location: CodeEditor.EdgeLocation
  ): void {
    this.methods.push('onEdgeRequest');
    super.onEdgeRequest(editor, location);
  }

  onHistory(value: KernelMessage.IHistoryReplyMsg): void {
    super.onHistory(value);
    this.methods.push('onHistory');
  }

  onTextChange(): void {
    super.onTextChange();
    this.methods.push('onTextChange');
  }
}

describe('console/history', () => {
  let session: IClientSession;

  beforeEach(async () => {
    session = await createClientSession();
  });

  after(() => {
    session.shutdown();
  });

  describe('ConsoleHistory', () => {
    describe('#constructor()', () => {
      it('should create a console history object', () => {
        const history = new ConsoleHistory({ session });
        expect(history).to.be.an.instanceof(ConsoleHistory);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the object is disposed', () => {
        const history = new ConsoleHistory({ session });
        expect(history.isDisposed).to.equal(false);
        history.dispose();
        expect(history.isDisposed).to.equal(true);
      });
    });

    describe('#session', () => {
      it('should be the client session object', () => {
        const history = new ConsoleHistory({ session });
        expect(history.session).to.equal(session);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the history object', () => {
        const history = new ConsoleHistory({ session });
        expect(history.isDisposed).to.equal(false);
        history.dispose();
        expect(history.isDisposed).to.equal(true);
      });

      it('should be safe to dispose multiple times', () => {
        const history = new ConsoleHistory({ session });
        expect(history.isDisposed).to.equal(false);
        history.dispose();
        history.dispose();
        expect(history.isDisposed).to.equal(true);
      });
    });

    describe('#back()', () => {
      it('should return an empty string if no history exists', async () => {
        const history = new ConsoleHistory({ session });
        const result = await history.back('');
        expect(result).to.equal('');
      });

      it('should return previous items if they exist', async () => {
        const history = new TestHistory({ session });
        history.onHistory(mockHistory);
        const result = await history.back('');
        const index = mockHistory.content.history.length - 1;
        const last = (mockHistory.content.history[index] as any)[2];
        expect(result).to.equal(last);
      });
    });

    describe('#forward()', () => {
      it('should return an empty string if no history exists', async () => {
        const history = new ConsoleHistory({ session });
        const result = await history.forward('');
        expect(result).to.equal('');
      });

      it('should return next items if they exist', async () => {
        const history = new TestHistory({ session });
        history.onHistory(mockHistory);
        await Promise.all([history.back(''), history.back('')]);
        const result = await history.forward('');
        const index = mockHistory.content.history.length - 1;
        const last = (mockHistory.content.history[index] as any)[2];
        expect(result).to.equal(last);
      });
    });

    describe('#push()', () => {
      it('should allow addition of history items', async () => {
        const history = new ConsoleHistory({ session });
        const item = 'foo';
        history.push(item);
        const result = await history.back('');
        expect(result).to.equal(item);
      });
    });

    describe('#onTextChange()', () => {
      it('should be called upon an editor text change', () => {
        const history = new TestHistory({ session });
        expect(history.methods).to.not.contain('onTextChange');
        const model = new CodeEditor.Model();
        const host = document.createElement('div');
        const editor = new CodeMirrorEditor({ model, host });
        history.editor = editor;
        model.value.text = 'foo';
        expect(history.methods).to.contain('onTextChange');
      });
    });

    describe('#onEdgeRequest()', () => {
      it('should be called upon an editor edge request', async () => {
        const history = new TestHistory({ session });
        expect(history.methods).to.not.contain('onEdgeRequest');
        const host = document.createElement('div');
        const model = new CodeEditor.Model();
        const editor = new CodeMirrorEditor({ model, host });
        history.editor = editor;
        history.push('foo');
        const promise = signalToPromise(editor.model.value.changed);
        editor.edgeRequested.emit('top');
        expect(history.methods).to.contain('onEdgeRequest');
        await promise;
        expect(editor.model.value.text).to.equal('foo');
      });
    });
  });
});
