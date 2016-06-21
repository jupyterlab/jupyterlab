// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import * as CodeMirror from 'codemirror';

import {
  MockKernel
} from 'jupyter-js-services/lib/mockkernel';

import {
  Message, sendMessage
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  RenderMime
} from '../../../../lib/rendermime';

import {
  BaseCellWidget, CellModel, InputAreaWidget, ICellModel,
  CodeCellWidget, CodeCellModel, ICodeCellModel
} from '../../../../lib/notebook/cells';

import {
  OutputAreaWidget
} from '../../../../lib/notebook/output-area';

import {
  CellEditorWidget
} from '../../../../lib/notebook/cells/editor';


import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';


const INPUT_CLASS = 'jp-InputArea';


const rendermime = defaultRenderMime();


class LogCell extends BaseCellWidget {

  methods: string[] = [];

  messages: string[] = [];

  processMessage(msg: Message): void {
    super.processMessage(msg);
    this.messages.push(msg.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onMetadataChanged(model: ICellModel, args: IChangedArgs<any>): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }

  protected onModelChanged(oldValue: ICellModel, newValue: ICellModel): void {
    super.onModelChanged(oldValue, newValue);
    this.methods.push('onModelChanged');
  }

  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    super.onModelStateChanged(model, args);
    this.methods.push('onModelStateChanged');
  }
}


class LogRenderer extends CodeCellWidget.Renderer {
  methods: string[] = [];

  createCellEditor(model: ICellModel): CellEditorWidget {
    this.methods.push('createCellEditor');
    return super.createCellEditor(model);
  }

  createInputArea(editor: CellEditorWidget): InputAreaWidget {
    this.methods.push('createInputArea');
    return super.createInputArea(editor);
  }

  createOutputArea(rendermime: RenderMime<Widget>): OutputAreaWidget {
    this.methods.push('createOutputArea');
    return super.createOutputArea(rendermime);
  }
}


describe('notebook/cells', () => {

  describe('BaseCellWidget', () => {

    describe('#constructor()', () => {

      it('should create a base cell widget', () => {
        let widget = new BaseCellWidget();
        expect(widget).to.be.a(BaseCellWidget);
      });

      it('should accept a custom renderer', () => {
        let renderer = new LogRenderer();

        expect(renderer.methods).to.not.contain('createCellEditor');
        expect(renderer.methods).to.not.contain('createInputArea');

        let widget = new BaseCellWidget({ renderer });

        expect(widget).to.be.a(BaseCellWidget);
        expect(renderer.methods).to.contain('createCellEditor');
        expect(renderer.methods).to.contain('createInputArea');
      });

    });

    describe('#model', () => {

      it('should be settable', () => {
        let model = new CellModel();
        let widget = new BaseCellWidget();
        expect(widget.model).to.be(null);
        widget.model = model;
        expect(widget.model).to.be(model);
        widget.model = new CellModel();
        expect(widget.model).not.to.be(model);
      });

    });

    describe('#modelChanged', () => {

      it('should emit a signal when the model changes', () => {
        let widget = new BaseCellWidget();
        let called = false;
        widget.modelChanged.connect(() => { called = true; });
        expect(called).to.be(false);
        widget.model = new CellModel();
        expect(called).to.be(true);
      });

    });

    describe('#editor', () => {

      it('should be a cell editor widget', () => {
        let widget = new BaseCellWidget();
        expect(widget.editor).to.be.a(CellEditorWidget);
      });

      it('should be read-only', () => {
        let widget = new BaseCellWidget();
        expect(() => { widget.editor = null; }).to.throwError();
      });

    });

    describe('#mimetype', () => {

      it('should be a string', () => {
        let widget = new BaseCellWidget();
        expect(typeof widget.mimetype).to.be('string');
      });

      it('should default to text/plain', () => {
        let widget = new BaseCellWidget();
        expect(widget.mimetype).to.be('text/plain');
      });

      it('should supporting being set to other types', () => {
        let widget = new BaseCellWidget();
        widget.mimetype = 'test/test';
        expect(widget.mimetype).to.be('test/test');
      });

      it('should not allow being set to empty or null strings', () => {
        let widget = new BaseCellWidget();
        widget.mimetype = null;
        expect(widget.mimetype).to.be('text/plain');
        widget.mimetype = '';
        expect(widget.mimetype).to.be('text/plain');
      });

    });

    describe('#readOnly', () => {

      it('should be a boolean', () => {
        let widget = new BaseCellWidget();
        expect(typeof widget.readOnly).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget();
        expect(widget.readOnly).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget();
        widget.readOnly = true;
        expect(widget.readOnly).to.be(true);
      });

    });

    describe('#trusted', () => {

      it('should be a boolean', () => {
        let widget = new BaseCellWidget();
        expect(typeof widget.trusted).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget();
        expect(widget.trusted).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget();
        widget.model = new CellModel();
        widget.trusted = true;
        expect(widget.trusted).to.be(true);
      });

    });

    describe('#focus()', () => {

      it('should focus the cell editor', () => {
        let widget = new BaseCellWidget();
        widget.attach(document.body);
        expect(widget.editor.editor.hasFocus()).to.be(false);
        widget.focus();
        expect(widget.editor.editor.hasFocus()).to.be(true);
        widget.dispose();
      });

    });

    describe('#setPrompt()', () => {

      it('should not throw an error (full test in input area)', () => {
        let widget = new BaseCellWidget();
        expect(() => { widget.setPrompt(void 0); }).to.not.throwError();
        expect(() => { widget.setPrompt(null); }).to.not.throwError();
        expect(() => { widget.setPrompt(''); }).to.not.throwError();
        expect(() => { widget.setPrompt('null'); }).to.not.throwError();
        expect(() => { widget.setPrompt('test'); }).to.not.throwError();
      });

    });

    describe('#toggleInput()', () => {

      it('should toggle whether the input is shown', () => {
        let widget = new BaseCellWidget();
        let input = widget.node.getElementsByClassName(INPUT_CLASS)[0];
        widget.attach(document.body);
        expect(window.getComputedStyle(input).display).to.not.be('none');
        widget.toggleInput(false);
        expect(window.getComputedStyle(input).display).to.be('none');
        widget.toggleInput(true);
        expect(window.getComputedStyle(input).display).to.not.be('none');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new BaseCellWidget();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new BaseCellWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should run when widget is attached', () => {
        let widget = new LogCell();
        expect(widget.methods).to.not.contain('onAfterAttach');
        widget.attach(document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogCell();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, Widget.MsgUpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should fire when model state changes', () => {
        let method = 'onModelStateChanged';
        let widget = new LogCell();
        widget.model = new CellModel();
        expect(widget.methods).to.not.contain(method);
        widget.model.source = 'foo';
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should fire when model metadata changes', () => {
        let method = 'onMetadataChanged';
        let widget = new LogCell();
        widget.model = new CellModel();
        expect(widget.methods).to.not.contain(method);
        widget.model.metadataChanged.emit({
          name: 'foo',
          oldValue: 'bar',
          newValue: 'baz'
        });
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onModelChanged()', () => {

      it('should fire when the model changes', () => {
        let method = 'onModelChanged';
        let widget = new LogCell();
        expect(widget.methods).to.not.contain(method);
        widget.model = new CellModel();
        expect(widget.methods).to.contain(method);
      });

    });

    describe('.Renderer', () => {

      describe('#constructor()', () => {

        it('should create a renderer', () => {
          let renderer = new BaseCellWidget.Renderer();
          expect(renderer).to.be.a(BaseCellWidget.Renderer);
        });

      });

      describe('#createCellEditor()', () => {

        it('should create a cell editor widget', () => {
          let renderer = new BaseCellWidget.Renderer();
          let editor = renderer.createCellEditor(new CellModel());
          expect(editor).to.be.a(CellEditorWidget);
        });

      });

      describe('#createInputArea()', () => {

        it('should create an input area widget', () => {
          let renderer = new BaseCellWidget.Renderer();
          let editor = renderer.createCellEditor(new CellModel());
          let input = renderer.createInputArea(editor);
          expect(input).to.be.an(InputAreaWidget);
        });

      });

      describe('#defaultRenderer', () => {

        it('should be a renderer', () => {
          let defaultRenderer = BaseCellWidget.defaultRenderer;
          expect(defaultRenderer).to.be.a(BaseCellWidget.Renderer);
        });

      });

    });

  });

  describe('CodeCellWidget', () => {

    describe('#constructor()', () => {

      it('should create a code cell widget', () => {
        let widget = new CodeCellWidget({ rendermime });
        expect(widget).to.be.a(CodeCellWidget);
      });

      it('should accept a custom renderer', () => {
        let renderer = new LogRenderer();

        expect(renderer.methods).to.not.contain('createCellEditor');
        expect(renderer.methods).to.not.contain('createInputArea');
        expect(renderer.methods).to.not.contain('createOutputArea');

        let widget = new CodeCellWidget({ renderer, rendermime });
        widget.model = new CodeCellModel();

        expect(widget).to.be.a(CodeCellWidget);
        expect(renderer.methods).to.contain('createCellEditor');
        expect(renderer.methods).to.contain('createInputArea');
        expect(renderer.methods).to.contain('createOutputArea');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CodeCellWidget({ rendermime });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CodeCellWidget({ rendermime });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#execute()', () => {

      it('should change the execute count of the model', (done) => {
        let widget = new CodeCellWidget({ rendermime });

        widget.model = new CodeCellModel();
        widget.model.source = '1 + 1';
        expect((widget.model as ICodeCellModel).executionCount).to.be(null);
        widget.execute(new MockKernel()).then(() => {
          let model = widget.model as ICodeCellModel;
          expect(model.executionCount).to.not.be(null);
          done();
        }).catch((reason: any) => {
          console.log('oops:', reason);
          done();
        });

      });

    });

    describe('.Renderer', () => {

      describe('#constructor()', () => {

        it('should create a renderer', () => {
          let renderer = new CodeCellWidget.Renderer();
          expect(renderer).to.be.a(CodeCellWidget.Renderer);
        });

      });

      describe('#createOutputArea()', () => {

        it('should create an output area widget', () => {
          let renderer = new CodeCellWidget.Renderer();
          let output = renderer.createOutputArea(rendermime);
          expect(output).to.be.an(OutputAreaWidget);
        });

      });

      describe('#defaultRenderer', () => {

        it('should be a renderer', () => {
          let defaultRenderer = CodeCellWidget.defaultRenderer;
          expect(defaultRenderer).to.be.a(CodeCellWidget.Renderer);
        });

      });

    });

  });

});
