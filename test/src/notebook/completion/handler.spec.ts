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
  BaseCellWidget, CellModel
} from '../../../../lib/notebook/cells';

import {
  ICompletionRequest, ICellEditorWidgetExtension, ITextChange
} from '../../../../lib/notebook/cells/editor';

import {
  CompletionWidget, CellCompletionHandler, CompletionModel, ICompletionPatch
} from '../../../../lib/notebook/completion';

import {
  defaultCodeMirrorCodeCellWidgetRenderer
} from '../../../../lib/notebook/codemirror/cells/widget';


class TestCompletionModel extends CompletionModel {
  methods: string[] = [];

  createPatch(patch: string): ICompletionPatch {
    this.methods.push('createPatch');
    return super.createPatch(patch);
  }

  handleTextChange(change: ITextChange): void {
    this.methods.push('handleTextChange');
    super.handleTextChange(change);
  }
}


class TestCompletionHandler extends CellCompletionHandler {
  methods: string[] = [];

  makeRequest(request: ICompletionRequest): Promise<void> {
    let promise = super.makeRequest(request);
    this.methods.push('makeRequest');
    return promise;
  }

  onReply(pending: number, request: ICompletionRequest, msg: KernelMessage.ICompleteReplyMsg): void {
    super.onReply(pending, request, msg);
    this.methods.push('onReply');
  }

  onTextChanged(editor: ICellEditorWidgetExtension, change: ITextChange): void {
    super.onTextChanged(editor, change);
    this.methods.push('onTextChanged');
  }

  onCompletionRequested(editor: ICellEditorWidgetExtension, request: ICompletionRequest): void {
    super.onCompletionRequested(editor, request);
    this.methods.push('onCompletionRequested');
  }

  onCompletionSelected(widget: CompletionWidget, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
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
        let cell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
        expect(handler.activeCell).to.be(null);
        handler.activeCell = cell;
        expect(handler.activeCell).to.be.a(BaseCellWidget);
        expect(handler.activeCell).to.be(cell);
      });

      it('should be resettable', () => {
        let handler = new CellCompletionHandler(new CompletionWidget());
        let one = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
        let two = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
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
          position: 0,
          coords: null,
          oldValue: 'fo',
          newValue: 'foo'
        };
        let cell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onTextChanged');
        (cell.editor as ICellEditorWidgetExtension).textChanged.emit(change);
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
          position: 0,
          coords: null,
          oldValue: 'fo',
          newValue: 'foo'
        };
        let cell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
        let model = completion.model as TestCompletionModel;

        handler.activeCell = cell;
        expect(model.methods).to.not.contain('handleTextChange');
        (cell.editor as ICellEditorWidgetExtension).textChanged.emit(change);
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
        let cell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onCompletionRequested');
        (cell.editor as ICellEditorWidgetExtension).completionRequested.emit(request);
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
        let cell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
        let model = completion.model as TestCompletionModel;

        handler.kernel = new MockKernel();
        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('makeRequest');
        (cell.editor as ICellEditorWidgetExtension).completionRequested.emit(request);
        expect(handler.methods).to.contain('makeRequest');
      });

    });

    describe('#onCompletionSelected()', () => {

      it('should fire when the completion widget emits a signal', () => {
        let completion = new CompletionWidget();
        let handler = new TestCompletionHandler(completion);

        expect(handler.methods).to.not.contain('onCompletionSelected');
        completion.selected.emit('foo');
        expect(handler.methods).to.contain('onCompletionSelected');
      });

      it('should call model create patch method if model exists', () => {
        let completion = new CompletionWidget({
          model: new TestCompletionModel()
        });
        let handler = new TestCompletionHandler(completion);
        let model = completion.model as TestCompletionModel;

        handler.activeCell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
        expect(model.methods).to.not.contain('createPatch');
        completion.selected.emit('foo');
        expect(model.methods).to.contain('createPatch');
      });

      it('should update cell if patch exists', () => {
        let model = new CompletionModel();
        let patch = 'foobar';
        let completion = new CompletionWidget({ model });
        let handler = new TestCompletionHandler(completion);
        let cell = new BaseCellWidget({renderer:defaultCodeMirrorCodeCellWidgetRenderer});
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'foo'
        };

        cell.model = new CellModel();
        model.original = request;
        model.cursor = { start: 0, end: 3 };
        handler.activeCell = cell;
        handler.activeCell.model.source = request.currentValue;
        completion.selected.emit(patch);
        expect(handler.activeCell.model.source).to.equal(patch);
      });

    });

  });

});
