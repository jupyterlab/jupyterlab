// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

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
  CodeCellWidget, CodeCellModel, MarkdownCellWidget,
  RawCellWidget
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

const RENDERED_CLASS = 'jp-mod-rendered';

const PROMPT_CLASS = 'jp-InputArea-prompt';

const rendermime = defaultRenderMime();


class LogBaseCell extends BaseCellWidget {

  methods: string[] = [];

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
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


class LogCodeCell extends CodeCellWidget {

  methods: string[] = [];

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


class LogMarkdownCell extends MarkdownCellWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
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


describe('notebook/cells/widget', () => {

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

      it('should not emit a signal when the model has not changed', () => {
        let widget = new BaseCellWidget();
        let model = new CellModel();
        let called = 0;
        widget.modelChanged.connect(() => { called++; });
        expect(called).to.be(0);
        widget.model = model;
        expect(called).to.be(1);
        widget.model = model;
        expect(called).to.be(1);
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

      it('should be safe to set multiple times', () => {
        let widget = new BaseCellWidget();
        widget.mimetype = 'test/test';
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

      it('should ignore being set to the same value', (done) => {
        let widget = new LogBaseCell();
        widget.readOnly = true;
        widget.readOnly = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.eql(['onUpdateRequest']);
          done();
        });
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

      it('should do nothing if there is no model', () => {
        let widget = new BaseCellWidget();
        expect(widget.trusted).to.be(false);
        widget.trusted = true;
        expect(widget.trusted).to.be(false);
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
        let widget = new LogBaseCell();
        expect(widget.methods).to.not.contain('onAfterAttach');
        widget.attach(document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogBaseCell();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, Widget.MsgUpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should fire when model state changes', () => {
        let method = 'onModelStateChanged';
        let widget = new LogBaseCell();
        widget.model = new CellModel();
        expect(widget.methods).to.not.contain(method);
        widget.model.source = 'foo';
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should fire when model metadata changes', () => {
        let method = 'onMetadataChanged';
        let widget = new LogBaseCell();
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
        let widget = new LogBaseCell();
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

      it('should fulfill a promise if there is no code to execute', (done) => {
        let widget = new CodeCellWidget({ rendermime });
        let kernel = new MockKernel();
        widget.model = new CodeCellModel();
        widget.execute(kernel).then(() => { done(); });
      });

      it('should fulfill a promise if there is code to execute', (done) => {
        let widget = new CodeCellWidget({ rendermime });
        let kernel = new MockKernel();
        widget.model = new CodeCellModel();
        widget.model.source = 'foo';

        let originalCount = (widget.model).executionCount;
        widget.execute(kernel).then(() => {
          let executionCount = (widget.model).executionCount;
          expect(executionCount).to.not.equal(originalCount);
          done();
        });
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogCodeCell({ rendermime });
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, Widget.MsgUpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#onModelChanged()', () => {

      it('should fire when the model changes', () => {
        let method = 'onModelChanged';
        let widget = new LogCodeCell({ rendermime });
        expect(widget.methods).to.not.contain(method);
        widget.model = new CodeCellModel();
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should fire when model state changes', () => {
        let method = 'onModelStateChanged';
        let widget = new LogCodeCell({ rendermime });
        widget.model = new CodeCellModel();
        expect(widget.methods).to.not.contain(method);
        widget.model.source = 'foo';
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should fire when model metadata changes', () => {
        let method = 'onMetadataChanged';
        let widget = new LogCodeCell({ rendermime });
        widget.model = new CodeCellModel();
        expect(widget.methods).to.not.contain(method);
        widget.model.metadataChanged.emit({
          name: 'foo',
          oldValue: 'bar',
          newValue: 'baz'
        });
        expect(widget.methods).to.contain(method);
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

  describe('MarkdownCellWidget', () => {

    describe('#constructor()', () => {

      it('should create a markdown cell widget', () => {
        let widget = new MarkdownCellWidget({ rendermime });
        expect(widget).to.be.a(MarkdownCellWidget);
      });

      it('should accept a custom renderer', () => {
        let renderer = new LogRenderer();

        expect(renderer.methods).to.not.contain('createCellEditor');
        expect(renderer.methods).to.not.contain('createInputArea');

        let widget = new MarkdownCellWidget({ renderer, rendermime });

        expect(widget).to.be.a(MarkdownCellWidget);
        expect(renderer.methods).to.contain('createCellEditor');
        expect(renderer.methods).to.contain('createInputArea');
      });

      it('should set the default mimetype to text/x-ipythongfm', () => {
        let widget = new MarkdownCellWidget({ rendermime });
        expect(widget.mimetype).to.be('text/x-ipythongfm');
      });

    });

    describe('#rendered', () => {

      it('should default to true', (done) => {
        let widget = new MarkdownCellWidget({ rendermime });
        widget.attach(document.body);
        expect(widget.rendered).to.be(true);
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(true);
          widget.dispose();
          done();
        });
      });

      it('should unrender the widget', (done) => {
        let widget = new MarkdownCellWidget({ rendermime });
        widget.attach(document.body);
        widget.rendered = false;
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(false);
          widget.dispose();
          done();
        });
      });

      it('should ignore being set to the same value', (done) => {
        let widget = new LogMarkdownCell({ rendermime });
        widget.attach(document.body);
        widget.rendered = false;
        widget.rendered = false;
        requestAnimationFrame(() => {
          let updates = widget.methods.filter((method) => {
            return method === 'onUpdateRequest';
          });
          expect(updates).to.have.length(1);
          done();
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new MarkdownCellWidget({ rendermime });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new MarkdownCellWidget({ rendermime });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogMarkdownCell({ rendermime });
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, Widget.MsgUpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

  });

  describe('RawCellWidget', () => {

    describe('#constructor()', () => {

      it('should create a raw cell widget', () => {
        let widget = new RawCellWidget();
        expect(widget).to.be.a(RawCellWidget);
      });

    });

  });

  describe('InputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create an input area widget', () => {
        let editor = new CellEditorWidget(new CellModel());
        let widget = new InputAreaWidget(editor);
        expect(widget).to.be.an(InputAreaWidget);
      });

    });

    describe('#setPrompt()', () => {

      it('should change the value of the input prompt', () => {
        let editor = new CellEditorWidget(new CellModel());
        let widget = new InputAreaWidget(editor);
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('foo');
        expect(prompt.textContent).to.contain('foo');
      });

      it('should treat the string value "null" as special', () => {
        let editor = new CellEditorWidget(new CellModel());
        let widget = new InputAreaWidget(editor);
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('null');
        expect(prompt.textContent).to.not.contain('null');
      });

    });

  });

});
