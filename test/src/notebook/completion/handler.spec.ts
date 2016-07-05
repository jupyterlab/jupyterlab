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
  BaseCellWidget
} from '../../../../lib/notebook/cells';

import {
  ICompletionRequest
} from '../../../../lib/notebook/cells/editor';

import {
  CompletionWidget, CellCompletionHandler
} from '../../../../lib/notebook/completion';


class TestCompletionHandler extends CellCompletionHandler {
  makeRequest(request: ICompletionRequest): Promise<void> {
    return super.makeRequest(request);
  }

  onReply(pending: number, request: ICompletionRequest, msg: KernelMessage.ICompleteReplyMsg): void {
    super.onReply(pending, request, msg);
  }
}


describe('notebook/completion/handler', () => {

  describe('CellCompletionHandler', () => {

    describe('#constructor()', () => {

      it('should create a completion handler', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        expect(handler).to.be.a(CellCompletionHandler);
      });

    });

    describe('#kernel', () => {

      it('should default to null', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        expect(handler.kernel).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        let kernel = new MockKernel();
        expect(handler.kernel).to.be(null);
        handler.kernel = kernel;
        expect(handler.kernel).to.be.a(MockKernel);
        expect(handler.kernel).to.be(kernel);
      });

    });


    describe('#activeCell', () => {

      it('should default to null', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        expect(handler.activeCell).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        let cell = new BaseCellWidget();
        expect(handler.activeCell).to.be(null);
        handler.activeCell = cell;
        expect(handler.activeCell).to.be.a(BaseCellWidget);
        expect(handler.activeCell).to.be(cell);
      });

      it('should be resettable', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        let one = new BaseCellWidget();
        let two = new BaseCellWidget();
        expect(handler.activeCell).to.be(null);
        handler.activeCell = one;
        expect(handler.activeCell).to.be.a(BaseCellWidget);
        expect(handler.activeCell).to.be(one);
        handler.activeCell = two;
        expect(handler.activeCell).to.be.a(BaseCellWidget);
        expect(handler.activeCell).to.be(two);
      });

    });

    describe('#isDisposed', () => {

      it('should be true if handler has been disposed', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the handler resources', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        let kernel = new MockKernel();
        handler.kernel = kernel;
        expect(handler.isDisposed).to.be(false);
        expect(handler.kernel).to.be.ok();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
        expect(handler.kernel).to.not.be.ok();
      });

      it('should be safe to call multiple times', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#makeRequest()', () => {

      it('should reject if handler has no kernel', (done) => {
        let handler = new TestCompletionHandler(new CompletionWidget());
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'foo'
        };
        handler.makeRequest(request).catch((reason: Error) => {
          expect(reason).to.be.an(Error);
          done();
        });
      });

      // TODO: This test needs to be fixed when MockKernel is updated.
      it('should resolve if handler has a kernel', () => {
        console.warn('This test needs to be fixed when MockKernel is updated.');
        let handler = new TestCompletionHandler(new CompletionWidget());
        let kernel = new MockKernel();
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'foo'
        };
        handler.kernel = kernel;
        expect(handler.makeRequest(request)).to.be.a(Promise);
      });

    });

    describe('#onReply()', () => {

      it('should do nothing if handler has been disposed', () => {
        let handler = new TestCompletionHandler(new CompletionWidget());
        handler.dispose();
        handler.onReply(0, null, null);
      });

      it('should do nothing if pending request ID does not match', () => {
        let handler = new TestCompletionHandler(new CompletionWidget());
        handler.onReply(1, null, null);
      });

    });

  });

});
