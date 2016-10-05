// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  KernelMessage, IKernel, startNewKernel
} from 'jupyter-js-services';

import {
  BaseCellWidget, CellModel
} from '../../../lib/notebook/cells';

import {
  ICompletionRequest, ICellEditorWidget, ITextChange
} from '../../../lib/notebook/cells/editor';

import {
  CompleterWidget, CellCompleterHandler, CompleterModel, ICompletionPatch
} from '../../../lib/completer';

import {
  CodeMirrorCodeCellWidgetRenderer
} from '../../../lib/notebook/codemirror/cells/widget';


class TestCompleterModel extends CompleterModel {
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


class TestCompleterHandler extends CellCompleterHandler {
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

  onTextChanged(editor: ICellEditorWidget, change: ITextChange): void {
    super.onTextChanged(editor, change);
    this.methods.push('onTextChanged');
  }

  onCompletionRequested(editor: ICellEditorWidget, request: ICompletionRequest): void {
    super.onCompletionRequested(editor, request);
    this.methods.push('onCompletionRequested');
  }

  onCompletionSelected(widget: CompleterWidget, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
  }
}

const kernelPromise = startNewKernel();


describe('completer/handler', () => {

  let kernel: IKernel;

  beforeEach((done) => {
    kernelPromise.then(k => {
      kernel = k;
      done();
    });
  });

  after(() => {
    kernel.shutdown();
  });

  describe('CellCompleterHandler', () => {

    describe('#constructor()', () => {

      it('should create a completer handler', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        expect(handler).to.be.a(CellCompleterHandler);
      });

    });

    describe('#kernel', () => {

      it('should default to null', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        expect(handler.kernel).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        expect(handler.kernel).to.be(null);
        handler.kernel = kernel;
        expect(handler.kernel).to.be(kernel);
      });

    });


    describe('#activeCell', () => {

      it('should default to null', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        expect(handler.activeCell).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        let cell = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });
        expect(handler.activeCell).to.be(null);
        handler.activeCell = cell;
        expect(handler.activeCell).to.be.a(BaseCellWidget);
        expect(handler.activeCell).to.be(cell);
      });

      it('should be resettable', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        let one = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });
        let two = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });
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
        let handler = new CellCompleterHandler(new CompleterWidget());
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the handler resources', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        handler.kernel = kernel;
        expect(handler.isDisposed).to.be(false);
        expect(handler.kernel).to.be.ok();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
        expect(handler.kernel).to.not.be.ok();
      });

      it('should be safe to call multiple times', () => {
        let handler = new CellCompleterHandler(new CompleterWidget());
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#makeRequest()', () => {

      it('should reject if handler has no kernel', (done) => {
        let handler = new TestCompleterHandler(new CompleterWidget());
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

      // TODO: This test needs to be updated to use a python kernel.
      it('should resolve if handler has a kernel', () => {
        console.warn('This test needs to be updated to use a python kernel.');
        let handler = new TestCompleterHandler(new CompleterWidget());
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
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler(completer);
        completer.model = new CompleterModel();
        completer.model.options = ['foo', 'bar', 'baz'];
        handler.dispose();
        handler.onReply(0, null, null);
        expect(completer.model).to.be.ok();
      });

      it('should do nothing if pending request ID does not match', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler(completer);
        completer.model = new CompleterModel();
        completer.model.options = ['foo', 'bar', 'baz'];
        handler.onReply(2, null, null);
        expect(completer.model).to.be.ok();
      });

      it('should reset model if status is not ok', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler(completer);
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
        completer.model = new CompleterModel();
        completer.model.options = options;
        expect(completer.model.options).to.eql(options);
        handler.onReply(0, request, reply);
        expect(completer.model.options).to.be(null);
      });

      it('should update model if status is ok', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler(completer);
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
        completer.model = new CompleterModel();
        completer.model.options = options;
        expect(completer.model.options).to.eql(options);
        handler.onReply(0, request, reply);
        expect(completer.model.options).to.eql(reply.content.matches);
      });

    });

    describe('#onTextChanged()', () => {

      it('should fire when the active editor emits a text change', () => {
        let handler = new TestCompleterHandler(new CompleterWidget());
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
        let cell = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onTextChanged');
        cell.editor.textChanged.emit(change);
        expect(handler.methods).to.contain('onTextChanged');
      });

      it('should call model change handler if model exists', () => {
        let completer = new CompleterWidget({
          model: new TestCompleterModel()
        });
        let handler = new TestCompleterHandler(completer);
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
        let cell = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });
        let model = completer.model as TestCompleterModel;

        handler.activeCell = cell;
        expect(model.methods).to.not.contain('handleTextChange');
        cell.editor.textChanged.emit(change);
        expect(model.methods).to.contain('handleTextChange');
      });

    });

    describe('#onCompletionRequested()', () => {

      it('should fire when the active editor emits a request', () => {
        let handler = new TestCompleterHandler(new CompleterWidget());
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'foo'
        };
        let cell = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onCompletionRequested');
        cell.editor.completionRequested.emit(request);
        expect(handler.methods).to.contain('onCompletionRequested');
      });

      it('should make a kernel request if kernel and model exist', () => {
        let completer = new CompleterWidget({
          model: new TestCompleterModel()
        });
        let handler = new TestCompleterHandler(completer);
        let request: ICompletionRequest = {
          ch: 0,
          chHeight: 0,
          chWidth: 0,
          line: 0,
          coords: null,
          position: 0,
          currentValue: 'foo'
        };
        let cell = new BaseCellWidget({
          renderer: CodeMirrorCodeCellWidgetRenderer.defaultRenderer
        });

        handler.kernel = kernel;
        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('makeRequest');
        cell.editor.completionRequested.emit(request);
        expect(handler.methods).to.contain('makeRequest');
      });

    });

    describe('#onCompletionSelected()', () => {

      it('should fire when the completer widget emits a signal', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler(completer);

        expect(handler.methods).to.not.contain('onCompletionSelected');
        completer.selected.emit('foo');
        expect(handler.methods).to.contain('onCompletionSelected');
      });

      it('should call model create patch method if model exists', () => {
        let completer = new CompleterWidget({
          model: new TestCompleterModel()
        });
        let handler = new TestCompleterHandler(completer);
        let model = completer.model as TestCompleterModel;
        let renderer = CodeMirrorCodeCellWidgetRenderer.defaultRenderer;

        handler.activeCell = new BaseCellWidget({ renderer });
        expect(model.methods).to.not.contain('createPatch');
        completer.selected.emit('foo');
        expect(model.methods).to.contain('createPatch');
      });

      it('should update cell if patch exists', () => {
        let model = new CompleterModel();
        let patch = 'foobar';
        let completer = new CompleterWidget({ model });
        let handler = new TestCompleterHandler(completer);
        let renderer = CodeMirrorCodeCellWidgetRenderer.defaultRenderer;
        let cell = new BaseCellWidget({ renderer });
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
        handler.activeCell = cell;
        handler.activeCell.model.source = request.currentValue;
        model.original = request;
        model.cursor = { start: 0, end: 3 };
        completer.selected.emit(patch);
        expect(handler.activeCell.model.source).to.equal(patch);
      });

    });

  });

});
