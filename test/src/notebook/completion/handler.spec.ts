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
  ICompletionRequest, CellEditorWidget, ITextChange
} from '../../../../lib/notebook/cells/editor';

import {
  CompletionWidget, CellCompletionHandler, CompletionModel
} from '../../../../lib/notebook/completion';


class TestCompletionModel extends CompletionModel {
  methods: string[] = [];

  handleTextChange(change: ITextChange): void {
    this.methods.push('handleTextChange');
    super.handleTextChange(change);
  }
}


class TestCompletionHandler extends CellCompletionHandler {
  methods: string[] = [];

  makeRequest(request: ICompletionRequest): Promise<void> {
    this.methods.push('makeRequest');
    return super.makeRequest(request);
  }

  onReply(pending: number, request: ICompletionRequest, msg: KernelMessage.ICompleteReplyMsg): void {
    super.onReply(pending, request, msg);
  }

  onTextChanged(editor: CellEditorWidget, change: ITextChange): void {
    this.methods.push('onTextChanged');
    super.onTextChanged(editor, change);
  }

  onCompletionRequested(editor: CellEditorWidget, request: ICompletionRequest): void {
    this.methods.push('onCompletionRequested');
    super.onCompletionRequested(editor, request);
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
        let completion = new CompletionWidget();
        let handler = new TestCompletionHandler(completion);
        completion.model = new CompletionModel();
        completion.model.options = ['foo', 'bar', 'baz'];
        handler.dispose();
        handler.onReply(0, null, null);
        expect(completion.model).to.be.ok();
      });

      it('should do nothing if pending request ID does not match', () => {
        let completion = new CompletionWidget();
        let handler = new TestCompletionHandler(completion);
        completion.model = new CompletionModel();
        completion.model.options = ['foo', 'bar', 'baz'];
        handler.onReply(2, null, null);
        expect(completion.model).to.be.ok();
      });

      it('should reset model if status is not ok', () => {
        let completion = new CompletionWidget();
        let handler = new TestCompletionHandler(completion);
        let options = ['a', 'b', 'c'];
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'f'
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
        completion.model = new CompletionModel();
        completion.model.options = options;
        expect(completion.model.options).to.eql(options);
        handler.onReply(0, request, reply);
        expect(completion.model.options).to.be(null);
      });

      it('should update model if status is ok', () => {
        let completion = new CompletionWidget();
        let handler = new TestCompletionHandler(completion);
        let options = ['a', 'b', 'c'];
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'f'
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
        completion.model = new CompletionModel();
        completion.model.options = options;
        expect(completion.model.options).to.eql(options);
        handler.onReply(0, request, reply);
        expect(completion.model.options).to.eql(reply.content.matches);
      });

    });

    describe('#onTextChanged()', () => {

      it('should fire when the active editor emits a text change', () => {
        let handler = new TestCompletionHandler(new CompletionWidget());
        let change: ITextChange = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          oldValue: 'fo',
          newValue: 'foo'
        };
        let cell = new BaseCellWidget();

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onTextChanged');
        cell.editor.textChanged.emit(change);
        expect(handler.methods).to.contain('onTextChanged');
      });

      it('should call model change handler if model exists', () => {
        let completion = new CompletionWidget({
          model: new TestCompletionModel()
        });
        let handler = new TestCompletionHandler(completion);
        let change: ITextChange = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          oldValue: 'fo',
          newValue: 'foo'
        };
        let cell = new BaseCellWidget();
        let model = completion.model as TestCompletionModel;

        handler.activeCell = cell;
        expect(model.methods).to.not.contain('handleTextChange');
        cell.editor.textChanged.emit(change);
        expect(model.methods).to.contain('handleTextChange');
      });

    });

    describe('#onCompletionRequested()', () => {

      it('should fire when the active editor emits a request', () => {
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
        let cell = new BaseCellWidget();

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onCompletionRequested');
        cell.editor.completionRequested.emit(request);
        expect(handler.methods).to.contain('onCompletionRequested');
      });

      it('should make a kernel request if kernel and model exist', () => {
        let completion = new CompletionWidget({
          model: new TestCompletionModel()
        });
        let handler = new TestCompletionHandler(completion);
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'foo'
        };
        let cell = new BaseCellWidget();
        let model = completion.model as TestCompletionModel;

        handler.kernel = new MockKernel();
        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('makeRequest');
        cell.editor.completionRequested.emit(request);
        expect(handler.methods).to.contain('makeRequest');
      });

    });

  });

});
