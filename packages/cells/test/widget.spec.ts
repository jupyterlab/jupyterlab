// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { createStandaloneCell, YCodeCell, YMarkdownCell } from '@jupyter/ydoc';
import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import {
  Cell,
  CellFooter,
  CellHeader,
  CellModel,
  CodeCell,
  CodeCellModel,
  InputArea,
  InputPrompt,
  MarkdownCell,
  MarkdownCellModel,
  RawCell,
  RawCellModel
} from '@jupyterlab/cells';
import { NBTestUtils } from '@jupyterlab/cells/lib/testutils';
import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { OutputArea, OutputPrompt } from '@jupyterlab/outputarea';
import { defaultRenderMime } from '@jupyterlab/rendermime/lib/testutils';
import { IExecuteReplyMsg } from '@jupyterlab/services/lib/kernel/messages';
import {
  framePromise,
  JupyterServer,
  signalToPromise
} from '@jupyterlab/testing';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

const RENDERED_CLASS = 'jp-mod-rendered';
const rendermime = defaultRenderMime();

class TestModel extends CellModel {
  get type(): 'raw' {
    return 'raw';
  }
}

class LogBaseCell extends Cell {
  methods: string[] = [];

  constructor() {
    super({
      contentFactory: NBTestUtils.createBaseCellFactory(),
      model: new TestModel({
        sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
      }),
      placeholder: false
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
      contentFactory: NBTestUtils.createCodeCellFactory(),
      model: new CodeCellModel(),
      rendermime,
      placeholder: false
    });
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
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
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}

describe('cells/widget', () => {
  const editorFactory = NBTestUtils.editorFactory;

  describe('Cell', () => {
    const model = new TestModel({
      sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
    });

    describe('#constructor()', () => {
      it('should create a base cell widget', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model
        }).initializeState();
        expect(widget).toBeInstanceOf(Cell);
      });

      it('should accept a custom contentFactory', () => {
        const contentFactory = NBTestUtils.createBaseCellFactory();
        const widget = new Cell({ model, contentFactory }).initializeState();
        expect(widget).toBeInstanceOf(Cell);
      });

      it('should accept a custom editorConfig', () => {
        const editorConfig: Record<string, any> = {
          matchBrackets: false
        };
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          editorConfig,
          model,
          placeholder: false
        }).initializeState();
        expect(widget.editor!.getOption('matchBrackets')).toEqual(false);
      });
    });

    describe('#model', () => {
      it('should be the model used by the widget', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.model).toEqual(model);
      });
    });

    describe('#editorWidget', () => {
      it('should be a code editor widget', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.editorWidget).toBeInstanceOf(CodeEditorWrapper);
      });
    });

    describe('#editor', () => {
      it('should be a cell editor', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.editor!.uuid).toBeTruthy();
      });
    });

    describe('#inputArea', () => {
      it('should be the input area for the cell', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.inputArea).toBeInstanceOf(InputArea);
      });
    });

    describe('#readOnly', () => {
      it('should be a boolean', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(typeof widget.readOnly).toEqual('boolean');
      });

      it('should default to false', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.readOnly).toEqual(false);
      });

      it('should be settable', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model
        }).initializeState();
        widget.readOnly = true;
        expect(widget.readOnly).toEqual(true);
      });

      it('should ignore being set to the same value', async () => {
        const widget = new LogBaseCell().initializeState();
        widget.readOnly = true;
        widget.readOnly = true;
        await framePromise();
        expect(widget.methods).toEqual(['onUpdateRequest']);
      });

      it('should reflect model metadata', () => {
        model.setMetadata('editable', false);

        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.readOnly).toEqual(true);
      });
    });

    describe('#inputCollapsed', () => {
      it('should be the view state of the input being collapsed', () => {
        const widget = new LogBaseCell().initializeState();
        expect(widget.inputHidden).toEqual(false);
        widget.inputHidden = true;
        expect(widget.inputHidden).toEqual(true);
      });
    });

    describe('#loadEditableState()', () => {
      it('should load the editable state from the model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model
        }).initializeState();
        expect(widget.readOnly).toEqual(false);

        model.setMetadata('editable', false);
        widget.loadEditableState();
        expect(widget.readOnly).toEqual(true);

        model.setMetadata('editable', true);
        widget.loadEditableState();
        expect(widget.readOnly).toEqual(false);
      });
    });

    describe('#saveEditableState()', () => {
      it('should save the editable state to the model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.readOnly).toEqual(false);

        widget.readOnly = true;
        widget.saveEditableState();
        expect(model.getMetadata('editable')).toEqual(false);

        widget.readOnly = false;
        widget.saveEditableState();
        // Default values are not saved explicitly
        expect(model.getMetadata('editable')).toEqual(undefined);
      });
    });

    describe('#syncEditable', () => {
      it('should control automatic syncing of editable state with model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.syncEditable).toEqual(false);
        expect(widget.readOnly).toEqual(false);

        // Not synced if setting widget attribute
        widget.readOnly = true;
        expect(model.getMetadata('editable')).toEqual(undefined);

        // Not synced if setting metadata attribute
        model.setMetadata('editable', true);
        expect(widget.readOnly).toEqual(true);

        widget.syncEditable = true;

        // Setting sync does an initial sync from model to view. This also sets
        // the metadata to undefined if it is the default value.
        expect(model.getMetadata('editable')).toEqual(undefined);
        expect(widget.readOnly).toEqual(false);

        // Synced if setting widget attribute
        widget.readOnly = true;
        expect(model.getMetadata('editable')).toEqual(false);

        // Synced if setting metadata attribute
        model.setMetadata('editable', true);
        expect(widget.readOnly).toEqual(false);
      });
    });

    describe('#loadCollapseState()', () => {
      it('should load the input collapse state from the model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.inputHidden).toEqual(false);

        model.setMetadata('jupyter', { source_hidden: true });
        widget.loadCollapseState();
        expect(widget.inputHidden).toEqual(true);

        model.setMetadata('jupyter', { source_hidden: false });
        widget.loadCollapseState();
        expect(widget.inputHidden).toEqual(false);
      });
    });

    describe('#saveCollapseState()', () => {
      it('should save the collapse state to the model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.inputHidden).toEqual(false);

        widget.inputHidden = true;
        widget.saveCollapseState();
        expect(model.getMetadata('jupyter')).toEqual({
          source_hidden: true
        });

        widget.inputHidden = false;
        widget.saveCollapseState();
        // Default values are not saved explicitly
        expect(model.getMetadata('jupyter')).toEqual(undefined);
      });
    });

    describe('#syncCollapse', () => {
      it('should control automatic syncing of collapse state with model', () => {
        const model = new TestModel({
          sharedModel: createStandaloneCell({ cell_type: 'code' }) as YCodeCell
        });
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model,
          placeholder: false
        }).initializeState();
        expect(widget.syncCollapse).toEqual(false);
        expect(widget.inputHidden).toEqual(false);

        // Not synced if setting widget attribute
        widget.inputHidden = true;
        expect(model.getMetadata('jupyter')).toEqual(undefined);

        // Not synced if setting metadata attribute
        model.setMetadata('jupyter', { source_hidden: false });
        expect(widget.inputHidden).toEqual(true);

        widget.syncCollapse = true;

        // Setting sync does an initial sync from model to view. This also sets
        // the metadata to undefined if it is the default value.
        expect(model.getMetadata('jupyter')).toEqual(undefined);
        expect(widget.inputHidden).toEqual(false);

        // Synced if setting widget attribute
        widget.inputHidden = true;
        expect(model.getMetadata('jupyter')).toEqual({
          source_hidden: true
        });

        // Synced if setting metadata attribute
        model.setMetadata('jupyter', {});
        expect(widget.inputHidden).toEqual(false);
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus the cell editor', async () => {
        const widget = new LogBaseCell().initializeState();
        Widget.attach(widget, document.body);
        widget.activate();
        await framePromise();
        expect(widget.methods).toContain('onActivateRequest');
        await framePromise();
        expect(widget.editor!.hasFocus()).toEqual(true);
        widget.dispose();
      });
    });

    describe('#setPrompt()', () => {
      it('should not throw an error (full test in input area)', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model
        }).initializeState();
        expect(() => {
          widget.setPrompt('');
        }).not.toThrow();
        expect(() => {
          widget.setPrompt('null');
        }).not.toThrow();
        expect(() => {
          widget.setPrompt('test');
        }).not.toThrow();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model
        }).initializeState();
        widget.dispose();
        expect(widget.isDisposed).toEqual(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new Cell({
          contentFactory: NBTestUtils.createBaseCellFactory(),
          model
        }).initializeState();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toEqual(true);
      });
    });

    describe('#onAfterAttach()', () => {
      it('should run when widget is attached', () => {
        const widget = new LogBaseCell().initializeState();
        expect(widget.methods).not.toContain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).toContain('onAfterAttach');
        widget.dispose();
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should update the widget', () => {
        const widget = new LogBaseCell().initializeState();
        expect(widget.methods).not.toContain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).toContain('onUpdateRequest');
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a ContentFactory', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory).toBeInstanceOf(Cell.ContentFactory);
        });
      });

      describe('#editorFactory', () => {
        it('should be the editor factory used by the content factory', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.editorFactory).toEqual(editorFactory);
        });
      });

      describe('#createCellHeader()', () => {
        it('should create a new cell header', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.createCellHeader()).toBeInstanceOf(CellHeader);
        });
      });

      describe('#createCellFooter()', () => {
        it('should create a new cell footer', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.createCellFooter()).toBeInstanceOf(CellFooter);
        });
      });

      describe('#createOutputPrompt()', () => {
        it('should create a new output prompt', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.createOutputPrompt()).toBeInstanceOf(OutputPrompt);
        });
      });

      describe('#createInputPrompt()', () => {
        it('should create a new input prompt', () => {
          const factory = new Cell.ContentFactory({ editorFactory });
          expect(factory.createInputPrompt()).toBeInstanceOf(InputPrompt);
        });
      });
    });
  });

  describe('CodeCell', () => {
    const contentFactory = NBTestUtils.createCodeCellFactory();
    const model = new CodeCellModel();

    describe('#constructor()', () => {
      it('should create a code cell widget', () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        expect(widget).toBeInstanceOf(CodeCell);
      });

      it('should accept a custom contentFactory', () => {
        const contentFactory = NBTestUtils.createCodeCellFactory();
        const widget = new CodeCell({ model, contentFactory, rendermime });
        widget.initializeState();
        expect(widget).toBeInstanceOf(CodeCell);
      });
    });

    describe('#headings', () => {
      it('should not throw when outputs contain an array of strings', () => {
        const modelheadings = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model: modelheadings,
          rendermime
        });
        widget.initializeState();
        widget.model.outputs.add({
          output_type: 'display_data',
          data: {
            'text/html': ['Some ', ' thing']
          },
          metadata: {}
        });
        // try if headings got a problem with multi line html
        expect(widget.headings).toEqual([]);
      });
    });

    describe('#outputArea', () => {
      it('should be the output area used by the cell', () => {
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputArea).toBeInstanceOf(OutputArea);
      });
    });

    describe('#outputCollapsed', () => {
      it('should initialize from the model', () => {
        const collapsedModel = new CodeCellModel();
        let widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model: collapsedModel,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputHidden).toEqual(false);

        collapsedModel.setMetadata('collapsed', true);
        widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model: collapsedModel,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputHidden).toEqual(true);

        collapsedModel.deleteMetadata('collapsed');
        collapsedModel.setMetadata('jupyter', { outputs_hidden: true });
        widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model: collapsedModel,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputHidden).toEqual(true);
      });

      it('should be the view state of the output being collapsed', () => {
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputHidden).toEqual(false);
        widget.outputHidden = true;
        expect(widget.outputHidden).toEqual(true);
      });
    });

    describe('#outputsScrolled', () => {
      it('should initialize from the model', () => {
        const model = new CodeCellModel();
        let widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputsScrolled).toEqual(false);

        model.setMetadata('scrolled', false);
        widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputsScrolled).toEqual(false);

        model.setMetadata('scrolled', 'auto');
        widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputsScrolled).toEqual(false);

        model.setMetadata('scrolled', true);
        widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputsScrolled).toEqual(true);
      });
    });

    describe('#loadScrolledState()', () => {
      it('should load the output scrolled state from the model', () => {
        const model = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputsScrolled).toEqual(false);

        model.setMetadata('scrolled', true);
        widget.loadScrolledState();
        expect(widget.outputsScrolled).toEqual(true);

        model.setMetadata('scrolled', false);
        widget.loadScrolledState();
        expect(widget.outputsScrolled).toEqual(false);
      });
    });

    describe('#saveScrolledState()', () => {
      it('should save the collapse state to the model', () => {
        const model = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputsScrolled).toEqual(false);

        widget.outputsScrolled = true;
        widget.saveScrolledState();
        expect(model.getMetadata('scrolled')).toEqual(true);

        widget.outputsScrolled = false;
        widget.saveScrolledState();
        // Default values are not saved explicitly
        expect(model.getMetadata('scrolled')).toEqual(undefined);
      });
    });

    describe('#syncScrolled', () => {
      it('should control automatic syncing of scrolled state with model', () => {
        const model = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.syncScrolled).toEqual(false);
        expect(widget.outputsScrolled).toEqual(false);

        // Not synced if setting widget attribute
        widget.outputsScrolled = true;
        expect(model.getMetadata('scrolled')).toEqual(undefined);

        // Not synced if setting metadata attribute
        model.setMetadata('scrolled', false);
        expect(widget.outputsScrolled).toEqual(true);

        widget.syncScrolled = true;

        // Setting sync does an initial sync from model to view. This also sets
        // the metadata to undefined if it is the default value.
        expect(model.getMetadata('scrolled')).toEqual(undefined);
        expect(widget.outputsScrolled).toEqual(false);

        // Synced if setting widget attribute
        widget.outputsScrolled = true;
        expect(model.getMetadata('scrolled')).toEqual(true);

        // Synced if setting metadata attribute
        model.setMetadata('scrolled', false);
        expect(widget.outputsScrolled).toEqual(false);
      });
    });

    describe('#loadCollapseState()', () => {
      it('should load the output collapse state from the model', () => {
        const model = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        widget.loadCollapseState();
        expect(widget.outputHidden).toEqual(false);

        model.setMetadata('collapsed', true);
        widget.loadCollapseState();
        expect(widget.outputHidden).toEqual(true);

        model.setMetadata('collapsed', false);
        widget.loadCollapseState();
        expect(widget.outputHidden).toEqual(false);
      });
    });

    describe('#saveCollapseState()', () => {
      it('should save the collapse state to the model `collapsed` metadata', () => {
        const model = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.outputHidden).toEqual(false);

        widget.outputHidden = true;
        widget.saveCollapseState();
        expect(model.getMetadata('collapsed')).toEqual(true);

        // Default values are not saved explicitly
        widget.outputHidden = false;
        widget.saveCollapseState();
        expect(model.getMetadata('collapsed')).toEqual(undefined);

        // Default values are explicitly deleted
        model.setMetadata('collapsed', false);
        widget.outputHidden = false;
        widget.saveCollapseState();
        expect(model.getMetadata('collapsed')).toEqual(undefined);
      });
    });

    describe('#syncCollapse', () => {
      it('should control automatic syncing of collapse state with model', () => {
        const model = new CodeCellModel();
        const widget = new CodeCell({
          contentFactory: NBTestUtils.createCodeCellFactory(),
          model,
          rendermime
        });
        widget.initializeState();
        expect(widget.syncCollapse).toEqual(false);
        expect(widget.outputHidden).toEqual(false);

        // Not synced if setting widget attribute
        widget.outputHidden = true;
        expect(model.getMetadata('collapsed')).toEqual(undefined);

        // Not synced if setting metadata attribute
        model.setMetadata('collapsed', false);
        expect(widget.outputHidden).toEqual(true);

        widget.syncCollapse = true;

        // Setting sync does an initial sync from model to view.
        expect(model.getMetadata('collapsed')).toEqual(undefined);
        expect(widget.outputHidden).toEqual(false);

        // Synced if setting widget attribute
        widget.outputHidden = true;
        expect(model.getMetadata('collapsed')).toEqual(true);

        // Synced if setting metadata attribute
        model.setMetadata('collapsed', false);
        expect(widget.outputHidden).toEqual(false);

        // Synced if deleting collapsed metadata attribute
        widget.outputHidden = true;
        expect(model.getMetadata('collapsed')).toEqual(true);
        model.deleteMetadata('collapsed');
        expect(widget.outputHidden).toEqual(false);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.dispose();
        expect(widget.isDisposed).toEqual(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new CodeCell({ model, rendermime, contentFactory });
        widget.initializeState();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toEqual(true);
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should update the widget', () => {
        const widget = new LogCodeCell().initializeState();
        expect(widget.methods).not.toContain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).toContain('onUpdateRequest');
      });
    });

    describe('#onMetadataChanged()', () => {
      it('should fire when model metadata changes', () => {
        const method = 'onMetadataChanged';
        const widget = new LogCodeCell().initializeState();
        expect(widget.methods).not.toContain(method);
        widget.model.setMetadata('foo', 1);
        expect(widget.methods).toContain(method);
      });
    });

    describe('.execute()', () => {
      let sessionContext: ISessionContext;

      const server = new JupyterServer();

      beforeAll(async () => {
        await server.start();
      }, 30000);

      afterAll(async () => {
        await server.shutdown();
      });

      beforeEach(async () => {
        sessionContext = await createSessionContext();
        await (sessionContext as SessionContext).initialize();
        await sessionContext.session?.kernel?.info;
      });

      afterEach(() => {
        return sessionContext.shutdown();
      });

      it('should fulfill a promise if there is no code to execute', async () => {
        const widget = new CodeCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        await expect(
          CodeCell.execute(widget, sessionContext)
        ).resolves.not.toThrow();
      });

      it('should fulfill a promise if there is code to execute', async () => {
        const widget = new CodeCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        let originalCount: number;
        widget.model.sharedModel.setSource('foo');
        originalCount = widget.model.executionCount!;
        await CodeCell.execute(widget, sessionContext);
        const executionCount = widget.model.executionCount;
        expect(executionCount).not.toEqual(originalCount);
      });

      const TIMING_KEYS = [
        'iopub.execute_input',
        'shell.execute_reply.started',
        'shell.execute_reply',
        'iopub.status.busy',
        'iopub.status.idle'
      ];

      it('should not save timing info by default', async () => {
        const widget = new CodeCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        await CodeCell.execute(widget, sessionContext);
        expect(widget.model.getMetadata('execution')).toBeUndefined();
      });
      it('should save timing info if requested', async () => {
        const widget = new CodeCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        await CodeCell.execute(widget, sessionContext, { recordTiming: true });
        expect(widget.model.getMetadata('execution')).toBeDefined();
        const timingInfo = widget.model.getMetadata('execution') as any;
        for (const key of TIMING_KEYS) {
          expect(timingInfo[key]).toBeDefined();
        }
      });

      it('should set the cell prompt properly while executing', async () => {
        const widget = new CodeCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        widget.model.sharedModel.setSource('foo');
        const future1 = CodeCell.execute(widget, sessionContext);
        expect(widget.promptNode!.textContent).toEqual('[*]:');
        const future2 = CodeCell.execute(widget, sessionContext);
        expect(widget.promptNode!.textContent).toEqual('[*]:');
        await expect(future1).rejects.toThrow('Canceled');
        expect(widget.promptNode!.textContent).toEqual('[*]:');
        const msg = await future2;
        expect(msg).not.toBeUndefined();

        expect(widget.promptNode!.textContent).toEqual(
          `[${(msg as IExecuteReplyMsg).content.execution_count}]:`
        );
      });

      it('should set the cell prompt properly on server-side execution', async () => {
        const widget = new CodeCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        const sharedModel = widget.model.sharedModel;
        // Clearing execution count should not overwrite the execution state:
        sharedModel.executionState = 'running';
        sharedModel.execution_count = null;
        expect(sharedModel.executionState).toEqual('running');
        expect(widget.promptNode!.textContent).toEqual('[*]:');
        // Setting execution count should also set execution state to idle:
        sharedModel.execution_count = 1;
        expect(sharedModel.executionState).toEqual('idle');
        expect(widget.promptNode!.textContent).toEqual('[1]:');
      });
    });
  });

  describe('MarkdownCell', () => {
    const contentFactory = NBTestUtils.createBaseCellFactory();
    const model = new MarkdownCellModel();
    describe('#constructor()', () => {
      it('should create a markdown cell widget', () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        expect(widget).toBeInstanceOf(MarkdownCell);
      });

      it('should accept a custom contentFactory', () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        expect(widget).toBeInstanceOf(MarkdownCell);
      });

      it('should set the default mimetype to text/x-ipythongfm', () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        expect(widget.model.mimeType).toEqual('text/x-ipythongfm');
      });
    });

    describe('#getEditorOptions()', () => {
      it('should normalise line endings on paste', () => {
        const model = new MarkdownCellModel({
          sharedModel: createStandaloneCell({
            cell_type: 'markdown'
          }) as YMarkdownCell
        });
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        document.body.appendChild(widget.node);
        // todo: replace with user-event
        const dt = new DataTransfer();
        dt.setData('text/plain', '\r\nTest\r\nString\r\n.\r\n');
        const event = new ClipboardEvent('paste', { clipboardData: dt });
        widget.editor!.host.querySelector('.cm-content')!.dispatchEvent(event);

        expect(widget.model.sharedModel.getSource()).toEqual(
          '\nTest\nString\n.\n'
        );
      });
    });

    describe('#rendered', () => {
      it('should default to true', async () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        Widget.attach(widget, document.body);
        expect(widget.rendered).toEqual(true);
        await framePromise();
        expect(widget.node.classList.contains(RENDERED_CLASS)).toEqual(true);
      });

      it('should unrender the widget', async () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        Widget.attach(widget, document.body);
        widget.rendered = false;
        await signalToPromise(widget.renderedChanged);
        await framePromise();
        expect(widget.node.classList.contains(RENDERED_CLASS)).toEqual(false);
        widget.dispose();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        widget.dispose();
        expect(widget.isDisposed).toEqual(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new MarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        });
        widget.initializeState();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toEqual(true);
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should update the widget', () => {
        const widget = new LogMarkdownCell({
          model,
          rendermime,
          contentFactory,
          placeholder: false
        }).initializeState();
        expect(widget.methods).not.toContain('onUpdateRequest');
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).toContain('onUpdateRequest');
      });
    });
  });

  describe('RawCell', () => {
    const contentFactory = NBTestUtils.createBaseCellFactory();

    describe('#constructor()', () => {
      it('should create a raw cell widget', () => {
        const model = new RawCellModel();
        const widget = new RawCell({
          model,
          contentFactory,
          placeholder: false
        }).initializeState();
        expect(widget).toBeInstanceOf(RawCell);
      });
    });
  });

  describe('CellHeader', () => {
    describe('#constructor()', () => {
      it('should create a new cell header', () => {
        expect(new CellHeader()).toBeInstanceOf(CellHeader);
      });
    });
  });

  describe('CellFooter', () => {
    describe('#constructor()', () => {
      it('should create a new cell footer', () => {
        expect(new CellFooter()).toBeInstanceOf(CellFooter);
      });
    });
  });
});
