// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel
} from '@jupyterlab/services';

import {
  Message, sendMessage
} from 'phosphor/lib/core/messaging';

import {
  Widget, WidgetMessage
} from 'phosphor/lib/ui/widget';

import {
  CodeEditorWidget
} from '../../../../lib/codeeditor';

import {
  BaseCellWidget, CellModel, InputAreaWidget, ICellModel,
  CodeCellWidget, CodeCellModel, MarkdownCellWidget,
  RawCellWidget, RawCellModel, MarkdownCellModel
} from '../../../../lib/notebook/cells';

import {
  OutputAreaWidget
} from '../../../../lib/notebook/output-area';

import {
  defaultRenderMime
} from '../../utils';

import {
  createBaseCellRenderer, createCodeCellRenderer, createCellEditor
} from '../utils';


const RENDERED_CLASS = 'jp-mod-rendered';

const PROMPT_CLASS = 'jp-Cell-prompt';

const rendermime = defaultRenderMime();


class LogBaseCell extends BaseCellWidget {

  methods: string[] = [];

  constructor() {
    super({ model: new CellModel(), renderer: createBaseCellRenderer() });
  }

  renderInput(widget: Widget): void {
    super.renderInput(widget);
    this.methods.push('renderInput');
  }

  showEditor(): void {
    super.showEditor();
    this.methods.push('showEditor');
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onMetadataChanged(model: ICellModel, args: any): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }

  protected onModelStateChanged(model: ICellModel, args: any): void {
    super.onModelStateChanged(model, args);
    this.methods.push('onModelStateChanged');
  }
}


class LogCodeCell extends CodeCellWidget {

  methods: string[] = [];

  constructor() {
    super({ model: new CodeCellModel(), renderer: createCodeCellRenderer(),
            rendermime: defaultRenderMime() });
  }

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onMetadataChanged(model: ICellModel, args: any): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }

  protected onModelStateChanged(model: ICellModel, args: any): void {
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


describe('notebook/cells/widget', () => {

  describe('BaseCellWidget', () => {

    let renderer = createBaseCellRenderer();
    let model = new CellModel();

    describe('#constructor()', () => {

      it('should create a base cell widget', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget).to.be.a(BaseCellWidget);
      });

      it('should accept a custom renderer', () => {
        renderer = createBaseCellRenderer();
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget).to.be.a(BaseCellWidget);
      });

    });

    describe('#model', () => {

      it('should be the model used by the widget', () => {
        let model = new CellModel();
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget.model).to.be(model);
      });

    });

    describe('#editorWidget', () => {

      it('should be a code editor widget', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget.editorWidget).to.be.a(CodeEditorWidget);
      });

    });

    describe('#editor', () => {

      it('should be a cell editor', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget.editor.uuid).to.be.ok();
      });

    });

    describe('#readOnly', () => {

      it('should be a boolean', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(typeof widget.readOnly).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget.readOnly).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget({
          model,
          renderer
        });
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
        let widget = new BaseCellWidget({ model, renderer });
        expect(typeof widget.trusted).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(widget.trusted).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget({ model, renderer });
        widget.trusted = true;
        expect(widget.trusted).to.be(true);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the cell editor', (done) => {
        let widget = new LogBaseCell();
        Widget.attach(widget, document.body);
        widget.activate();
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onActivateRequest');
          requestAnimationFrame(() => {
            expect(widget.editor.hasFocus()).to.be(true);
            widget.dispose();
            done();
          });
        });
      });

    });

    describe('#setPrompt()', () => {

      it('should not throw an error (full test in input area)', () => {
        let widget = new BaseCellWidget({ model, renderer });
        expect(() => { widget.setPrompt(void 0); }).to.not.throwError();
        expect(() => { widget.setPrompt(null); }).to.not.throwError();
        expect(() => { widget.setPrompt(''); }).to.not.throwError();
        expect(() => { widget.setPrompt('null'); }).to.not.throwError();
        expect(() => { widget.setPrompt('test'); }).to.not.throwError();
      });

    });

    describe('#renderInput()', () => {

      it('should render the widget', () => {
        let widget = new LogBaseCell();
        let rendered = new Widget();
        widget.renderInput(rendered);
        expect(widget.hasClass('jp-mod-rendered')).to.be(true);
      });

    });

    describe('#showEditor()', () => {

      it('should be called to show the editor', () => {
        let widget = new LogBaseCell();
        let rendered = new Widget();
        widget.renderInput(rendered);
        expect(widget.hasClass('jp-mod-rendered')).to.be(true);
        widget.showEditor();
        expect(widget.hasClass('jp-mod-rendered')).to.be(false);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new BaseCellWidget({ model, renderer });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new BaseCellWidget({ model, renderer });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should run when widget is attached', () => {
        let widget = new LogBaseCell();
        expect(widget.methods).to.not.contain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogBaseCell();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should fire when model state changes', () => {
        let method = 'onModelStateChanged';
        let widget = new LogCodeCell();
        expect(widget.methods).to.not.contain(method);
        widget.model.executionCount = 1;
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should fire when model metadata changes', () => {
        let method = 'onMetadataChanged';
        let widget = new LogBaseCell();
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
          expect(renderer).to.be.a(BaseCellWidget.Renderer);
        });

      });

      describe('#createCellEditor()', () => {

        it('should create a code editor widget', () => {
          let editor = renderer.createCellEditor(model);
          expect(editor).to.be.a(CodeEditorWidget);
        });

      });

      describe('#createInputArea()', () => {

        it('should create an input area widget', () => {
          let editor = renderer.createCellEditor(model);
          let input = renderer.createInputArea(editor);
          expect(input).to.be.an(InputAreaWidget);
        });

      });

      describe('#defaultRenderer', () => {

        it('should be a renderer', () => {
          expect(renderer).to.be.a(BaseCellWidget.Renderer);
        });

      });

    });

  });

  describe('CodeCellWidget', () => {

    let renderer = createCodeCellRenderer();
    let model = new CodeCellModel();

    describe('#constructor()', () => {

      it('should create a code cell widget', () => {
        let widget = new CodeCellWidget({ model, rendermime, renderer });
        expect(widget).to.be.a(CodeCellWidget);
      });

      it('should accept a custom renderer', () => {
        renderer = createCodeCellRenderer();
        let widget = new CodeCellWidget({ model, renderer, rendermime });
        expect(widget).to.be.a(CodeCellWidget);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CodeCellWidget({ model, rendermime, renderer });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CodeCellWidget({ model, rendermime, renderer });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#execute()', () => {

      it('should fulfill a promise if there is no code to execute', (done) => {
        let widget = new CodeCellWidget({ model, rendermime, renderer });
        Kernel.startNew().then(kernel => {
          return widget.execute(kernel).then(() => {
            kernel.shutdown();
            done();
          });
        }).catch(done);
      });

      it('should fulfill a promise if there is code to execute', (done) => {
        let widget = new CodeCellWidget({ model, rendermime, renderer });
        Kernel.startNew().then(kernel => {
          widget.model.value.text = 'foo';

          let originalCount = (widget.model).executionCount;
          return widget.execute(kernel).then(() => {
            let executionCount = (widget.model).executionCount;
            expect(executionCount).to.not.equal(originalCount);
            kernel.shutdown();
            done();
          });
        }).catch(done);
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogCodeCell();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#onModelStateChanged()', () => {

      it('should fire when model state changes', () => {
        let method = 'onModelStateChanged';
        let widget = new LogCodeCell();
        expect(widget.methods).to.not.contain(method);
        widget.model.executionCount = 1;
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should fire when model metadata changes', () => {
        let method = 'onMetadataChanged';
        let widget = new LogCodeCell();
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
          expect(renderer).to.be.a(CodeCellWidget.Renderer);
        });

      });

      describe('#createOutputArea()', () => {

        it('should create an output area widget', () => {
          let output = renderer.createOutputArea(rendermime);
          expect(output).to.be.an(OutputAreaWidget);
        });

      });

      describe('#defaultRenderer', () => {

        it('should be a renderer', () => {
          expect(renderer).to.be.a(CodeCellWidget.Renderer);
        });

      });

    });

  });

  describe('MarkdownCellWidget', () => {

    let renderer = createBaseCellRenderer();
    let model = new MarkdownCellModel();

    describe('#constructor()', () => {

      it('should create a markdown cell widget', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        expect(widget).to.be.a(MarkdownCellWidget);
      });

      it('should accept a custom renderer', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        expect(widget).to.be.a(MarkdownCellWidget);
      });

      it('should set the default mimetype to text/x-ipythongfm', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        expect(widget.model.mimeType).to.be('text/x-ipythongfm');
      });

    });

    describe('#rendered', () => {

      it('should default to true', (done) => {
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        Widget.attach(widget, document.body);
        expect(widget.rendered).to.be(true);
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(true);
          widget.dispose();
          done();
        });
      });

      it('should unrender the widget', (done) => {
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        Widget.attach(widget, document.body);
        widget.rendered = false;
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(false);
          widget.dispose();
          done();
        });
      });

      it('should ignore being set to the same value', (done) => {
        let widget = new LogMarkdownCell({ model, rendermime, renderer });
        Widget.attach(widget, document.body);
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
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, renderer });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogMarkdownCell({ model, rendermime, renderer });
        expect(widget.methods).to.not.contain('onUpdateRequest');
        sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

  });

  describe('RawCellWidget', () => {

    let renderer = createBaseCellRenderer();

    describe('#constructor()', () => {

      it('should create a raw cell widget', () => {
        let model = new RawCellModel();
        let widget = new RawCellWidget({ model, renderer });
        expect(widget).to.be.a(RawCellWidget);
      });

    });

  });

  describe('InputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create an input area widget', () => {
        let editor = createCellEditor();
        let widget = new InputAreaWidget(editor);
        expect(widget).to.be.an(InputAreaWidget);
      });

    });

    describe('#setPrompt()', () => {

      it('should change the value of the input prompt', () => {
        let editor = createCellEditor();
        let widget = new InputAreaWidget(editor);
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('foo');
        expect(prompt.textContent).to.contain('foo');
      });

      it('should treat the string value "null" as special', () => {
        let editor = createCellEditor();
        let widget = new InputAreaWidget(editor);
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('null');
        expect(prompt.textContent).to.not.contain('null');
      });

    });

  });

});
