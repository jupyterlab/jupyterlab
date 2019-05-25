// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Message, MessageLoop } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { ClientSession, IClientSession } from '@jupyterlab/apputils';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import {
  Cell,
  CellModel,
  InputPrompt,
  CodeCell,
  CodeCellModel,
  MarkdownCell,
  RawCell,
  RawCellModel,
  MarkdownCellModel,
  CellFooter,
  CellHeader,
  InputArea
} from '@jupyterlab/cells';

import { OutputArea, OutputPrompt } from '@jupyterlab/outputarea';

import {
  createClientSession,
  framePromise,
  NBTestUtils
} from '@jupyterlab/testutils';

const RENDERED_CLASS = 'jp-mod-rendered';
const rendermime = NBTestUtils.defaultRenderMime();

class LogBaseCell extends Cell {
  methods: string[] = [];

  constructor() {
    super({
      model: new CellModel({}),
      contentFactory: NBTestUtils.createBaseCellFactory()
    });
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
    super({
      model: new CodeCellModel({}),
      contentFactory: NBTestUtils.createCodeCellFactory(),
      rendermime
    });
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
  const editorFactory = NBTestUtils.editorFactory;

  describe('Cell', () => {
    const contentFactory = NBTestUtils.createBaseCellFactory();
    const model = new CellModel({});

    describe('#constructor()', () => {
      it('should create a base cell widget', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget).to.be.an.instanceof(Cell);
      });

      it('should accept a custom contentFactory', () => {
        const contentFactory = NBTestUtils.createBaseCellFactory();
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget).to.be.an.instanceof(Cell);
      });

      it('shoule accept a custom editorConfig', () => {
        const editorConfig: Partial<CodeEditor.IConfig> = {
          insertSpaces: false,
          matchBrackets: false
        };
        const widget = new Cell({
          editorConfig,
          model,
          contentFactory
        }).initializeState();
        expect(widget.editor.getOption('insertSpaces')).to.equal(false);
        expect(widget.editor.getOption('matchBrackets')).to.equal(false);
        expect(widget.editor.getOption('lineNumbers')).to.equal(
          CodeEditor.defaultConfig.lineNumbers
        );
      });
    });

    describe('#model', () => {
      it('should be the model used by the widget', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.model).to.equal(model);
      });
    });

    describe('#editorWidget', () => {
      it('should be a code editor widget', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.editorWidget).to.be.an.instanceof(CodeEditorWrapper);
      });
    });

    describe('#editor', () => {
      it('should be a cell editor', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.editor.uuid).to.be.ok;
      });
    });

    describe('#inputArea', () => {
      it('should be the input area for the cell', () => {
        const widget = new Cell({ model }).initializeState();
        expect(widget.inputArea).to.be.an.instanceof(InputArea);
      });
    });

    describe('#readOnly', () => {
      it('should be a boolean', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(typeof widget.readOnly).to.equal('boolean');
      });

      it('should default to false', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.readOnly).to.equal(false);
      });

      it('should be settable', () => {
        const widget = new Cell({
          model,
          contentFactory
        }).initializeState();
        widget.readOnly = true;
        expect(widget.readOnly).to.equal(true);
      });

      it('should ignore being set to the same value', async () => {
        const widget = new LogBaseCell().initializeState();
        widget.readOnly = true;
        widget.readOnly = true;
        await framePromise();
        expect(widget.methods).to.deep.equal(['onUpdateRequest']);
      });

      it('should reflect model metadata', () => {
        model.metadata.set('editable', false);

        const widget = new Cell({
          model,
          contentFactory
        }).initializeState();
        expect(widget.readOnly).to.equal(true);
      });
    });

    describe('#inputCollapsed', () => {
      it('should be the view state of the input being collapsed', () => {
        const widget = new LogBaseCell().initializeState();
        expect(widget.inputHidden).to.equal(false);
        widget.inputHidden = true;
        expect(widget.inputHidden).to.equal(true);
      });
    });

    describe('#loadEditableState()', () => {
      it('should load the editable state from the model', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.readOnly).to.equal(false);

        model.metadata.set('editable', false);
        widget.loadEditableState();
        expect(widget.readOnly).to.equal(true);

        model.metadata.set('editable', true);
        widget.loadEditableState();
        expect(widget.readOnly).to.equal(false);
      });
    });

    describe('#saveEditableState()', () => {
      it('should save the editable state to the model', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.readOnly).to.equal(false);

        widget.readOnly = true;
        widget.saveEditableState();
        expect(model.metadata.get('editable')).to.equal(false);

        widget.readOnly = false;
        widget.saveEditableState();
        // Default values are not saved explicitly
        expect(model.metadata.get('editable')).to.equal(undefined);
      });
    });

    describe('#syncEditable', () => {
      it('should control automatic syncing of editable state with model', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.syncEditable).to.equal(false);
        expect(widget.readOnly).to.equal(false);

        // Not synced if setting widget attribute
        widget.readOnly = true;
        expect(model.metadata.get('editable')).to.equal(undefined);

        // Not synced if setting metadata attribute
        model.metadata.set('editable', true);
        expect(widget.readOnly).to.equal(true);

        widget.syncEditable = true;

        // Setting sync does an initial sync from model to view. This also sets
        // the metadata to undefined if it is the default value.
        expect(model.metadata.get('editable')).to.equal(undefined);
        expect(widget.readOnly).to.equal(false);

        // Synced if setting widget attribute
        widget.readOnly = true;
        expect(model.metadata.get('editable')).to.equal(false);

        // Synced if setting metadata attribute
        model.metadata.set('editable', true);
        expect(widget.readOnly).to.equal(false);
      });
    });

    describe('#loadCollapseState()', () => {
      it('should load the input collapse state from the model', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.inputHidden).to.equal(false);

        model.metadata.set('jupyter', { source_hidden: true });
        widget.loadCollapseState();
        expect(widget.inputHidden).to.equal(true);

        model.metadata.set('jupyter', { source_hidden: false });
        widget.loadCollapseState();
        expect(widget.inputHidden).to.equal(false);
      });
    });

    describe('#saveCollapseState()', () => {
      it('should save the collapse state to the model', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.inputHidden).to.equal(false);

        widget.inputHidden = true;
        widget.saveCollapseState();
        expect(model.metadata.get('jupyter')).to.deep.equal({
          source_hidden: true
        });

        widget.inputHidden = false;
        widget.saveCollapseState();
        // Default values are not saved explicitly
        expect(model.metadata.get('jupyter')).to.equal(undefined);
      });
    });

    describe('#syncCollapse', () => {
      it('should control automatic syncing of collapse state with model', () => {
        const model = new CellModel({});
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget.syncCollapse).to.equal(false);
        expect(widget.inputHidden).to.equal(false);

        // Not synced if setting widget attribute
        widget.inputHidden = true;
        expect(model.metadata.get('jupyter')).to.equal(undefined);

        // Not synced if setting metadata attribute
        model.metadata.set('jupyter', { source_hidden: false });
        expect(widget.inputHidden).to.equal(true);

        widget.syncCollapse = true;

        // Setting sync does an initial sync from model to view. This also sets
        // the metadata to undefined if it is the default value.
        expect(model.metadata.get('jupyter')).to.equal(undefined);
        expect(widget.inputHidden).to.equal(false);

        // Synced if setting widget attribute
        widget.inputHidden = true;
        expect(model.metadata.get('jupyter')).to.deep.equal({
          source_hidden: true
        });

        // Synced if setting metadata attribute
        model.metadata.set('jupyter', {});
        expect(widget.inputHidden).to.equal(false);
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus the cell editor', async () => {
        const widget = new LogBaseCell().initializeState();
        Widget.attach(widget, document.body);
        widget.activate();
        await framePromise();
        expect(widget.methods).to.contain('onActivateRequest');
        await framePromise();
        expect(widget.editor.hasFocus()).to.equal(true);
        widget.dispose();
      });
    });

    describe('#setPrompt()', () => {
      it('should not throw an error (full test in input area)', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(() => {
          widget.setPrompt(void 0);
        }).to.not.throw;
        expect(() => {
          widget.setPrompt(null);
        }).to.not.throw();
        expect(() => {
          widget.setPrompt('');
        }).to.not.throw();
        expect(() => {
          widget.setPrompt('null');
        }).to.not.throw();
        expect(() => {
          widget.setPrompt('test');
        }).to.not.throw();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new Cell({ model, contentFactory }).initializeState();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#onAfterAttach()', () => {
      it('should run when widget is attached', () => {
        const widget = new LogBaseCell().initializeState();
        expect(widget.methods).to.not.contain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        widget.dispose();
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should update the widget', () => {
        const widget = new LogBaseCell().initializeState();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });

    describe('#.defaultContentFactory', () => {
      it('should be a contentFactory', () => {
        expect(Cell.defaultContentFactory).to.be.an.instanceof(
          Cell.ContentFactory
        );
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a ContentFactory', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory).to.be.an.instanceof(Cell.ContentFactory);
        });
      });

      describe('#editorFactory', () => {
        it('should be the editor factory used by the content factory', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.editorFactory).to.equal(editorFactory);
        });
      });

      describe('#createCellHeader()', () => {
        it('should create a new cell header', () => {
          const factory = new Cell.ContentFactory();
          expect(factory.createCellHeader()).to.be.an.instanceof(CellHeader);
        });
      });

      describe('#createCellFooter()', () => {
        it('should create a new cell footer', () => {
          const factory = new Cell.ContentFactory();
          expect(factory.createCellFooter()).to.be.an.instanceof(CellFooter);
        });
      });

      describe('#createOutputPrompt()', () => {
        it('should create a new output prompt', () => {
          const factory = new Cell.ContentFactory();
          expect(factory.createOutputPrompt()).to.be.an.instanceof(
            OutputPrompt
          );
        });
      });

      describe('#createInputPrompt()', () => {
        it('should create a new input prompt', () => {
          const factory = new Cell.ContentFactory();
          expect(factory.createInputPrompt()).to.be.an.instanceof(InputPrompt);
        });
      });
    });
  });

  describe('CodeCell', () => {
    const contentFactory = NBTestUtils.createCodeCellFactory();
    const model = new CodeCellModel({});

    describe('#constructor()', () => {
      it('should create a code cell widget', () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        expect(widget).to.be.an.instanceof(CodeCell);
      });

      it('should accept a custom contentFactory', () => {
        const contentFactory = NBTestUtils.createCodeCellFactory();
        const widget = new CodeCell({ model, contentFactory, rendermime });
        widget.initializeState();
        expect(widget).to.be.an.instanceof(CodeCell);
      });
    });

    describe('#outputArea', () => {
      it('should be the output area used by the cell', () => {
        const widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputArea).to.be.an.instanceof(OutputArea);
      });
    });

    describe('#outputCollapsed', () => {
      it('should initialize from the model', () => {
        const collapsedModel = new CodeCellModel({});
        let widget = new CodeCell({ model: collapsedModel, rendermime });
        widget.initializeState();
        expect(widget.outputHidden).to.equal(false);

        collapsedModel.metadata.set('collapsed', true);
        widget = new CodeCell({ model: collapsedModel, rendermime });
        widget.initializeState();
        expect(widget.outputHidden).to.equal(true);

        collapsedModel.metadata.delete('collapsed');
        collapsedModel.metadata.set('jupyter', { outputs_hidden: true });
        widget = new CodeCell({ model: collapsedModel, rendermime });
        widget.initializeState();
        expect(widget.outputHidden).to.equal(true);
      });

      it('should be the view state of the output being collapsed', () => {
        const widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputHidden).to.equal(false);
        widget.outputHidden = true;
        expect(widget.outputHidden).to.equal(true);
      });
    });

    describe('#outputsScrolled', () => {
      it('should initialize from the model', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputsScrolled).to.equal(false);

        model.metadata.set('scrolled', false);
        widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputsScrolled).to.equal(false);

        model.metadata.set('scrolled', 'auto');
        widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputsScrolled).to.equal(false);

        model.metadata.set('scrolled', true);
        widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputsScrolled).to.equal(true);
      });
    });

    describe('#loadScrolledState()', () => {
      it('should load the output scrolled state from the model', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputsScrolled).to.equal(false);

        model.metadata.set('scrolled', true);
        widget.loadScrolledState();
        expect(widget.outputsScrolled).to.equal(true);

        model.metadata.set('scrolled', false);
        widget.loadScrolledState();
        expect(widget.outputsScrolled).to.equal(false);
      });
    });

    describe('#saveScrolledState()', () => {
      it('should save the collapse state to the model', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputsScrolled).to.equal(false);

        widget.outputsScrolled = true;
        widget.saveScrolledState();
        expect(model.metadata.get('scrolled')).to.equal(true);

        widget.outputsScrolled = false;
        widget.saveScrolledState();
        // Default values are not saved explicitly
        expect(model.metadata.get('scrolled')).to.equal(undefined);
      });
    });

    describe('#syncScrolled', () => {
      it('should control automatic syncing of scrolled state with model', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.syncScrolled).to.equal(false);
        expect(widget.outputsScrolled).to.equal(false);

        // Not synced if setting widget attribute
        widget.outputsScrolled = true;
        expect(model.metadata.get('scrolled')).to.equal(undefined);

        // Not synced if setting metadata attribute
        model.metadata.set('scrolled', false);
        expect(widget.outputsScrolled).to.equal(true);

        widget.syncScrolled = true;

        // Setting sync does an initial sync from model to view. This also sets
        // the metadata to undefined if it is the default value.
        expect(model.metadata.get('scrolled')).to.equal(undefined);
        expect(widget.outputsScrolled).to.equal(false);

        // Synced if setting widget attribute
        widget.outputsScrolled = true;
        expect(model.metadata.get('scrolled')).to.equal(true);

        // Synced if setting metadata attribute
        model.metadata.set('scrolled', false);
        expect(widget.outputsScrolled).to.equal(false);
      });
    });

    describe('#loadCollapseState()', () => {
      it('should load the output collapse state from the model', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        widget.loadCollapseState();
        expect(widget.outputHidden).to.equal(false);

        model.metadata.set('collapsed', true);
        widget.loadCollapseState();
        expect(widget.outputHidden).to.equal(true);

        model.metadata.set('collapsed', false);
        widget.loadCollapseState();
        expect(widget.outputHidden).to.equal(false);
      });
    });

    describe('#saveCollapseState()', () => {
      it('should save the collapse state to the model `collapsed` metadata', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.outputHidden).to.equal(false);

        widget.outputHidden = true;
        widget.saveCollapseState();
        expect(model.metadata.get('collapsed')).to.equal(true);

        // Default values are not saved explicitly
        widget.outputHidden = false;
        widget.saveCollapseState();
        expect(model.metadata.get('collapsed')).to.equal(undefined);

        // Default values are explicitly deleted
        model.metadata.set('collapsed', false);
        widget.outputHidden = false;
        widget.saveCollapseState();
        expect(model.metadata.get('collapsed')).to.equal(undefined);
      });
    });

    describe('#syncCollapse', () => {
      it('should control automatic syncing of collapse state with model', () => {
        const model = new CodeCellModel({});
        let widget = new CodeCell({ model, rendermime });
        widget.initializeState();
        expect(widget.syncCollapse).to.equal(false);
        expect(widget.outputHidden).to.equal(false);

        // Not synced if setting widget attribute
        widget.outputHidden = true;
        expect(model.metadata.get('collapsed')).to.equal(undefined);

        // Not synced if setting metadata attribute
        model.metadata.set('collapsed', false);
        expect(widget.outputHidden).to.equal(true);

        widget.syncCollapse = true;

        // Setting sync does an initial sync from model to view.
        expect(model.metadata.get('collapsed')).to.equal(undefined);
        expect(widget.outputHidden).to.equal(false);

        // Synced if setting widget attribute
        widget.outputHidden = true;
        expect(model.metadata.get('collapsed')).to.equal(true);

        // Synced if setting metadata attribute
        model.metadata.set('collapsed', false);
        expect(widget.outputHidden).to.equal(false);

        // Synced if deleting collapsed metadata attribute
        widget.outputHidden = true;
        expect(model.metadata.get('collapsed')).to.equal(true);
        model.metadata.delete('collapsed');
        expect(widget.outputHidden).to.equal(false);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should update the widget', () => {
        const widget = new LogCodeCell().initializeState();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });

    describe('#onMetadataChanged()', () => {
      it('should fire when model metadata changes', () => {
        const method = 'onMetadataChanged';
        const widget = new LogCodeCell().initializeState();
        expect(widget.methods).to.not.contain(method);
        widget.model.metadata.set('foo', 1);
        expect(widget.methods).to.contain(method);
      });
    });

    describe('.execute()', () => {
      let session: IClientSession;

      beforeEach(async () => {
        session = await createClientSession();
        await (session as ClientSession).initialize();
        await session.kernel.ready;
      });

      afterEach(() => {
        return session.shutdown();
      });

      it('should fulfill a promise if there is no code to execute', async () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        try {
          await CodeCell.execute(widget, session);
        } catch (error) {
          throw error;
        }
      });

      it('should fulfill a promise if there is code to execute', async () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        let originalCount: number;
        widget.model.value.text = 'foo';
        originalCount = widget.model.executionCount;
        await CodeCell.execute(widget, session);
        const executionCount = widget.model.executionCount;
        expect(executionCount).to.not.equal(originalCount);
      });

      it('should set the cell prompt properly while executing', async () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.model.value.text = 'foo';
        const future1 = CodeCell.execute(widget, session).catch(() => {
          /* no-op */
        });
        expect(widget.promptNode.textContent).to.equal('[*]:');
        const future2 = CodeCell.execute(widget, session);
        expect(widget.promptNode.textContent).to.equal('[*]:');
        await framePromise();
        expect(widget.promptNode.textContent).to.equal('[*]:');

        await future1;
        let msg = await future2;
        expect(widget.promptNode.textContent).to.equal(
          `[${msg.content.execution_count}]:`
        );
      });
    });
  });

  describe('MarkdownCell', () => {
    const contentFactory = NBTestUtils.createBaseCellFactory();
    const model = new MarkdownCellModel({});

    describe('#constructor()', () => {
      it('should create a markdown cell widget', () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        expect(widget).to.be.an.instanceof(MarkdownCell);
      });

      it('should accept a custom contentFactory', () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        expect(widget).to.be.an.instanceof(MarkdownCell);
      });

      it('should set the default mimetype to text/x-ipythongfm', () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        expect(widget.model.mimeType).to.equal('text/x-ipythongfm');
      });
    });

    describe('#rendered', () => {
      it('should default to true', async () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        Widget.attach(widget, document.body);
        expect(widget.rendered).to.equal(true);
        await framePromise();
        expect(widget.node.classList.contains(RENDERED_CLASS)).to.equal(true);
      });

      it('should unrender the widget', async () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        Widget.attach(widget, document.body);
        widget.rendered = false;
        await framePromise();
        expect(widget.node.classList.contains(RENDERED_CLASS)).to.equal(false);
        widget.dispose();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new MarkdownCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should update the widget', () => {
        const widget = new LogMarkdownCell({
          model,
          rendermime,
          contentFactory
        }).initializeState();
        expect(widget.methods).to.not.contain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
      });
    });
  });

  describe('RawCell', () => {
    const contentFactory = NBTestUtils.createBaseCellFactory();

    describe('#constructor()', () => {
      it('should create a raw cell widget', () => {
        const model = new RawCellModel({});
        const widget = new RawCell({ model, contentFactory }).initializeState();
        expect(widget).to.be.an.instanceof(RawCell);
      });
    });
  });

  describe('CellHeader', () => {
    describe('#constructor()', () => {
      it('should create a new cell header', () => {
        expect(new CellHeader()).to.be.an.instanceof(CellHeader);
      });
    });
  });

  describe('CellFooter', () => {
    describe('#constructor()', () => {
      it('should create a new cell footer', () => {
        expect(new CellFooter()).to.be.an.instanceof(CellFooter);
      });
    });
  });
});
