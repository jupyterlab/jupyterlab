// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Cell,
  CodeCell,
  CodeCellModel,
  MarkdownCell,
  MarkdownCellModel,
  RawCell,
  RawCellModel
} from '@jupyterlab/cells';
import {
  INotebookModel,
  Notebook,
  NotebookModel,
  StaticNotebook
} from '@jupyterlab/notebook';
import {
  framePromise,
  JupyterServer,
  signalToPromise,
  sleep
} from '@jupyterlab/testing';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { generate, simulate } from 'simulate-event';
import * as utils from './utils';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { yUndoManagerFacet } from '@jupyterlab/codemirror/lib/extensions/yundomanager';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

const contentFactory = utils.createNotebookFactory();
const editorConfig = utils.defaultEditorConfig;
const rendermime = utils.defaultRenderMime();
const notebookConfig: StaticNotebook.INotebookConfig = {
  ...StaticNotebook.defaultNotebookConfig,
  windowingMode: 'none'
};

const options: Notebook.IOptions = {
  rendermime,
  contentFactory,
  mimeTypeService: utils.mimeTypeService,
  editorConfig,
  notebookConfig
};

function createWidget(): LogStaticNotebook {
  const model = new NotebookModel();
  const widget = new LogStaticNotebook(options);
  widget.model = model;
  return widget;
}

class LogStaticNotebook extends StaticNotebook {
  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onModelChanged(
    oldValue: INotebookModel,
    newValue: INotebookModel
  ): void {
    super.onModelChanged(oldValue, newValue);
    this.methods.push('onModelChanged');
  }

  protected onMetadataChanged(model: any, args: any): void {
    super.onMetadataChanged(model, args);
    this.methods.push('onMetadataChanged');
  }

  protected onCellInserted(index: number, cell: Cell): void {
    super.onCellInserted(index, cell);
    this.methods.push('onCellInserted');
  }

  protected onCellRemoved(index: number, cell: Cell): void {
    super.onCellRemoved(index, cell);
    this.methods.push('onCellRemoved');
  }
}

class LogNotebook extends Notebook {
  events: string[] = [];

  methods: string[] = [];

  handleEvent(event: Event): void {
    this.events.push(event.type);
    super.handleEvent(event);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onCellInserted(index: number, cell: Cell): void {
    super.onCellInserted(index, cell);
    this.methods.push('onCellInserted');
  }

  protected onCellRemoved(index: number, cell: Cell): void {
    super.onCellRemoved(index, cell);
    this.methods.push('onCellRemoved');
  }
}

function createActiveWidget(): LogNotebook {
  const model = new NotebookModel();
  const widget = new LogNotebook(options);
  widget.model = model;
  return widget;
}

function selected(nb: Notebook): number[] {
  const selected: number[] = [];
  const cells = nb.widgets;
  for (let i = 0; i < cells.length; i++) {
    if (nb.isSelected(cells[i])) {
      selected.push(i);
    }
  }
  return selected;
}

describe('@jupyter/notebook', () => {
  describe('StaticNotebook', () => {
    describe('#constructor()', () => {
      it('should create a notebook widget', () => {
        const widget = new StaticNotebook(options);
        expect(widget).toBeInstanceOf(StaticNotebook);
      });

      it('should add the `jp-Notebook` class', () => {
        const widget = new StaticNotebook(options);
        expect(widget.hasClass('jp-Notebook')).toBe(true);
      });

      it('should accept an optional render', () => {
        const widget = new StaticNotebook(options);
        expect(widget.contentFactory).toBe(contentFactory);
      });

      it('should accept an optional editor config', () => {
        const widget = new StaticNotebook(options);
        expect(widget.editorConfig).toBe(editorConfig);
      });
    });

    describe('#modelChanged', () => {
      it('should be emitted when the model changes', () => {
        const widget = new StaticNotebook(options);
        const model = new NotebookModel();
        let called = false;
        widget.modelChanged.connect((sender, args) => {
          expect(sender).toBe(widget);
          expect(args).toBeUndefined();
          called = true;
        });
        widget.model = model;
        expect(called).toBe(true);
      });
    });

    describe('#modelContentChanged', () => {
      it('should be emitted when a cell is added', () => {
        const widget = new StaticNotebook(options);
        widget.model = new NotebookModel();
        let called = false;
        widget.modelContentChanged.connect(() => {
          called = true;
        });
        widget.model!.sharedModel.insertCell(0, { cell_type: 'code' });
        expect(called).toBe(true);
      });

      it('should be emitted when metadata is set', () => {
        const widget = new StaticNotebook(options);
        widget.model = new NotebookModel();
        let called = false;
        widget.modelContentChanged.connect(() => {
          called = true;
        });
        widget.model!.setMetadata('foo', 1);
        expect(called).toBe(true);
      });
    });

    describe('#model', () => {
      it('should get the model for the widget', () => {
        const widget = new StaticNotebook(options);
        expect(widget.model).toBeNull();
      });

      it('should set the model for the widget', () => {
        const widget = new StaticNotebook(options);
        const model = new NotebookModel();
        widget.model = model;
        expect(widget.model).toBe(model);
      });

      it('should emit the `modelChanged` signal', () => {
        const widget = new StaticNotebook(options);
        const model = new NotebookModel();
        widget.model = model;
        let called = false;
        widget.modelChanged.connect(() => {
          called = true;
        });
        widget.model = new NotebookModel();
        expect(called).toBe(true);
      });

      it('should be a no-op if the value does not change', () => {
        const widget = new StaticNotebook(options);
        const model = new NotebookModel();
        widget.model = model;
        let called = false;
        widget.modelChanged.connect(() => {
          called = true;
        });
        widget.model = model;
        expect(called).toBe(false);
      });

      it('should add the model cells to the layout', () => {
        const widget = new LogStaticNotebook(options);
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        widget.model = model;
        expect(widget.widgets.length).toBe(model.cells.length);
      });

      it('should add a default cell if the notebook model is empty', () => {
        const widget = new LogStaticNotebook(options);
        const model1 = new NotebookModel();
        expect(model1.cells.length).toBe(0);

        widget.model = model1;
        expect(model1.cells.length).toBe(1);
        expect(model1.cells.get(0).type).toBe('code');

        widget.notebookConfig = {
          ...widget.notebookConfig,
          defaultCell: 'markdown'
        };
        const model2 = new NotebookModel({
          defaultCell: 'markdown'
        });
        expect(model2.cells.length).toBe(0);

        widget.model = model2;
        expect(model2.cells.length).toBe(1);
        expect(model2.cells.get(0).type).toBe('markdown');
      });

      it('should set the mime types of the cell widgets', () => {
        const widget = new LogStaticNotebook(options);
        const model = new NotebookModel();
        const value = { name: 'python', codemirror_mode: 'python' };
        model.setMetadata('language_info', value);
        widget.model = model;
        const child = widget.widgets[0];
        expect(child.model.mimeType).toBe('text/x-python');
      });

      describe('`cells.changed` signal', () => {
        let widget: LogStaticNotebook;

        beforeEach(() => {
          widget = createWidget();
          widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        });

        afterEach(() => {
          widget.dispose();
        });

        it('should handle changes to the model cell list', async () => {
          widget = createWidget();
          widget.model!.sharedModel.insertCell(
            widget.model!.sharedModel.cells.length,
            { cell_type: 'code' }
          );
          await framePromise();
          expect(widget.widgets.length).toBe(2);
        });

        it('should handle a remove', () => {
          const cell = widget.model!.cells.get(1);
          const child = widget.widgets[1];
          widget.model!.sharedModel.deleteCell(1);
          expect(cell.isDisposed).toBe(true);
          expect(child.isDisposed).toBe(true);
        });

        it('should handle an add', () => {
          widget.model!.sharedModel.insertCell(0, { cell_type: 'code' });
          expect(widget.widgets.length).toBe(widget.model!.cells.length);
          const child = widget.widgets[0];
          expect(child.hasClass('jp-Notebook-cell')).toBe(true);
        });

        it('should initially render markdown cells with content', () => {
          widget.model!.sharedModel.insertCells(0, [
            { cell_type: 'markdown', source: '# Hello' },
            { cell_type: 'markdown' }
          ]);
          expect(widget.widgets.length).toBe(widget.model!.cells.length);
          const child1 = widget.widgets[0] as MarkdownCell;
          const child2 = widget.widgets[1] as MarkdownCell;
          expect(child1.rendered).toBe(true);
          expect(child2.rendered).toBe(false);
        });

        it('should handle a move', () => {
          const child = widget.widgets[1];
          widget.model!.sharedModel.moveCell(1, 2);
          expect(widget.widgets[2].id).toBe(child.id);
        });

        it('should handle a clear', () => {
          widget.model!.sharedModel.insertCell(0, { cell_type: 'code' });
          widget.model!.sharedModel.deleteCellRange(
            0,
            widget.model!.sharedModel.cells.length
          );
          expect(widget.widgets.length).toBe(0);
        });
      });
    });

    describe('#rendermime', () => {
      it('should be the rendermime instance used by the widget', () => {
        const widget = new StaticNotebook(options);
        expect(widget.rendermime).toBe(rendermime);
      });
    });

    describe('#contentFactory', () => {
      it('should be the cell widget contentFactory used by the widget', () => {
        const widget = new StaticNotebook(options);
        expect(widget.contentFactory).toBeInstanceOf(
          StaticNotebook.ContentFactory
        );
      });
    });

    describe('#editorConfig', () => {
      it('should be the cell widget contentFactory used by the widget', () => {
        const widget = new StaticNotebook(options);
        expect(widget.editorConfig).toBe(options.editorConfig);
      });

      it('should be settable', () => {
        const widget = createWidget();
        expect(widget.widgets[0].editor!.getOption('autoClosingBrackets')).toBe(
          false
        );
        const newConfig = {
          raw: editorConfig.raw,
          markdown: editorConfig.markdown,
          code: {
            ...editorConfig.code,
            autoClosingBrackets: true
          }
        };
        widget.editorConfig = newConfig;
        expect(widget.widgets[0].editor!.getOption('autoClosingBrackets')).toBe(
          true
        );
      });
    });

    describe('#codeMimetype', () => {
      it('should get the mime type for code cells', () => {
        const widget = new StaticNotebook(options);
        expect(widget.codeMimetype).toBe('text/plain');
      });

      it('should be set from language metadata', () => {
        const widget = new LogStaticNotebook(options);
        const model = new NotebookModel();
        const value = { name: 'python', codemirror_mode: 'python' };
        model.setMetadata('language_info', value);
        widget.model = model;
        expect(widget.codeMimetype).toBe('text/x-python');
      });
    });

    describe('#widgets', () => {
      it('should get the child widget at a specified index', () => {
        const widget = createWidget();
        const child = widget.widgets[0];
        expect(child).toBeInstanceOf(CodeCell);
      });

      it('should return `undefined` if out of range', () => {
        const widget = createWidget();
        const child = widget.widgets[1];
        expect(child).toBeUndefined();
      });

      it('should get the number of child widgets', () => {
        const widget = createWidget();
        expect(widget.widgets.length).toBe(1);
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        expect(widget.widgets.length).toBe(utils.DEFAULT_CONTENT.cells.length);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = createWidget();
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = createWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#moveCell()', () => {
      it('should preserve isDirty state after moving a code cell', () => {
        const widget = createWidget();
        widget.model!.sharedModel.insertCells(0, [
          { cell_type: 'code' },
          { cell_type: 'code' }
        ]);
        (widget.widgets[0].model as CodeCellModel).isDirty = true;
        widget.moveCell(0, 1);
        expect((widget.widgets[1].model as CodeCellModel).isDirty).toBe(true);
      });

      it('should preserve isDirty state after moving multiple code cells', () => {
        const widget = createWidget();
        widget.model!.sharedModel.insertCells(0, [
          { cell_type: 'code' },
          { cell_type: 'code' },
          { cell_type: 'code' },
          { cell_type: 'code' },
          { cell_type: 'code' }
        ]);
        (widget.widgets[0].model as CodeCellModel).isDirty = true;
        (widget.widgets[2].model as CodeCellModel).isDirty = true;
        widget.moveCell(0, 4, 3);
        expect((widget.widgets[2].model as CodeCellModel).isDirty).toBe(true);
        expect((widget.widgets[3].model as CodeCellModel).isDirty).toBe(false);
        expect((widget.widgets[4].model as CodeCellModel).isDirty).toBe(true);
      });
    });

    describe('#onModelChanged()', () => {
      it('should be called when the model changes', () => {
        const widget = new LogStaticNotebook(options);
        widget.model = new NotebookModel();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onModelChanged'])
        );
      });

      it('should not be called if the model does not change', () => {
        const widget = createWidget();
        widget.methods = [];
        widget.model = widget.model; // eslint-disable-line
        expect(widget.methods).toEqual(
          expect.not.arrayContaining(['onModelChanged'])
        );
      });
    });

    describe('#onMetadataChanged()', () => {
      it('should be called when the metadata on the notebook changes', () => {
        const widget = createWidget();
        widget.model!.setMetadata('foo', 1);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onMetadataChanged'])
        );
      });

      it('should update the `codeMimetype`', () => {
        const widget = createWidget();
        const value = { name: 'python', codemirror_mode: 'python' };
        widget.model!.setMetadata('language_info', value);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onMetadataChanged'])
        );
        expect(widget.codeMimetype).toBe('text/x-python');
      });

      it('should update the cell widget mimetype', () => {
        const widget = createWidget();
        const value = { name: 'python', mimetype: 'text/x-python' };
        widget.model!.setMetadata('language_info', value);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onMetadataChanged'])
        );
        const child = widget.widgets[0];
        expect(child.model.mimeType).toBe('text/x-python');
      });
    });

    describe('#onCellInserted()', () => {
      it('should be called when a cell is inserted', () => {
        const widget = createWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onCellInserted'])
        );
      });
    });

    describe('#onCellRemoved()', () => {
      it('should be called when a cell is removed', () => {
        const widget = createWidget();
        widget.model!.sharedModel.deleteCell(0);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onCellRemoved'])
        );
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a new ContentFactory', () => {
          const editorFactory = utils.editorFactory;
          const factory = new StaticNotebook.ContentFactory({ editorFactory });
          expect(factory).toBeInstanceOf(StaticNotebook.ContentFactory);
        });
      });

      describe('#createCodeCell({})', () => {
        it('should create a `CodeCell`', () => {
          const contentFactory = new StaticNotebook.ContentFactory({
            editorFactory: utils.editorFactory
          });
          const model = new CodeCellModel();
          const codeOptions = { model, rendermime, contentFactory };
          const widget = contentFactory.createCodeCell(codeOptions);
          expect(widget).toBeInstanceOf(CodeCell);
        });
      });

      describe('#createMarkdownCell({})', () => {
        it('should create a `MarkdownCell`', () => {
          const contentFactory = new StaticNotebook.ContentFactory({
            editorFactory: utils.editorFactory
          });
          const model = new MarkdownCellModel();
          const mdOptions = { model, rendermime, contentFactory };
          const widget = contentFactory.createMarkdownCell(mdOptions);
          expect(widget).toBeInstanceOf(MarkdownCell);
        });
      });

      describe('#createRawCell()', () => {
        it('should create a `RawCell`', () => {
          const contentFactory = new StaticNotebook.ContentFactory({
            editorFactory: utils.editorFactory
          });
          const model = new RawCellModel();
          const rawOptions = { model, contentFactory };
          const widget = contentFactory.createRawCell(rawOptions);
          expect(widget).toBeInstanceOf(RawCell);
        });
      });
    });
  });

  describe('Notebook', () => {
    describe('#stateChanged', () => {
      it('should be emitted when the state of the notebook changes', () => {
        const widget = createActiveWidget();
        let called = false;
        widget.stateChanged.connect((sender, args) => {
          expect(sender).toBe(widget);
          expect(args.name).toBe('mode');
          expect(args.oldValue).toBe('command');
          expect(args.newValue).toBe('edit');
          called = true;
        });
        widget.mode = 'edit';
        expect(called).toBe(true);
      });
    });

    describe('#activeCellChanged', () => {
      it('should be emitted when the active cell changes', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        let called = false;
        widget.activeCellChanged.connect((sender, args) => {
          expect(sender).toBe(widget);
          expect(args).toBe(widget.activeCell);
          called = true;
        });
        widget.activeCellIndex++;
        expect(called).toBe(true);
      });

      it('should not be emitted when the active cell does not change', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        let called = false;
        widget.activeCellChanged.connect(() => {
          called = true;
        });
        widget.activeCellIndex = widget.activeCellIndex; // eslint-disable-line
        expect(called).toBe(false);
      });
    });

    describe('#selectionChanged', () => {
      it('should be emitted when the selection changes', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        let called = false;
        widget.selectionChanged.connect((sender, args) => {
          expect(sender).toBe(widget);
          expect(args).toBeUndefined();
          called = true;
        });
        widget.select(widget.widgets[1]);
        expect(called).toBe(true);
      });

      it('should not be emitted when the selection does not change', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        let called = false;
        widget.select(widget.widgets[1]);
        widget.selectionChanged.connect(() => {
          called = true;
        });
        widget.select(widget.widgets[1]);
        expect(called).toBe(false);
      });
    });

    describe('#mode', () => {
      it('should get the interactivity mode of the notebook', () => {
        const widget = createActiveWidget();
        expect(widget.mode).toBe('command');
      });

      it('should set the interactivity mode of the notebook', () => {
        const widget = createActiveWidget();
        widget.mode = 'edit';
        expect(widget.mode).toBe('edit');
      });

      it('should emit the `stateChanged` signal', () => {
        const widget = createActiveWidget();
        let called = false;
        widget.stateChanged.connect((sender, args) => {
          expect(sender).toBe(widget);
          expect(args.name).toBe('mode');
          expect(args.oldValue).toBe('command');
          expect(args.newValue).toBe('edit');
          called = true;
        });
        widget.mode = 'edit';
        expect(called).toBe(true);
      });

      it('should be a no-op if the value does not change', () => {
        const widget = createActiveWidget();
        let called = false;
        widget.stateChanged.connect(() => {
          called = true;
        });
        widget.mode = 'command';
        expect(called).toBe(false);
      });

      it('should post an update request', async () => {
        const widget = createActiveWidget();
        widget.mode = 'edit';
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
      });

      it('should deselect all cells if switching to edit mode', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await framePromise();
        widget.extendContiguousSelectionTo(widget.widgets.length - 1);
        const selectedRange = Array.from(Array(widget.widgets.length).keys());
        expect(selected(widget)).toEqual(selectedRange);
        widget.mode = 'edit';
        expect(selected(widget)).toEqual([]);
        widget.dispose();
      });

      it('should unrender a markdown cell when switching to edit mode', () => {
        const widget = createActiveWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        widget.model!.sharedModel.insertCell(0, {
          cell_type: 'markdown',
          source: '# Hello'
        }); // Should be rendered with content.
        const child = widget.widgets[0] as MarkdownCell;
        expect(child.rendered).toBe(true);
        widget.activeCellIndex = 0;
        widget.mode = 'edit';
        expect(child.rendered).toBe(false);
      });
    });

    describe('#activeCellIndex', () => {
      it('should get the active cell index of the notebook', () => {
        const widget = createActiveWidget();
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should set the active cell index of the notebook', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        expect(widget.activeCellIndex).toBe(1);
      });

      it('should clamp the index to the bounds of the notebook cells', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.activeCellIndex = -2;
        expect(widget.activeCellIndex).toBe(0);
        widget.activeCellIndex = 100;
        expect(widget.activeCellIndex).toBe(widget.model!.cells.length - 1);
      });

      it('should emit the `stateChanged` signal', () => {
        const widget = createActiveWidget();
        let called = false;
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.stateChanged.connect((sender, args) => {
          expect(sender).toBe(widget);
          expect(args.name).toBe('activeCellIndex');
          expect(args.oldValue).toBe(0);
          expect(args.newValue).toBe(1);
          called = true;
        });
        widget.activeCellIndex = 1;
        expect(called).toBe(true);
      });

      it('should be a no-op if the value does not change', () => {
        const widget = createActiveWidget();
        let called = false;
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.stateChanged.connect(() => {
          called = true;
        });
        widget.activeCellIndex = 0;
        expect(called).toBe(false);
      });

      it('should post an update request', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
        widget.activeCellIndex = 1;
      });

      it('should update the active cell if necessary', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        expect(widget.activeCell).toBe(widget.widgets[1]);
      });

      it('should render a markdown cell when moving active cells if autoRenderMarkdownCells is true', () => {
        const widget = createActiveWidget();
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        widget.model!.sharedModel.insertCell(0, {
          cell_type: 'markdown',
          source: '# Hello'
        }); // Should be rendered with content.
        const child = widget.widgets[0] as MarkdownCell;
        expect(child.rendered).toBe(true);
        widget.activeCellIndex = 0;
        widget.mode = 'edit';
        expect(child.rendered).toBe(false);

        // Turn on rendering of markdown cells when exiting
        widget.notebookConfig = {
          ...widget.notebookConfig,
          autoRenderMarkdownCells: true
        };

        // Exiting should trigger rendering of the old cell
        widget.activeCellIndex = 1;
        expect(child.rendered).toBe(true);
      });
    });

    describe('#activeCell', () => {
      it('should get the active cell widget', () => {
        const widget = createActiveWidget();
        expect(widget.activeCell).toBe(widget.widgets[0]);
      });
    });

    describe('#select()', () => {
      it('should select a cell widget', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        const cell = widget.widgets[0];
        widget.select(cell);
        expect(widget.isSelected(cell)).toBe(true);
      });

      it('should allow multiple widgets to be selected', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.widgets.forEach(cell => {
          widget.select(cell);
        });
        const expectSelected = Array.from(Array(widget.widgets.length).keys());
        expect(selected(widget)).toEqual(expectSelected);
      });
    });

    describe('#deselect()', () => {
      it('should deselect a cell', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        for (let i = 0; i < widget.widgets.length; i++) {
          const cell = widget.widgets[i];
          widget.select(cell);
          expect(widget.isSelected(cell)).toBe(true);
          widget.deselect(cell);
          expect(widget.isSelected(cell)).toBe(false);
        }
      });

      it('should const the active cell be deselected', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        const cell = widget.activeCell!;
        widget.select(cell);
        expect(widget.isSelected(cell)).toBe(true);
        widget.deselect(cell);
        expect(widget.isSelected(cell)).toBe(false);
      });
    });

    describe('#isSelected()', () => {
      it('should get whether the cell is selected', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.select(widget.widgets[0]);
        widget.select(widget.widgets[2]);
        expect(selected(widget)).toEqual([0, 2]);
      });

      it('reports selection whether or not cell is active', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        expect(selected(widget)).toEqual([]);
        widget.select(widget.activeCell!);
        expect(selected(widget)).toEqual([widget.activeCellIndex]);
      });
    });

    describe('#deselectAll()', () => {
      it('should deselect all cells', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.select(widget.widgets[0]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);
        widget.select(widget.widgets[4]);
        expect(selected(widget)).toEqual([0, 2, 3, 4]);
        widget.deselectAll();
        expect(selected(widget)).toEqual([]);
      });
    });

    describe('#extendContiguousSelectionTo()', () => {
      // Test a permutation for extending a selection.
      const checkSelection = (
        widget: Notebook,
        anchor: number,
        head: number,
        index: number,
        select = true
      ) => {
        if (!select && anchor !== head) {
          throw new Error('anchor must equal head if select is false');
        }

        // Set up the test by pre-selecting appropriate cells if select is true.
        if (select) {
          for (
            let i = Math.min(anchor, head);
            i <= Math.max(anchor, head);
            i++
          ) {
            widget.select(widget.widgets[i]);
          }
        }

        // Set the active cell to indicate the head of the selection.
        widget.activeCellIndex = head;

        // Set up a selection event listener.
        let selectionChanged = 0;
        const countSelectionChanged = (sender: Notebook, args: void) => {
          selectionChanged += 1;
        };
        widget.selectionChanged.connect(countSelectionChanged);

        // Check the contiguous selection.
        let selection = widget.getContiguousSelection();
        if (select) {
          expect(selection.anchor).toBe(anchor);
          expect(selection.head).toBe(head);
        } else {
          expect(selection.anchor).toBeNull();
          expect(selection.head).toBeNull();
        }

        // Extend the selection.
        widget.extendContiguousSelectionTo(index);

        // Clip index to fall within the cell index range.
        index = Math.max(0, Math.min(widget.widgets.length - 1, index));

        // Check the active cell is now at the index.
        expect(widget.activeCellIndex).toBe(index);

        // Check the contiguous selection.
        selection = widget.getContiguousSelection();

        // Check the selection changed signal was emitted once if necessary.
        if (head === index) {
          if (index === anchor && select) {
            // we should have collapsed the single cell selection
            expect(selectionChanged).toBe(1);
          } else {
            expect(selectionChanged).toBe(0);
          }
        } else {
          expect(selectionChanged).toBe(1);
        }

        if (anchor !== index) {
          expect(selection.anchor).toBe(anchor);
          expect(selection.head).toBe(index);
        } else {
          // If the anchor and index are the same, the selection is collapsed.
          expect(selection.anchor).toBe(null);
          expect(selection.head).toBe(null);
        }

        // Clean up widget
        widget.selectionChanged.disconnect(countSelectionChanged);
        widget.activeCellIndex = 0;
        widget.deselectAll();
      };

      // Lists are of the form [anchor, head, index].
      const permutations = [
        // Anchor, head, and index are distinct
        [1, 3, 5],
        [1, 5, 3],
        [3, 1, 5],
        [3, 5, 1],
        [5, 1, 3],
        [5, 3, 1],

        // Two of anchor, head, and index are equal
        [1, 3, 3],
        [3, 1, 3],
        [3, 3, 1],

        // Anchor, head, and index all equal
        [3, 3, 3]
      ];

      it('should work in each permutation of anchor, head, and index', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        expect(() => {
          permutations.forEach(p => {
            checkSelection(widget, p[0], p[1], p[2]);
          });
        }).not.toThrow();
      });

      it('should work when we only have an active cell, with no existing selection', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        expect(() => {
          permutations.forEach(p => {
            if (p[0] === p[1]) {
              checkSelection(widget, p[0], p[1], p[2], false);
            }
          });
        }).not.toThrow();
      });

      it('should clip when the index is greater than the last index', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        expect(() => {
          permutations.forEach(p => {
            checkSelection(widget, p[0], p[1], Number.MAX_SAFE_INTEGER);
          });
        }).not.toThrow();
      });

      it('should clip when the index is greater than the last index with no existing selection', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        expect(() => {
          permutations.forEach(p => {
            if (p[0] === p[1]) {
              checkSelection(
                widget,
                p[0],
                p[1],
                Number.MAX_SAFE_INTEGER,
                false
              );
            }
          });
        }).not.toThrow();
      });

      it('should clip when the index is less than 0', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        expect(() => {
          permutations.forEach(p => {
            checkSelection(widget, p[0], p[1], -10);
          });
        }).not.toThrow();
      });

      it('should clip when the index is less than 0 with no existing selection', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        expect(() => {
          permutations.forEach(p => {
            if (p[0] === p[1]) {
              checkSelection(widget, p[0], p[1], -10, false);
            }
          });
        }).not.toThrow();
      });

      it('handles the case of no cells', () => {
        const widget = createActiveWidget();
        widget.model!.sharedModel.deleteCellRange(
          0,
          widget.model!.sharedModel.cells.length
        );
        expect(widget.widgets.length).toBe(0);

        // Set up a selection event listener.
        let selectionChanged = 0;
        widget.selectionChanged.connect((sender, args) => {
          selectionChanged += 1;
        });

        widget.extendContiguousSelectionTo(3);

        expect(widget.activeCellIndex).toBe(-1);
        expect(selectionChanged).toBe(0);
      });
    });

    describe('#getContiguousSelection()', () => {
      it('throws an error when the selection is not contiguous', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 3;

        expect(() => widget.getContiguousSelection()).toThrow(
          /Selection not contiguous/
        );
      });

      it('throws an error if the active cell is not at an endpoint', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);

        // Check if active cell is outside selection.
        widget.activeCellIndex = 0;
        expect(() => widget.getContiguousSelection()).toThrow(
          /Active cell not at endpoint of selection/
        );

        // Check if active cell is inside selection.
        widget.activeCellIndex = 2;
        expect(() => widget.getContiguousSelection()).toThrow(
          /Active cell not at endpoint of selection/
        );
      });

      it('returns null values if there is no selection', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        const selection = widget.getContiguousSelection();
        expect(selection).toEqual({ head: null, anchor: null });
      });

      it('handles the case of no cells', () => {
        const widget = createActiveWidget();
        widget.model!.sharedModel.deleteCellRange(
          0,
          widget.model!.sharedModel.cells.length
        );
        expect(widget.widgets.length).toBe(0);

        const selection = widget.getContiguousSelection();
        expect(selection).toEqual({ head: null, anchor: null });
      });

      it('works if head is before the anchor', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 1;

        const selection = widget.getContiguousSelection();
        expect(selection).toEqual({ head: 1, anchor: 3 });
      });

      it('works if head is after the anchor', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        widget.select(widget.widgets[1]);
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 3;

        const selection = widget.getContiguousSelection();
        expect(selection).toEqual({ head: 3, anchor: 1 });
      });

      it('works if head and anchor are the same', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);

        widget.select(widget.widgets[3]);
        widget.activeCellIndex = 3;

        const selection = widget.getContiguousSelection();
        expect(selection).toEqual({ head: 3, anchor: 3 });
      });
    });

    describe('#handleEvent()', () => {
      let widget: LogNotebook;

      beforeEach(async () => {
        widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await framePromise();
      });

      afterEach(() => {
        widget.dispose();
      });

      describe('mousedown', () => {
        it('should set the active cell index', () => {
          const child = widget.widgets[1];
          simulate(child.node, 'mousedown');
          expect(widget.events).toEqual(expect.arrayContaining(['mousedown']));
          expect(widget.isSelected(widget.widgets[0])).toBe(false);
          expect(widget.activeCellIndex).toBe(1);
        });

        it('should be a no-op if not not a cell', () => {
          simulate(widget.node, 'mousedown');
          expect(widget.events).toEqual(expect.arrayContaining(['mousedown']));
          expect(widget.activeCellIndex).toBe(0);
        });

        it('should preserve "command" mode if in a markdown cell', async () => {
          widget.model!.sharedModel.insertCell(0, {
            cell_type: 'markdown',
            source: '# Hello'
          });
          const child = widget.widgets[0] as MarkdownCell;
          if (!child.inViewport) {
            await signalToPromise(child.inViewportChanged);
          }
          expect(child.rendered).toBe(true);
          simulate(child.node, 'mousedown');
          expect(child.rendered).toBe(true);
          expect(widget.activeCell).toBe(child);
        });

        it('should extend selection if invoked with shift', () => {
          widget.activeCellIndex = 3;

          // shift click no-op
          simulate(widget.widgets[3].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(3);
          expect(selected(widget)).toEqual([]);
          // test that selecting mode handler does not prevent default
          // if no cells were selected; in the selecting mode we listen
          // to the `mouseup` event to stop selecting when the mouse button gets
          // released; this event gets default prevented as handled by the notebook.
          const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true
          });
          widget.widgets[3].node.dispatchEvent(mouseUpEvent);
          expect(mouseUpEvent.defaultPrevented).toBe(false);

          // shift click below
          simulate(widget.widgets[4].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(4);
          expect(selected(widget)).toEqual([3, 4]);

          // shift click above
          simulate(widget.widgets[1].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(1);
          expect(selected(widget)).toEqual([1, 2, 3]);

          // shift click expand
          simulate(widget.widgets[0].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(0);
          expect(selected(widget)).toEqual([0, 1, 2, 3]);

          // shift click contract
          simulate(widget.widgets[2].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(2);
          expect(selected(widget)).toEqual([2, 3]);

          // shift click deselect
          simulate(widget.widgets[3].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(3);
          expect(selected(widget)).toEqual([]);

          // shift click select by dragging from active cell
          expect(widget.activeCellIndex).toBe(3);
          simulate(widget.widgets[3].node, 'mousedown', { shiftKey: true });
          expect(widget.activeCellIndex).toBe(3);
          simulate(widget.widgets[4].node, 'mousemove', { shiftKey: true });
          expect(selected(widget)).toEqual([3, 4]);
          // test that selecting mode mouse up handler prevents default;
          // in selecting mode we listen to the `mouseup` event to stop
          // selecting when the mouse button gets released
          const blockedMouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true
          });
          widget.widgets[4].node.dispatchEvent(blockedMouseUpEvent);
          expect(blockedMouseUpEvent.defaultPrevented).toBe(true);
        });

        it('should not extend a selection if there is text selected in the output', () => {
          const codeCellIndex = 3;
          widget.activeCellIndex = codeCellIndex;

          // Set a selection in the active cell outputs.
          const selection = window.getSelection()!;
          selection.selectAllChildren(
            (widget.activeCell as CodeCell).outputArea.node
          );

          // Shift click below, which should not extend cells selection.
          simulate(widget.widgets[codeCellIndex + 2].node, 'mousedown', {
            shiftKey: true
          });
          expect(widget.activeCellIndex).toBe(codeCellIndex);
          expect(selected(widget)).toEqual([]);
        });

        it('should leave a markdown cell rendered', async () => {
          widget.model!.sharedModel.insertCells(0, [
            { cell_type: 'code' },
            { cell_type: 'markdown', source: '# Hello' }
          ]);
          const codeChild = widget.widgets[0];
          const mdChild = widget.widgets[1] as MarkdownCell;
          if (!codeChild.inViewport) {
            await signalToPromise(codeChild.inViewportChanged);
          }
          if (!mdChild.inViewport) {
            await signalToPromise(mdChild.inViewportChanged);
          }
          widget.select(codeChild);
          widget.select(mdChild);
          widget.activeCellIndex = 0;
          expect(mdChild.rendered).toBe(true);
          simulate(codeChild.editorWidget!.node, 'mousedown');
          simulate(codeChild.editorWidget!.node, 'focusin');
          expect(mdChild.rendered).toBe(true);
          expect(widget.activeCell).toBe(codeChild);
          expect(widget.mode).toBe('edit');
        });

        it('should remove selection and switch to command mode', async () => {
          widget.model!.sharedModel.insertCells(0, [
            { cell_type: 'code' },
            { cell_type: 'markdown', source: '# Hello' }
          ]);
          const codeChild = widget.widgets[0];
          const mdChild = widget.widgets[1] as MarkdownCell;
          if (!codeChild.inViewport) {
            await signalToPromise(codeChild.inViewportChanged);
          }
          if (!mdChild.inViewport) {
            await signalToPromise(mdChild.inViewportChanged);
          }
          widget.select(codeChild);
          widget.select(mdChild);
          widget.activeCellIndex = 0;
          simulate(codeChild.editorWidget!.node, 'mousedown');
          simulate(codeChild.editorWidget!.node, 'focusin');
          expect(widget.mode).toBe('edit');
          simulate(codeChild.editorWidget!.node, 'mousedown', { button: 2 });
          expect(widget.isSelected(mdChild)).toBe(false);
          expect(widget.mode).toBe('command');
        });

        it('should have no effect on shift right click', () => {
          widget.model!.sharedModel.insertCells(0, [
            { cell_type: 'code' },
            { cell_type: 'markdown', source: '# Hello' }
          ]);
          const codeChild = widget.widgets[0];
          const mdChild = widget.widgets[1] as MarkdownCell;
          widget.select(codeChild);
          widget.select(mdChild);
          widget.activeCellIndex = 0;
          simulate(codeChild.editorWidget!.node, 'mousedown', {
            shiftKey: true,
            button: 2
          });
          expect(widget.isSelected(mdChild)).toBe(true);
          expect(widget.mode).toBe('command');
        });
      });

      describe('dblclick', () => {
        it('should unrender a markdown cell', async () => {
          widget.model!.sharedModel.insertCell(0, {
            cell_type: 'markdown',
            source: '# Hello'
          });
          const child = widget.widgets[0] as MarkdownCell;
          if (!child.inViewport) {
            await signalToPromise(child.inViewportChanged);
          }
          expect(child.rendered).toBe(true);
          expect(widget.mode).toBe('command');
          simulate(child.node, 'dblclick');
          expect(widget.mode).toBe('command');
          expect(child.rendered).toBe(false);
        });
      });

      describe('focusin', () => {
        it('should change to edit mode if a child cell takes focus', () => {
          const child = widget.widgets[0];
          simulate(child.editorWidget!.node, 'focusin');
          expect(widget.events).toEqual(expect.arrayContaining(['focusin']));
          expect(widget.mode).toBe('edit');
        });

        it('should change to command mode if the widget takes focus', () => {
          const child = widget.widgets[0];
          simulate(child.editorWidget!.node, 'focusin');
          expect(widget.events).toEqual(expect.arrayContaining(['focusin']));
          expect(widget.mode).toBe('edit');
          widget.events = [];
          simulate(widget.node, 'focusin');
          expect(widget.events).toEqual(expect.arrayContaining(['focusin']));
          expect(widget.mode).toBe('command');
        });

        it('should not unrender previously active markdown cell', async () => {
          widget.model!.sharedModel.insertCell(0, {
            cell_type: 'markdown',
            source: '# Hello'
          });
          const mdCell = widget.widgets[0] as MarkdownCell;
          if (!mdCell.inViewport) {
            await signalToPromise(mdCell.inViewportChanged);
          }
          widget.activeCellIndex = 0;
          expect(mdCell.rendered).toBe(true);
          const cellToActivate = widget.widgets[1];
          expect(widget.mode).toBe('command');
          simulate(cellToActivate.editorWidget!.node, 'focusin');
          expect(widget.mode).toBe('edit');
          expect(mdCell.rendered).toBe(true);
        });
      });

      describe('focusout', () => {
        it('should switch to command mode', async () => {
          simulate(widget.node, 'focusin');
          widget.mode = 'edit';
          const event = generate('focusout');
          (event as any).relatedTarget = document.body;
          widget.node.dispatchEvent(event);
          expect(widget.mode).toBe('command');
          MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
          // Wait for the activeCell to be focused
          await framePromise();
          expect(widget.mode).toBe('command');
          expect(widget.activeCell!.editor!.hasFocus()).toBe(false);
        });

        it('should set command mode', () => {
          simulate(widget.node, 'focusin');
          widget.mode = 'edit';
          const evt = generate('focusout');
          (evt as any).relatedTarget = widget.activeCell!.node;
          widget.node.dispatchEvent(evt);
          expect(widget.mode).toBe('command');
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should add event listeners', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        const child = widget.widgets[0];
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onAfterAttach'])
        );
        simulate(widget.node, 'mousedown');
        expect(widget.events).toEqual(expect.arrayContaining(['mousedown']));
        simulate(widget.node, 'dblclick');
        expect(widget.events).toEqual(expect.arrayContaining(['dblclick']));
        simulate(child.node, 'focusin');
        expect(widget.events).toEqual(expect.arrayContaining(['focusin']));
        widget.dispose();
      });

      it('should post an update request', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onAfterAttach'])
        );
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
        widget.dispose();
      });
    });

    describe('#onBeforeDetach()', () => {
      it('should remove event listeners', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        const child = widget.widgets[0];
        await framePromise();
        Widget.detach(widget);
        expect(widget.methods).toContain('onBeforeDetach');
        widget.events = [];
        simulate(widget.node, 'mousedown');
        expect(widget.events).not.toContain('mousedown');
        simulate(widget.node, 'dblclick');
        expect(widget.events).not.toContain('dblclick');
        simulate(child.node, 'focusin');
        expect(widget.events).not.toContain('focusin');
        widget.dispose();
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus the node after an update', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await framePromise();
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onActivateRequest'])
        );
        await framePromise();
        expect(document.activeElement).toBe(widget.activeCell!.node);
        widget.dispose();
      });
    });

    describe('#onUpdateRequest()', () => {
      let widget: LogNotebook;

      beforeEach(async () => {
        widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        Widget.attach(widget, document.body);
        await framePromise();
      });

      afterEach(() => {
        widget.dispose();
      });

      it('should apply the command class if in command mode', () => {
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
        expect(widget.hasClass('jp-mod-commandMode')).toBe(true);
      });

      it('should apply the edit class if in edit mode', async () => {
        widget.mode = 'edit';
        await framePromise();
        expect(widget.hasClass('jp-mod-editMode')).toBe(true);
      });

      it('should add the active class to the active widget', () => {
        const cell = widget.widgets[widget.activeCellIndex];
        expect(cell.hasClass('jp-mod-active')).toBe(true);
      });

      it('should set the selected class on the selected widgets', async () => {
        widget.select(widget.widgets[1]);
        await framePromise();
        for (let i = 0; i < 2; i++) {
          const cell = widget.widgets[i];
          expect(cell.hasClass('jp-mod-selected')).toBe(true);
        }
      });

      it('should add the multi select class if there is more than one widget', async () => {
        widget.select(widget.widgets[1]);
        expect(widget.hasClass('jp-mod-multSelected')).toBe(false);
        await framePromise();
        expect(widget.hasClass('jp-mod-multSelected')).toBe(false);
      });
    });

    describe('#onCellInserted()', () => {
      it('should post an `update-request', async () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onCellInserted'])
        );
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
      });

      it('should update the active cell if necessary', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        expect(widget.activeCell).toBe(widget.widgets[0]);
      });

      it('should keep the currently active cell active', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.activeCellIndex = 1;
        widget.model!.sharedModel.insertCell(0, { cell_type: 'code' });
        expect(widget.activeCell).toBe(widget.widgets[2]);
      });

      it.each(['full', 'defer', 'none'])(
        'should connect undoManager to the cell editor in %s windowing mode',
        async mode => {
          const widget = createActiveWidget();
          widget.notebookConfig = {
            ...widget.notebookConfig,
            windowingMode: mode as 'full' | 'defer' | 'none'
          };
          Widget.attach(widget, document.body);
          widget.model!.sharedModel.insertCell(0, { cell_type: 'code' });
          const child = widget.widgets[0];
          await child.ready;
          const editor = child.editorWidget!.editor as CodeMirrorEditor;
          const conf = editor.editor.state.facet(yUndoManagerFacet);
          expect(conf.undoManager).toBeTruthy();
        }
      );

      describe('`edgeRequested` signal', () => {
        it('should activate the previous cell if top is requested', async () => {
          const widget = createActiveWidget();
          widget.model!.fromJSON(utils.DEFAULT_CONTENT);
          widget.activeCellIndex = 1;
          // Wait for the cell to be ready and the signal listener to be set
          await sleep();
          const child = widget.widgets[widget.activeCellIndex];
          (child.editor!.edgeRequested as any).emit('top');
          expect(widget.activeCellIndex).toBe(0);
        });

        it('should activate the next cell if bottom is requested', async () => {
          const widget = createActiveWidget();
          widget.model!.fromJSON(utils.DEFAULT_CONTENT);
          // Wait for the cell to be ready and the signal listener to be set
          await sleep();
          const child = widget.widgets[widget.activeCellIndex];
          (child.editor!.edgeRequested as any).emit('bottom');
          expect(widget.activeCellIndex).toBe(1);
        });
      });
    });

    describe('#onCellRemoved()', () => {
      it('should post an `update-request', async () => {
        const widget = createActiveWidget();
        widget.model!.sharedModel.deleteCell(0);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onCellRemoved'])
        );
        await framePromise();
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
      });

      it('should update the active cell if necessary', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.model!.sharedModel.deleteCell(0);
        expect(widget.activeCell).toBe(widget.widgets[0]);
      });

      it('should keep the currently active cell active', () => {
        const widget = createActiveWidget();
        widget.model!.fromJSON(utils.DEFAULT_CONTENT);
        widget.activeCellIndex = 2;
        widget.model!.sharedModel.deleteCell(1);
        expect(widget.activeCell).toBe(widget.widgets[1]);
      });
    });
  });
});
