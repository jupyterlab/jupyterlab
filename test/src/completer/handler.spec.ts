// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  KernelMessage, Kernel
} from '@jupyterlab/services';

import {
  CodeEditor
} from '../../../lib/codeeditor';

import {
  BaseCellWidget, CellModel
} from '../../../lib/notebook/cells';

import {
  CompleterWidget, CellCompleterHandler, CompleterModel
} from '../../../lib/completer';

import {
  createBaseCellRenderer
} from '../notebook/utils';


const renderer = createBaseCellRenderer();


class TestCompleterModel extends CompleterModel {
  methods: string[] = [];

  createPatch(patch: string): CompleterWidget.IPatch {
    this.methods.push('createPatch');
    return super.createPatch(patch);
  }

  handleTextChange(change: CompleterWidget.ITextState): void {
    this.methods.push('handleTextChange');
    super.handleTextChange(change);
  }
}


class TestCompleterHandler extends CellCompleterHandler {
  methods: string[] = [];

  makeRequest(request: CodeEditor.IPosition): Promise<void> {
    let promise = super.makeRequest(request);
    this.methods.push('makeRequest');
    return promise;
  }

  onReply(pending: number, request: CompleterWidget.ITextState, msg: KernelMessage.ICompleteReplyMsg): void {
    super.onReply(pending, request, msg);
    this.methods.push('onReply');
  }

  onTextChanged(): void {
    super.onTextChanged();
    this.methods.push('onTextChanged');
  }

  onCompletionRequested(editor: CodeEditor.IEditor, position: CodeEditor.IPosition): void {
    super.onCompletionRequested(editor, position);
    this.methods.push('onCompletionRequested');
  }

  onCompletionSelected(widget: CompleterWidget, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
  }
}

const kernelPromise = Kernel.startNew();


function createCellWidget(): BaseCellWidget {
  return new BaseCellWidget({ model: new CellModel(), renderer });
}


describe('completer/handler', () => {

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

  describe('CellCompleterHandler', () => {

    describe('#constructor()', () => {

      it('should create a completer handler', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        expect(handler).to.be.a(CellCompleterHandler);
      });

    });

    describe('#kernel', () => {

      it('should default to null', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        expect(handler.kernel).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        expect(handler.kernel).to.be(null);
        handler.kernel = kernel;
        expect(handler.kernel).to.be(kernel);
      });

    });


    describe('#activeCell', () => {

      it('should default to null', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        expect(handler.activeCell).to.be(null);
      });

      it('should be settable', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        let cell = createCellWidget();
        expect(handler.activeCell).to.be(null);
        handler.activeCell = cell;
        expect(handler.activeCell).to.be.a(BaseCellWidget);
        expect(handler.activeCell).to.be(cell);
      });

      it('should be resettable', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        let one = createCellWidget();
        let two = createCellWidget();
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
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the handler resources', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget(),
          kernel: kernel
        });
        expect(handler.isDisposed).to.be(false);
        expect(handler.kernel).to.be.ok();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
        expect(handler.kernel).to.not.be.ok();
      });

      it('should be safe to call multiple times', () => {
        let handler = new CellCompleterHandler({
          completer: new CompleterWidget()
        });
        expect(handler.isDisposed).to.be(false);
        handler.dispose();
        handler.dispose();
        expect(handler.isDisposed).to.be(true);
      });

    });

    describe('#makeRequest()', () => {

      it('should reject if handler has no kernel', (done) => {
        let handler = new TestCompleterHandler({
          completer: new CompleterWidget()
        });
        handler.activeCell = createCellWidget();
        let request = {
          column: 0,
          line: 0
        };
        handler.makeRequest(request).catch((reason: Error) => {
          expect(reason).to.be.an(Error);
          done();
        });
      });

      it('should reject if handler has no active cell', (done) => {
        let handler = new TestCompleterHandler({
          completer: new CompleterWidget()
        });
        handler.kernel = kernel;
        let request = {
          column: 0,
          line: 0
        };
        handler.makeRequest(request).catch((reason: Error) => {
          expect(reason).to.be.an(Error);
          done();
        });
      });

      it('should resolve if handler has a kernel and an active cell', (done) => {
        let handler = new TestCompleterHandler({
          completer: new CompleterWidget()
        });
        let request = {
          column: 0,
          line: 0
        };
        handler.kernel = kernel;
        handler.activeCell = createCellWidget();
        handler.activeCell.model.value.text = 'a=1';

        handler.makeRequest(request).then(() => { done(); }).catch(done);
      });

    });

    describe('#onReply()', () => {

      it('should do nothing if handler has been disposed', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler({ completer });
        completer.model = new CompleterModel();
        completer.model.setOptions(['foo', 'bar', 'baz']);
        handler.dispose();
        handler.onReply(0, null, null);
        expect(completer.model).to.be.ok();
      });

      it('should do nothing if pending request ID does not match', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler({ completer });
        completer.model = new CompleterModel();
        completer.model.setOptions(['foo', 'bar', 'baz']);
        handler.onReply(2, null, null);
        expect(completer.model).to.be.ok();
      });

      it('should reset model if status is not ok', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler({ completer });
        let options = ['a', 'b', 'c'];
        let request: CompleterWidget.ITextState = {
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
        handler.onReply(0, request, reply);
        expect(toArray(completer.model.options())).to.eql([]);
      });

      it('should update model if status is ok', () => {
        let completer = new CompleterWidget();
        let handler = new TestCompleterHandler({ completer });
        let options = ['a', 'b', 'c'];
        let request: CompleterWidget.ITextState = {
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
        handler.onReply(0, request, reply);
        expect(toArray(completer.model.options())).to.eql(reply.content.matches);
      });

    });

    describe('#onTextChanged()', () => {

      it('should fire when the active editor emits a text change', () => {
        let handler = new TestCompleterHandler({
          completer: new CompleterWidget()
        });
        let cell = createCellWidget();
        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onTextChanged');
        cell.editor.model.value.text = 'foo';
        expect(handler.methods).to.contain('onTextChanged');
      });

      it('should call model change handler if model exists', () => {
        let completer = new CompleterWidget({
          model: new TestCompleterModel()
        });
        let handler = new TestCompleterHandler({ completer });
        let cell = createCellWidget();
        let model = completer.model as TestCompleterModel;

        handler.activeCell = cell;
        expect(model.methods).to.not.contain('handleTextChange');
        cell.editor.model.value.text = 'foo';
        expect(model.methods).to.contain('handleTextChange');
      });

    });

    describe('#onCompletionRequested()', () => {

      it('should fire when the active editor emits a request', () => {
        let handler = new TestCompleterHandler({
          completer: new CompleterWidget()
        });
        let request: CodeEditor.IPosition = {
          column: 0,
          line: 0
        };
        let cell = createCellWidget();

        handler.activeCell = cell;
        expect(handler.methods).to.not.contain('onCompletionRequested');
        cell.editor.completionRequested.emit(request);
        expect(handler.methods).to.contain('onCompletionRequested');
      });

      it('should make a kernel request if kernel and model exist', () => {
        let completer = new CompleterWidget({
          model: new TestCompleterModel()
        });
        let handler = new TestCompleterHandler({ completer });
        let request: CodeEditor.IPosition = {
          column: 0,
          line: 0
        };
        let cell = createCellWidget();

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
        let handler = new TestCompleterHandler({ completer });

        expect(handler.methods).to.not.contain('onCompletionSelected');
        completer.selected.emit('foo');
        expect(handler.methods).to.contain('onCompletionSelected');
      });

      it('should call model create patch method if model exists', () => {
        let completer = new CompleterWidget({
          model: new TestCompleterModel()
        });
        let handler = new TestCompleterHandler({ completer });
        let model = completer.model as TestCompleterModel;

        handler.activeCell = createCellWidget();
        expect(model.methods).to.not.contain('createPatch');
        completer.selected.emit('foo');
        expect(model.methods).to.contain('createPatch');
      });

      it('should update cell if patch exists', () => {
        let model = new CompleterModel();
        let patch = 'foobar';
        let completer = new CompleterWidget({ model });
        let handler = new TestCompleterHandler({ completer });
        let cell = createCellWidget();
        let request: CompleterWidget.ITextState = {
          column: 0,
          line: 0,
          lineHeight: 0,
          charWidth: 0,
          coords: null,
          text: 'foo'
        };

        handler.activeCell = cell;
        handler.activeCell.model.value.text = 'foo';
        model.original = request;
        model.cursor = { start: 0, end: 3 };
        completer.selected.emit(patch);
        expect(handler.activeCell.model.value.text).to.equal(patch);
      });

    });

  });

});
