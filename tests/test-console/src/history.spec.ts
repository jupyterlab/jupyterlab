// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IClientSession } from '@jupyterlab/apputils';

import { KernelMessage } from '@jupyterlab/services';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { ConsoleHistory } from '@jupyterlab/console';

import { createClientSession } from '@jupyterlab/testutils';

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

  beforeEach(() => {
    return createClientSession().then(s => {
      session = s;
    });
  });

  after(() => {
    session.shutdown();
  });

  describe('ConsoleHistory', () => {
    describe('#constructor()', () => {
      it('should create a console history object', () => {
        let history = new ConsoleHistory({ session });
        expect(history).to.be.an.instanceof(ConsoleHistory);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the object is disposed', () => {
        let history = new ConsoleHistory({ session });
        expect(history.isDisposed).to.equal(false);
        history.dispose();
        expect(history.isDisposed).to.equal(true);
      });
    });

    describe('#session', () => {
      it('should be the client session object', () => {
        let history = new ConsoleHistory({ session });
        expect(history.session).to.equal(session);
      });
    });

    describe('#dispose()', () => {
      it('should dispose the history object', () => {
        let history = new ConsoleHistory({ session });
        expect(history.isDisposed).to.equal(false);
        history.dispose();
        expect(history.isDisposed).to.equal(true);
      });

      it('should be safe to dispose multiple times', () => {
        let history = new ConsoleHistory({ session });
        expect(history.isDisposed).to.equal(false);
        history.dispose();
        history.dispose();
        expect(history.isDisposed).to.equal(true);
      });
    });

    describe('#back()', () => {
      it('should return an empty string if no history exists', () => {
        let history = new ConsoleHistory({ session });
        return history.back('').then(result => {
          expect(result).to.equal('');
        });
      });

      it('should return previous items if they exist', done => {
        let history = new TestHistory({ session });
        history.onHistory(mockHistory);
        history.back('').then(result => {
          let index = mockHistory.content.history.length - 1;
          let last = (mockHistory.content.history[index] as any)[2];
          expect(result).to.equal(last);
          done();
        });
      });
    });

    describe('#forward()', () => {
      it('should return an empty string if no history exists', () => {
        let history = new ConsoleHistory({ session });
        return history.forward('').then(result => {
          expect(result).to.equal('');
        });
      });

      it('should return next items if they exist', done => {
        let history = new TestHistory({ session });
        history.onHistory(mockHistory);
        Promise.all([history.back(''), history.back('')]).then(() => {
          history.forward('').then(result => {
            let index = mockHistory.content.history.length - 1;
            let last = (mockHistory.content.history[index] as any)[2];
            expect(result).to.equal(last);
            done();
          });
        });
      });
    });

    describe('#push()', () => {
      it('should allow addition of history items', done => {
        let history = new ConsoleHistory({ session });
        let item = 'foo';
        history.push(item);
        history.back('').then(result => {
          expect(result).to.equal(item);
          done();
        });
      });
    });

    describe('#onTextChange()', () => {
      it('should be called upon an editor text change', () => {
        let history = new TestHistory({ session });
        expect(history.methods).to.not.contain('onTextChange');
        let model = new CodeEditor.Model();
        let host = document.createElement('div');
        let editor = new CodeMirrorEditor({ model, host });
        history.editor = editor;
        model.value.text = 'foo';
        expect(history.methods).to.contain('onTextChange');
      });
    });

    describe('#onEdgeRequest()', () => {
      it('should be called upon an editor edge request', done => {
        let history = new TestHistory({ session });
        expect(history.methods).to.not.contain('onEdgeRequest');
        let host = document.createElement('div');
        let model = new CodeEditor.Model();
        let editor = new CodeMirrorEditor({ model, host });
        history.editor = editor;
        history.push('foo');
        editor.model.value.changed.connect(() => {
          expect(editor.model.value.text).to.equal('foo');
          done();
        });
        editor.edgeRequested.emit('top');
        expect(history.methods).to.contain('onEdgeRequest');
      });
    });
  });
});
