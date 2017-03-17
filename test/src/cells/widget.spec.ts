// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel
} from '@jupyterlab/services';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditorWidget
} from '@jupyterlab/codeeditor';

import {
  BaseCellWidget, CellModel, InputAreaWidget,
  CodeCellWidget, CodeCellModel, MarkdownCellWidget,
  RawCellWidget, RawCellModel, MarkdownCellModel
} from '@jupyterlab/cells';

import {
  OutputAreaModel, OutputAreaWidget
} from '@jupyterlab/outputarea';

import {
  createBaseCellFactory, createCodeCellFactory, createCellEditor, rendermime,
  editorFactory
} from '../notebook/utils';


const RENDERED_CLASS = 'jp-mod-rendered';

const PROMPT_CLASS = 'jp-Cell-prompt';


class LogBaseCell extends BaseCellWidget {

  methods: string[] = [];

  constructor() {
    super({ model: new CellModel({}), contentFactory: createBaseCellFactory() });
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
}


class LogCodeCell extends CodeCellWidget {

  methods: string[] = [];

  constructor() {
    super({ model: new CodeCellModel({}),
            contentFactory: createCodeCellFactory(),
            rendermime });
  }

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onMetadataChanged(model: any, args: any): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }
}


class LogMarkdownCell extends MarkdownCellWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }
}


describe('cells/widget', () => {

  describe('BaseCellWidget', () => {

    let contentFactory = createBaseCellFactory();
    let model = new CellModel({});

    describe('#constructor()', () => {

      it('should create a base cell widget', () => {
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(widget).to.be.a(BaseCellWidget);
      });

      it('should accept a custom contentFactory', () => {
        contentFactory = createBaseCellFactory();
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(widget).to.be.a(BaseCellWidget);
      });

    });

    describe('#model', () => {

      it('should be the model used by the widget', () => {
        let model = new CellModel({});
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(widget.model).to.be(model);
      });

    });

    describe('#editorWidget', () => {

      it('should be a code editor widget', () => {
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(widget.editorWidget).to.be.a(CodeEditorWidget);
      });

    });

    describe('#editor', () => {

      it('should be a cell editor', () => {
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(widget.editor.uuid).to.be.ok();
      });

    });

    describe('#readOnly', () => {

      it('should be a boolean', () => {
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(typeof widget.readOnly).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new BaseCellWidget({ model, contentFactory });
        expect(widget.readOnly).to.be(false);
      });

      it('should be settable', () => {
        let widget = new BaseCellWidget({
          model,
          contentFactory
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
        let widget = new BaseCellWidget({ model, contentFactory });
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
        let widget = new BaseCellWidget({ model, contentFactory });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new BaseCellWidget({ model, contentFactory });
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
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#contentFactory', () => {

      it('should be a contentFactory', () => {
        expect(contentFactory).to.be.a(BaseCellWidget.ContentFactory);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a ContentFactory', () => {
          let factory = new BaseCellWidget.ContentFactory({ editorFactory });
          expect(factory).to.be.a(BaseCellWidget.ContentFactory);
        });

      });

      describe('#editorFactory', () => {

        it('should be the editor factory used by the content factory', () => {
          let factory = new BaseCellWidget.ContentFactory({ editorFactory });
          expect(factory.editorFactory).to.be(editorFactory);
        });

      });

      describe('#createCellEditor()', () => {

        it('should create a code editor widget', () => {
          let factory = new BaseCellWidget.ContentFactory({ editorFactory });
          let editor = factory.createCellEditor({
            model,
            factory: editorFactory
          });
          expect(editor).to.be.a(CodeEditorWidget);
        });

      });

      describe('#createInputArea()', () => {

        it('should create an input area widget', () => {
          let factory = new BaseCellWidget.ContentFactory({ editorFactory });
          let editor = factory.createCellEditor({
            model,
            factory: editorFactory });
          let input = contentFactory.createInputArea({ editor });
          expect(input).to.be.an(InputAreaWidget);
        });

      });

    });

  });

  describe('CodeCellWidget', () => {

    let contentFactory = createCodeCellFactory();
    let model = new CodeCellModel({});

    describe('#constructor()', () => {

      it('should create a code cell widget', () => {
        let widget = new CodeCellWidget({ model, rendermime, contentFactory });
        expect(widget).to.be.a(CodeCellWidget);
      });

      it('should accept a custom contentFactory', () => {
        contentFactory = createCodeCellFactory();
        let widget = new CodeCellWidget({ model, contentFactory, rendermime });
        expect(widget).to.be.a(CodeCellWidget);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CodeCellWidget({ model, rendermime, contentFactory });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CodeCellWidget({ model, rendermime, contentFactory });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#execute()', () => {

      it('should fulfill a promise if there is no code to execute', () => {
        let widget = new CodeCellWidget({ model, rendermime, contentFactory });
        let kernel: Kernel.IKernel;
        return Kernel.startNew().then(k => {
          kernel = k;
          return kernel.ready;
        }).then(() => {
          return widget.execute(kernel);
        }).then(() => {
          return kernel.shutdown();
        });
      });

      it('should fulfill a promise if there is code to execute', () => {
        let widget = new CodeCellWidget({ model, rendermime, contentFactory });
        let kernel: Kernel.IKernel;
        let originalCount: number;
        return Kernel.startNew().then(k => {
          kernel = k;
          return kernel.ready;
        }).then(() => {
          widget.model.value.text = 'foo';
          originalCount = (widget.model).executionCount;
          return widget.execute(kernel);
        }).then(() => {
          let executionCount = (widget.model).executionCount;
          expect(executionCount).to.not.equal(originalCount);
          return kernel.shutdown();
        });
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogCodeCell();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should fire when model metadata changes', () => {
        let method = 'onMetadataChanged';
        let widget = new LogCodeCell();
        expect(widget.methods).to.not.contain(method);
        widget.model.metadata.set('foo', 1);
        expect(widget.methods).to.contain(method);
      });

    });

    describe('#contentFactory', () => {

      it('should be a ContentFactory', () => {
        expect(contentFactory).to.be.a(CodeCellWidget.ContentFactory);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a ContentFactory', () => {
          let factory = new CodeCellWidget.ContentFactory({ editorFactory });
          expect(factory).to.be.a(CodeCellWidget.ContentFactory);
          expect(factory).to.be.a(BaseCellWidget.ContentFactory);
        });

      });

      describe('#createOutputArea()', () => {

        it('should create an output area widget', () => {
          let factory = new CodeCellWidget.ContentFactory({ editorFactory });
          let model = new OutputAreaModel();
          let output = factory.createOutputArea({
            model,
            rendermime,
            contentFactory: OutputAreaWidget.defaultContentFactory
          });
          expect(output).to.be.an(OutputAreaWidget);
        });

      });

    });

  });

  describe('MarkdownCellWidget', () => {

    let contentFactory = createBaseCellFactory();
    let model = new MarkdownCellModel({});

    describe('#constructor()', () => {

      it('should create a markdown cell widget', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        expect(widget).to.be.a(MarkdownCellWidget);
      });

      it('should accept a custom contentFactory', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        expect(widget).to.be.a(MarkdownCellWidget);
      });

      it('should set the default mimetype to text/x-ipythongfm', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        expect(widget.model.mimeType).to.be('text/x-ipythongfm');
      });

    });

    describe('#rendered', () => {

      it('should default to true', (done) => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        Widget.attach(widget, document.body);
        expect(widget.rendered).to.be(true);
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(true);
          widget.dispose();
          done();
        });
      });

      it('should unrender the widget', (done) => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        Widget.attach(widget, document.body);
        widget.rendered = false;
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(false);
          widget.dispose();
          done();
        });
      });

      it('should ignore being set to the same value', (done) => {
        let widget = new LogMarkdownCell({ model, rendermime, contentFactory });
        Widget.attach(widget, document.body);
        widget.rendered = false;
        widget.rendered = false;
        requestAnimationFrame(() => {
          let updates = widget.methods.filter((method) => {
            return method === 'onUpdateRequest';
          });
          expect(updates).to.have.length(1);
          widget.dispose();
          done();
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new MarkdownCellWidget({ model, rendermime, contentFactory });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should update the widget', () => {
        let widget = new LogMarkdownCell({ model, rendermime, contentFactory });
        expect(widget.methods).to.not.contain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });

    });

  });

  describe('RawCellWidget', () => {

    let contentFactory = createBaseCellFactory();

    describe('#constructor()', () => {

      it('should create a raw cell widget', () => {
        let model = new RawCellModel({});
        let widget = new RawCellWidget({ model, contentFactory });
        expect(widget).to.be.a(RawCellWidget);
      });

    });

  });

  describe('InputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should create an input area widget', () => {
        let editor = createCellEditor();
        let widget = new InputAreaWidget({ editor });
        expect(widget).to.be.an(InputAreaWidget);
      });

    });

    describe('#setPrompt()', () => {

      it('should change the value of the input prompt', () => {
        let editor = createCellEditor();
        let widget = new InputAreaWidget({ editor });
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('foo');
        expect(prompt.textContent).to.contain('foo');
      });

      it('should treat the string value "null" as special', () => {
        let editor = createCellEditor();
        let widget = new InputAreaWidget({ editor });
        let prompt = widget.node.querySelector(`.${PROMPT_CLASS}`);
        expect(prompt.textContent).to.be.empty();
        widget.setPrompt('null');
        expect(prompt.textContent).to.not.contain('null');
      });

    });

  });

});
