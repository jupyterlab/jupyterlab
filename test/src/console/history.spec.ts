// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  KernelMessage, Kernel
} from '@jupyterlab/services';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  ConsoleHistory
} from '@jupyterlab/console';


const mockHistory: KernelMessage.IHistoryReplyMsg = {
  header: null,
  parent_header: {},
  metadata: null,
  buffers: null,
  channel: 'shell',
  content: {
    history: [
      [0, 0, 'foo'],
      [0, 0, 'bar'],
      [0, 0, 'baz'],
      [0, 0, 'qux']
    ]
  }
};


class TestHistory extends ConsoleHistory {

  methods: string[] = [];

  onEdgeRequest(editor: CodeEditor.IEditor, location: CodeEditor.EdgeLocation): void {
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


const kernelPromise = Kernel.startNew();


describe('console/history', () => {

  let kernel: Kernel.IKernel;

  beforeEach((done) => {
    kernelPromise.then(k => {
      kernel = k;
      done();
    });
  });

  after(() => {
    kernel.shutdown();
  });

  describe('ConsoleHistory', () => {

    describe('#constructor()', () => {

      it('should create a new console history object', () => {
        let history = new ConsoleHistory();
        expect(history).to.be.a(ConsoleHistory);
      });

      it('should accept an options argument', () => {
        let history = new ConsoleHistory({ kernel });
        expect(history).to.be.a(ConsoleHistory);
      });

    });

    describe('#isDisposed', () => {

      it('should get whether the object is disposed', () => {
        let history = new ConsoleHistory();
        expect(history.isDisposed).to.be(false);
        history.dispose();
        expect(history.isDisposed).to.be(true);
      });

    });

    describe('#kernel', () => {

      it('should return the kernel that was passed in', () => {
        let history = new ConsoleHistory({ kernel });
        expect(history.kernel).to.be(kernel);
      });

      it('should be settable', () => {
        let history = new ConsoleHistory();
        expect(history.kernel).to.be(null);
        history.kernel = kernel;
        expect(history.kernel).to.be(kernel);
        history.kernel = null;
        expect(history.kernel).to.be(null);
      });

      it('should be safe to set multiple times', () => {
        let history = new ConsoleHistory();
        history.kernel = kernel;
        history.kernel = kernel;
        expect(history.kernel).to.be(kernel);
      });

    });

    describe('#dispose()', () => {

      it('should dispose the history object', () => {
        let history = new ConsoleHistory();
        expect(history.isDisposed).to.be(false);
        history.dispose();
        expect(history.isDisposed).to.be(true);
      });

      it('should be safe to dispose multiple times', () => {
        let history = new ConsoleHistory();
        expect(history.isDisposed).to.be(false);
        history.dispose();
        history.dispose();
        expect(history.isDisposed).to.be(true);
      });

    });

    describe('#back()', () => {

      it('should return void promise if no history exists', (done) => {
        let history = new ConsoleHistory();
        history.back('').then(result => {
          expect(result).to.be(void 0);
          done();
        });
      });

      it('should return previous items if they exist', (done) => {
        let history = new TestHistory({ kernel });
        history.onHistory(mockHistory);
        history.back('').then(result => {
          let index = mockHistory.content.history.length - 1;
          let last = (mockHistory.content.history[index] as any)[2];
          expect(result).to.be(last);
          done();
        });
      });

    });

    describe('#forward()', () => {

      it('should return void promise if no history exists', (done) => {
        let history = new ConsoleHistory();
        history.forward('').then(result => {
          expect(result).to.be(void 0);
          done();
        });
      });

      it('should return next items if they exist', (done) => {
        let history = new TestHistory({ kernel });
        history.onHistory(mockHistory);
        Promise.all([history.back(''), history.back('')]).then(() => {
          history.forward('').then(result => {
            let index = mockHistory.content.history.length - 1;
            let last = (mockHistory.content.history[index] as any)[2];
            expect(result).to.be(last);
            done();
          });
        });
      });

    });

    describe('#push()', () => {

      it('should allow addition of history items', (done) => {
        let history = new ConsoleHistory();
        let item = 'foo';
        history.push(item);
        history.back('').then(result => {
          expect(result).to.be(item);
          done();
        });
      });

    });

    describe('#onTextChange()', () => {

      it('should be called upon an editor text change', () => {
        let history = new TestHistory();
        expect(history.methods).to.not.contain('onTextChange');
        let model = new CodeEditor.Model();
        let host = document.createElement('div');
        let editor = new CodeMirrorEditor({ model, host }, {});
        history.editor = editor;
        model.value.text = 'foo';
        expect(history.methods).to.contain('onTextChange');
      });

    });

    describe('#onEdgeRequest()', () => {

      it('should be called upon an editor edge request', (done) => {
        let history = new TestHistory();
        expect(history.methods).to.not.contain('onEdgeRequest');
        let host = document.createElement('div');
        let model = new CodeEditor.Model();
        let editor = new CodeMirrorEditor({ model, host }, {});
        history.editor = editor;
        history.push('foo');
        editor.model.value.changed.connect(() => {
          expect(editor.model.value.text).to.be('foo');
          done();
        });
        editor.edgeRequested.emit('top');
        expect(history.methods).to.contain('onEdgeRequest');
      });

    });

  });

});
