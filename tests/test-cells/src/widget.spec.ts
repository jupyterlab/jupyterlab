// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  CodeEditor, CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import {
  Cell, CellModel, InputPrompt,
  CodeCell, CodeCellModel, MarkdownCell,
  RawCell, RawCellModel, MarkdownCellModel,
  CellFooter, CellHeader, InputArea
} from '@jupyterlab/cells';

import {
  OutputArea, OutputPrompt
} from '@jupyterlab/outputarea';

import {
  createBaseCellFactory, createCodeCellFactory, rendermime,
  editorFactory
} from '../../notebook-utils';

import {
  createClientSession
} from '../../utils';


const RENDERED_CLASS = 'jp-mod-rendered';


class LogBaseCell extends Cell {

  methods: string[] = [];

  constructor() {
    super({ model: new CellModel({}), contentFactory: createBaseCellFactory() });
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


class LogCodeCell extends CodeCell {

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


class LogMarkdownCell extends MarkdownCell {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onUpdateRequest');
  }
}


describe('cells/widget', () => {

  describe('Cell', () => {

    let contentFactory = createBaseCellFactory();
    let model = new CellModel({});

    describe('#constructor()', () => {

      it('should create a base cell widget', () => {
        let widget = new Cell({ model, contentFactory });
        expect(widget).to.be.a(Cell);
      });

      it('should accept a custom contentFactory', () => {
        contentFactory = createBaseCellFactory();
        let widget = new Cell({ model, contentFactory });
        expect(widget).to.be.a(Cell);
      });

      it('shoule accept a custom editorConfig', () => {
        let editorConfig: Partial<CodeEditor.IConfig> = {
          insertSpaces: false,
          matchBrackets: false
        };
        let widget = new Cell({ editorConfig, model, contentFactory });
        expect(widget.editor.getOption('insertSpaces')).to.be(false);
        expect(widget.editor.getOption('matchBrackets')).to.be(false);
        expect(widget.editor.getOption('lineNumbers'))
        .to.be(CodeEditor.defaultConfig.lineNumbers);
      });

    });

    describe('#model', () => {

      it('should be the model used by the widget', () => {
        let model = new CellModel({});
        let widget = new Cell({ model, contentFactory });
        expect(widget.model).to.be(model);
      });

    });

    describe('#editorWidget', () => {

      it('should be a code editor widget', () => {
        let widget = new Cell({ model, contentFactory });
        expect(widget.editorWidget).to.be.a(CodeEditorWrapper);
      });

    });

    describe('#editor', () => {

      it('should be a cell editor', () => {
        let widget = new Cell({ model, contentFactory });
        expect(widget.editor.uuid).to.be.ok();
      });

    });

    describe('#inputArea', () => {

      it('should be the input area for the cell', () => {
        let widget = new Cell({ model });
        expect(widget.inputArea).to.be.an(InputArea);
      });

    });

    describe('#readOnly', () => {

      it('should be a boolean', () => {
        let widget = new Cell({ model, contentFactory });
        expect(typeof widget.readOnly).to.be('boolean');
      });

      it('should default to false', () => {
        let widget = new Cell({ model, contentFactory });
        expect(widget.readOnly).to.be(false);
      });

      it('should be settable', () => {
        let widget = new Cell({
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

    describe('#inputCollapsed', () => {

      it('should be the view state of the input being collapsed', () => {
        let widget = new LogBaseCell();
        expect(widget.inputHidden).to.be(false);
        widget.inputHidden = true;
        expect(widget.inputHidden).to.be(true);
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
        let widget = new Cell({ model, contentFactory });
        expect(() => { widget.setPrompt(void 0); }).to.not.throwError();
        expect(() => { widget.setPrompt(null); }).to.not.throwError();
        expect(() => { widget.setPrompt(''); }).to.not.throwError();
        expect(() => { widget.setPrompt('null'); }).to.not.throwError();
        expect(() => { widget.setPrompt('test'); }).to.not.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new Cell({ model, contentFactory });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new Cell({ model, contentFactory });
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

    describe('#.defaultContentFactory', () => {

      it('should be a contentFactory', () => {
        expect(Cell.defaultContentFactory).to.be.a(Cell.ContentFactory);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a ContentFactory', () => {
          let factory = new Cell.ContentFactory({ editorFactory });
          expect(factory).to.be.a(Cell.ContentFactory);
        });

      });

      describe('#editorFactory', () => {

        it('should be the editor factory used by the content factory', () => {
          let factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.editorFactory).to.be(editorFactory);
        });

      });

      describe('#createCellHeader()', () => {

        it('should create a new cell header', () => {
          let factory = new Cell.ContentFactory();
          expect(factory.createCellHeader()).to.be.a(CellHeader);
        });

      });

      describe('#createCellFooter()', () => {

        it('should create a new cell footer', () => {
          let factory = new Cell.ContentFactory();
          expect(factory.createCellFooter()).to.be.a(CellFooter);
        });

      });

      describe('#createOutputPrompt()', () => {

        it('should create a new output prompt', () => {
          let factory = new Cell.ContentFactory();
          expect(factory.createOutputPrompt()).to.be.an(OutputPrompt);
        });

      });

      describe('#createInputPrompt()', () => {

        it('should create a new input prompt', () => {
          let factory = new Cell.ContentFactory();
          expect(factory.createInputPrompt()).to.be.an(InputPrompt);
        });

      });

    });

  });

  describe('CodeCell', () => {

    let contentFactory = createCodeCellFactory();
    let model = new CodeCellModel({});

    describe('#constructor()', () => {

      it('should create a code cell widget', () => {
        let widget = new CodeCell({ model, rendermime, contentFactory });
        expect(widget).to.be.a(CodeCell);
      });

      it('should accept a custom contentFactory', () => {
        contentFactory = createCodeCellFactory();
        let widget = new CodeCell({ model, contentFactory, rendermime });
        expect(widget).to.be.a(CodeCell);
      });

    });

    describe('#outputArea', () => {

      it('should be the output area used by the cell', () => {
        let widget = new CodeCell({ model, rendermime });
        expect(widget.outputArea).to.be.an(OutputArea);
      });

    });

    describe('#outputCollapsed', () => {

      it('should initialize from the model', () => {
        const collapsedModel = new CodeCellModel({});
        let widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputHidden).to.be(false);

        collapsedModel.metadata.set('collapsed', true);
        collapsedModel.metadata.set('jupyter', {outputs_hidden: false});
        widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputHidden).to.be(true);

        collapsedModel.metadata.set('collapsed', false);
        collapsedModel.metadata.set('jupyter', {outputs_hidden: true});
        widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputHidden).to.be(true);
      });

      it('should be the view state of the output being collapsed', () => {
        let widget = new CodeCell({ model, rendermime });
        expect(widget.outputHidden).to.be(false);
        widget.outputHidden = true;
        expect(widget.outputHidden).to.be(true);
      });

    });

    describe('#outputsScrolled', () => {

      it('should initialize from the model', () => {
        const collapsedModel = new CodeCellModel({});
        let widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputsScrolled).to.be(false);

        collapsedModel.metadata.set('scrolled', false);
        widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputsScrolled).to.be(false);

        collapsedModel.metadata.set('scrolled', 'auto');
        widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputsScrolled).to.be(false);

        collapsedModel.metadata.set('scrolled', true);
        widget = new CodeCell({ model: collapsedModel, rendermime });
        expect(widget.outputsScrolled).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = new CodeCell({ model, rendermime, contentFactory });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new CodeCell({ model, rendermime, contentFactory });
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
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

    describe('.execute()', () => {

      let session: IClientSession;

      beforeEach(() => {
        return createClientSession().then(s => {
          session = s;
          return s.initialize();
        }).then(() => {
          return session.kernel.ready;
        });
      });

      afterEach(() => {
        return session.shutdown();
      });

      it('should fulfill a promise if there is no code to execute', () => {
        let widget = new CodeCell({ model, rendermime, contentFactory });
        return CodeCell.execute(widget, session);
      });

      it('should fulfill a promise if there is code to execute', () => {
        let widget = new CodeCell({ model, rendermime, contentFactory });
        let originalCount: number;
        widget.model.value.text = 'foo';
        originalCount = (widget.model).executionCount;
        return CodeCell.execute(widget, session).then(() => {
          let executionCount = (widget.model).executionCount;
          expect(executionCount).to.not.equal(originalCount);
        });
      });

    });

  });

  describe('MarkdownCell', () => {

    let contentFactory = createBaseCellFactory();
    let model = new MarkdownCellModel({});

    describe('#constructor()', () => {

      it('should create a markdown cell widget', () => {
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
        expect(widget).to.be.a(MarkdownCell);
      });

      it('should accept a custom contentFactory', () => {
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
        expect(widget).to.be.a(MarkdownCell);
      });

      it('should set the default mimetype to text/x-ipythongfm', () => {
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
        expect(widget.model.mimeType).to.be('text/x-ipythongfm');
      });

    });

    describe('#rendered', () => {

      it('should default to true', (done) => {
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
        Widget.attach(widget, document.body);
        expect(widget.rendered).to.be(true);
        requestAnimationFrame(() => {
          expect(widget.node.classList.contains(RENDERED_CLASS)).to.be(true);
          widget.dispose();
          done();
        });
      });

      it('should unrender the widget', (done) => {
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
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
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let widget = new MarkdownCell({ model, rendermime, contentFactory });
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

  describe('RawCell', () => {

    let contentFactory = createBaseCellFactory();

    describe('#constructor()', () => {

      it('should create a raw cell widget', () => {
        let model = new RawCellModel({});
        let widget = new RawCell({ model, contentFactory });
        expect(widget).to.be.a(RawCell);
      });

    });

  });

  describe('CellHeader', () => {

    describe('#constructor()', () => {

      it('should create a new cell header', () => {
        expect(new CellHeader()).to.be.a(CellHeader);
      });

    });

  });

  describe('CellFooter', () => {

    describe('#constructor()', () => {

      it('should create a new cell footer', () => {
        expect(new CellFooter()).to.be.a(CellFooter);
      });

    });

  });

});
