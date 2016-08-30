// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  KernelMessage
} from 'jupyter-js-services';

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  ConsoleHistory
} from '../../../lib/console/history';


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
  onHistory(value: KernelMessage.IHistoryReplyMsg): void {
    super.onHistory(value);
  }
}


describe('console/history', () => {

  describe('ConsoleHistory', () => {

    describe('#constructor()', () => {

      it('should create a new console history object', () => {
        let history = new ConsoleHistory();
        expect(history).to.be.a(ConsoleHistory);
      });

      it('should accept an options argument', () => {
        let history = new ConsoleHistory({
          kernel: new MockKernel({ name: 'python' })
        });
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

      it('should be read-only', () => {
        let history = new ConsoleHistory();
        expect(() => history.isDisposed = false).to.throwError();
      });

    });

    describe('#kernel', () => {

      it('should return the kernel that was passed in', () => {
        let kernel = new MockKernel({ name: 'python' });
        let history = new ConsoleHistory({ kernel });
        expect(history.kernel).to.be(kernel);
      });

      it('should be settable', () => {
        let kernel = new MockKernel({ name: 'python' });
        let history = new ConsoleHistory();
        expect(history.kernel).to.be(null);
        history.kernel = kernel;
        expect(history.kernel).to.be(kernel);
        history.kernel = null;
        expect(history.kernel).to.be(null);
      });

      it('should be safe to set multiple times', () => {
        let kernel = new MockKernel({ name: 'python' });
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

      it('should return void promise if no previous history exists', (done) => {
        let history = new ConsoleHistory();
        history.back().then(result => {
          expect(result).to.be(void 0);
          done();
        });
      });

      it('should return previous items if they exist', (done) => {
        let history = new TestHistory({
          kernel: new MockKernel({ name: 'python' })
        });
        history.onHistory(mockHistory);
        history.back().then(result => {
          let index = mockHistory.content.history.length - 1;
          let last = (mockHistory.content.history[index] as any)[2];
          expect(result).to.be(last);
          done();
        });
      });

    });

  });

});
