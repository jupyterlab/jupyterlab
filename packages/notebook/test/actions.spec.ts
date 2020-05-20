// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';

import { CodeCell, MarkdownCell, RawCell } from '@jupyterlab/cells';

import { IMimeBundle, CellType } from '@jupyterlab/nbformat';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import {
  acceptDialog,
  createSessionContext,
  dismissDialog,
  sleep
} from '@jupyterlab/testutils';

import { JupyterServer } from '@jupyterlab/testutils/lib/start_jupyter_server';

import { each } from '@lumino/algorithm';

import { JSONObject, JSONArray, UUID } from '@lumino/coreutils';

import { NotebookModel } from '../src';

import { NotebookActions } from '../src';

import { Notebook } from '../src';

import * as utils from './utils';

const ERROR_INPUT = 'a = foo';

const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  let rendermime: IRenderMimeRegistry;

  describe('NotebookActions', () => {
    let widget: Notebook;
    let sessionContext: ISessionContext;
    let ipySessionContext: ISessionContext;

    beforeAll(async function() {
      jest.setTimeout(20000);
      rendermime = utils.defaultRenderMime();

      async function createContext(options?: Partial<SessionContext.IOptions>) {
        const context = await createSessionContext(options);
        await context.initialize();
        await context.session?.kernel?.info;
        return context;
      }
      [sessionContext, ipySessionContext] = await Promise.all([
        createContext(),
        createContext({ kernelPreference: { name: 'ipython' } })
      ]);
    });

    beforeEach(() => {
      widget = new Notebook({
        rendermime,
        contentFactory: utils.createNotebookFactory(),
        mimeTypeService: utils.mimeTypeService
      });
      const model = new NotebookModel();
      model.fromJSON(utils.DEFAULT_CONTENT);
      widget.model = model;

      widget.activeCellIndex = 0;
    });

    afterEach(() => {
      widget.dispose();
      utils.clipboard.clear();
    });

    afterAll(async () => {
      await Promise.all([
        sessionContext.shutdown(),
        ipySessionContext.shutdown()
      ]);
    });

    describe('#executed', () => {
      it('should emit when Markdown and code cells are run', async () => {
        const cell = widget.activeCell as CodeCell;
        const next = widget.widgets[1] as MarkdownCell;
        let emitted = 0;

        widget.select(next);
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.executed.connect(() => {
          emitted += 1;
        });

        await NotebookActions.run(widget, sessionContext);
        expect(emitted).toBe(2);
        expect(next.rendered).toBe(true);
      });
    });

    describe('#splitCell({})', () => {
      it('should split the active cell into two cells', () => {
        const cell = widget.activeCell!;
        const source = 'thisisasamplestringwithnospaces';
        cell.model.value.text = source;
        const index = widget.activeCellIndex;
        const editor = cell.editor;
        editor.setCursorPosition(editor.getPositionAt(10)!);
        NotebookActions.splitCell(widget);
        const cells = widget.model!.cells;
        const newSource =
          cells.get(index).value.text + cells.get(index + 1).value.text;
        expect(newSource).toBe(source);
      });

      it('should preserve leading white space in the second cell', () => {
        const cell = widget.activeCell!;
        const source = 'this\n\n   is a test';
        cell.model.value.text = source;
        const editor = cell.editor;
        editor.setCursorPosition(editor.getPositionAt(4)!);
        NotebookActions.splitCell(widget);
        expect(widget.activeCell!.model.value.text).toBe('   is a test');
      });

      it('should clear the existing selection', () => {
        each(widget.widgets, child => {
          widget.select(child);
        });
        NotebookActions.splitCell(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).toBe(false);
        }
      });

      it('should activate the second cell', () => {
        NotebookActions.splitCell(widget);
        expect(widget.activeCellIndex).toBe(1);
      });

      it('should preserve the types of each cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        NotebookActions.splitCell(widget);
        expect(widget.activeCell).toBeInstanceOf(MarkdownCell);
        const prev = widget.widgets[0];
        expect(prev).toBeInstanceOf(MarkdownCell);
      });

      it('should create two empty cells if there is no content', () => {
        widget.activeCell!.model.value.text = '';
        NotebookActions.splitCell(widget);
        expect(widget.activeCell!.model.value.text).toBe('');
        const prev = widget.widgets[0];
        expect(prev.model.value.text).toBe('');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.splitCell(widget);
        expect(widget.activeCell).toBeUndefined();
      });

      it('should preserve the widget mode', () => {
        NotebookActions.splitCell(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.splitCell(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should be undo-able', () => {
        const source = widget.activeCell!.model.value.text;
        const count = widget.widgets.length;
        NotebookActions.splitCell(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
        const cell = widget.widgets[0];
        expect(cell.model.value.text).toBe(source);
      });
    });

    describe('#mergeCells', () => {
      it('should merge the selected cells', () => {
        let source = widget.activeCell!.model.value.text + '\n\n';
        let next = widget.widgets[1];
        widget.select(next);
        source += next.model.value.text + '\n\n';
        next = widget.widgets[2];
        widget.select(next);
        source += next.model.value.text;
        const count = widget.widgets.length;
        NotebookActions.mergeCells(widget);
        expect(widget.widgets.length).toBe(count - 2);
        expect(widget.activeCell!.model.value.text).toBe(source);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell).toBeUndefined();
      });

      it('should select the next cell if there is only one cell selected', () => {
        let source = widget.activeCell!.model.value.text + '\n\n';
        const next = widget.widgets[1];
        source += next.model.value.text;
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell!.model.value.text).toBe(source);
      });

      it('should clear the outputs of a code cell', () => {
        NotebookActions.mergeCells(widget);
        const cell = widget.activeCell as CodeCell;
        expect(cell.model.outputs.length).toBe(0);
      });

      it('should preserve the widget mode', () => {
        widget.mode = 'edit';
        NotebookActions.mergeCells(widget);
        expect(widget.mode).toBe('edit');
        widget.mode = 'command';
        NotebookActions.mergeCells(widget);
        expect(widget.mode).toBe('command');
      });

      it('should be undo-able', () => {
        const source = widget.activeCell!.model.value.text;
        const count = widget.widgets.length;
        NotebookActions.mergeCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
        const cell = widget.widgets[0];
        expect(cell.model.value.text).toBe(source);
      });

      it('should unrender a markdown cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        let cell = widget.activeCell as MarkdownCell;
        cell.rendered = true;
        NotebookActions.mergeCells(widget);
        cell = widget.activeCell as MarkdownCell;
        expect(cell.rendered).toBe(false);
        expect(widget.mode).toBe('command');
      });

      it('should preserve the cell type of the active cell', () => {
        NotebookActions.changeCellType(widget, 'raw');
        NotebookActions.mergeCells(widget);
        expect(widget.activeCell).toBeInstanceOf(RawCell);
        expect(widget.mode).toBe('command');
      });

      it.each(['raw', 'markdown'])(
        'should merge attachments if the last selected cell is a %s cell',
        (type: CellType) => {
          for (let i = 0; i < 2; i++) {
            NotebookActions.changeCellType(widget, type);
            const markdownCell = widget.widgets[i] as MarkdownCell;
            const attachment: IMimeBundle = { 'text/plain': 'test' };
            markdownCell.model.attachments.set(UUID.uuid4(), attachment);
            widget.select(markdownCell);
          }
          NotebookActions.mergeCells(widget);
          const model = (widget.activeCell as MarkdownCell).model;
          expect(model.attachments.length).toBe(2);
        }
      );

      it('should drop attachments if the last selected cell is a code cell', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        const markdownCell = widget.activeCell as MarkdownCell;
        const attachment: IMimeBundle = { 'text/plain': 'test' };
        markdownCell.model.attachments.set(UUID.uuid4(), attachment);

        const codeCell = widget.widgets[1];
        widget.select(codeCell);
        NotebookActions.changeCellType(widget, 'code');
        NotebookActions.deselectAll(widget);

        widget.select(markdownCell);
        widget.select(codeCell);

        NotebookActions.mergeCells(widget);

        const model = widget.activeCell!.model.toJSON();
        expect(model.cell_type).toEqual('code');
        expect(model.attachments).toBeUndefined();
      });
    });

    describe('#deleteCells()', () => {
      it('should delete the selected cells', () => {
        const next = widget.widgets[1];
        widget.select(next);
        const count = widget.widgets.length;
        NotebookActions.deleteCells(widget);
        expect(widget.widgets.length).toBe(count - 2);
      });

      it('should increment deletedCells model when cells deleted', () => {
        const next = widget.widgets[1];
        widget.select(next);
        const count = widget.model!.deletedCells.length;
        NotebookActions.deleteCells(widget);
        expect(widget.model!.deletedCells.length).toBe(count + 2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.deleteCells(widget);
        expect(widget.activeCell).toBeUndefined();
      });

      it('should switch to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.deleteCells(widget);
        expect(widget.mode).toBe('command');
      });

      it('should activate the cell after the last selected cell', () => {
        widget.activeCellIndex = 4;
        const prev = widget.widgets[2];
        widget.select(prev);
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).toBe(3);
      });

      it('should select the previous cell if the last cell is deleted', () => {
        widget.select(widget.widgets[widget.widgets.length - 1]);
        NotebookActions.deleteCells(widget);
        expect(widget.activeCellIndex).toBe(widget.widgets.length - 1);
      });

      it('should add a code cell if all cells are deleted', async () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.deleteCells(widget);
        await sleep();
        expect(widget.widgets.length).toBe(1);
        expect(widget.activeCell).toBeInstanceOf(CodeCell);
      });

      it('should be undo-able', () => {
        const next = widget.widgets[1];
        widget.select(next);
        const source = widget.activeCell!.model.value.text;
        const count = widget.widgets.length;
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
        const cell = widget.widgets[0];
        expect(cell.model.value.text).toBe(source);
      });

      it('should be undo-able if all the cells are deleted', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        const count = widget.widgets.length;
        const source = widget.widgets[1].model.value.text;
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
        expect(widget.widgets[1].model.value.text).toBe(source);
      });
    });

    describe('#insertAbove()', () => {
      it('should insert a code cell above the active cell', () => {
        const count = widget.widgets.length;
        NotebookActions.insertAbove(widget);
        expect(widget.activeCellIndex).toBe(0);
        expect(widget.widgets.length).toBe(count + 1);
        expect(widget.activeCell).toBeInstanceOf(CodeCell);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.insertAbove(widget);
        expect(widget.activeCell).toBeUndefined();
      });

      it('should widget mode should be preserved', () => {
        NotebookActions.insertAbove(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.insertAbove(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should be undo-able', () => {
        const count = widget.widgets.length;
        NotebookActions.insertAbove(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.insertAbove(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).toBe(false);
        }
      });

      it('should be the new active cell', () => {
        NotebookActions.insertAbove(widget);
        expect(widget.activeCell!.model.value.text).toBe('');
      });
    });

    describe('#insertBelow()', () => {
      it('should insert a code cell below the active cell', () => {
        const count = widget.widgets.length;
        NotebookActions.insertBelow(widget);
        expect(widget.activeCellIndex).toBe(1);
        expect(widget.widgets.length).toBe(count + 1);
        expect(widget.activeCell).toBeInstanceOf(CodeCell);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.insertBelow(widget);
        expect(widget.activeCell).toBeUndefined();
      });

      it('should widget mode should be preserved', () => {
        NotebookActions.insertBelow(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.insertBelow(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should be undo-able', () => {
        const count = widget.widgets.length;
        NotebookActions.insertBelow(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.insertBelow(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).toBe(false);
        }
      });

      it('should be the new active cell', () => {
        NotebookActions.insertBelow(widget);
        expect(widget.activeCell!.model.value.text).toBe('');
      });
    });

    describe('#changeCellType()', () => {
      it('should change the selected cell type(s)', () => {
        let next = widget.widgets[1];
        widget.select(next);
        NotebookActions.changeCellType(widget, 'raw');
        expect(widget.activeCell).toBeInstanceOf(RawCell);
        next = widget.widgets[widget.activeCellIndex + 1];
        expect(next).toBeInstanceOf(RawCell);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.changeCellType(widget, 'code');
        expect(widget.activeCell).toBeUndefined();
      });

      it('should preserve the widget mode', () => {
        NotebookActions.changeCellType(widget, 'code');
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.changeCellType(widget, 'raw');
        expect(widget.mode).toBe('edit');
      });

      it('should be undo-able', () => {
        NotebookActions.changeCellType(widget, 'raw');
        NotebookActions.undo(widget);
        const cell = widget.widgets[0];
        expect(cell).toBeInstanceOf(CodeCell);
      });

      it('should clear the existing selection', () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.changeCellType(widget, 'raw');
        for (let i = 0; i < widget.widgets.length; i++) {
          if (i === widget.activeCellIndex) {
            continue;
          }
          expect(widget.isSelected(widget.widgets[i])).toBe(false);
        }
      });

      it('should unrender markdown cells', () => {
        NotebookActions.changeCellType(widget, 'markdown');
        const cell = widget.activeCell as MarkdownCell;
        expect(cell.rendered).toBe(false);
      });
    });

    describe('#run()', () => {
      it('should run the selected cells', async () => {
        const next = widget.widgets[1] as MarkdownCell;
        widget.select(next);
        const cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        const result = await NotebookActions.run(widget, sessionContext);
        expect(result).toBe(true);
        expect(cell.model.outputs.length).toBeGreaterThan(0);
        expect(next.rendered).toBe(true);
      });

      it('should delete deletedCells metadata when cell run', () => {
        const cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        return NotebookActions.run(widget, sessionContext).then(result => {
          expect(result).toBe(true);
          expect(widget.model!.deletedCells.length).toBe(0);
        });
      });

      it('should be a no-op if there is no model', async () => {
        widget.model = null;
        const result = await NotebookActions.run(widget, sessionContext);
        expect(result).toBe(false);
      });

      it('should activate the last selected cell', async () => {
        const other = widget.widgets[2];
        widget.select(other);
        other.model.value.text = 'a = 1';
        const result = await NotebookActions.run(widget, sessionContext);
        expect(result).toBe(true);
        expect(widget.activeCell).toBe(other);
      });

      it('should clear the selection', async () => {
        const next = widget.widgets[1];
        widget.select(next);
        const result = await NotebookActions.run(widget, sessionContext);
        expect(result).toBe(true);
        expect(widget.isSelected(widget.widgets[0])).toBe(false);
      });

      it('should change to command mode', async () => {
        widget.mode = 'edit';
        const result = await NotebookActions.run(widget, sessionContext);
        expect(result).toBe(true);
        expect(widget.mode).toBe('command');
      });

      it('should handle no session', async () => {
        const result = await NotebookActions.run(widget, undefined);
        expect(result).toBe(true);
        const cell = widget.activeCell as CodeCell;
        expect(cell.model.executionCount).toBeNull();
      });

      it('should stop executing code cells on an error', async () => {
        let cell = widget.model!.contentFactory.createCodeCell({});
        cell.value.text = ERROR_INPUT;
        widget.model!.cells.insert(2, cell);
        widget.select(widget.widgets[2]);
        cell = widget.model!.contentFactory.createCodeCell({});
        widget.model!.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        const result = await NotebookActions.run(widget, ipySessionContext);
        expect(result).toBe(false);
        expect(cell.executionCount).toBeNull();
        await ipySessionContext.session!.kernel!.restart();
      });

      it('should render all markdown cells on an error', async () => {
        const cell = widget.model!.contentFactory.createMarkdownCell({});
        widget.model!.cells.push(cell);
        const child = widget.widgets[widget.widgets.length - 1] as MarkdownCell;
        child.rendered = false;
        widget.select(child);
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const result = await NotebookActions.run(widget, ipySessionContext);
        // Markdown rendering is asynchronous, but the cell
        // provides no way to hook into that. Sleep here
        // to make sure it finishes.
        await sleep(100);
        expect(result).toBe(false);
        expect(child.rendered).toBe(true);
        await ipySessionContext.session!.kernel!.restart();
      });
    });

    describe('#runAndAdvance()', () => {
      it('should run the selected cells ', async () => {
        const next = widget.widgets[1] as MarkdownCell;
        widget.select(next);
        const cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        const result = await NotebookActions.runAndAdvance(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(cell.model.outputs.length).toBeGreaterThan(0);
        expect(next.rendered).toBe(true);
      });

      it('should be a no-op if there is no model', async () => {
        widget.model = null;
        const result = await NotebookActions.runAndAdvance(
          widget,
          sessionContext
        );
        expect(result).toBe(false);
      });

      it('should clear the existing selection', async () => {
        const next = widget.widgets[2];
        widget.select(next);
        const result = await NotebookActions.runAndAdvance(
          widget,
          ipySessionContext
        );
        expect(result).toBe(false);
        expect(widget.isSelected(widget.widgets[0])).toBe(false);
        await ipySessionContext.session!.kernel!.restart();
      });

      it('should change to command mode', async () => {
        widget.mode = 'edit';
        const result = await NotebookActions.runAndAdvance(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(widget.mode).toBe('command');
      });

      it('should activate the cell after the last selected cell', async () => {
        const next = widget.widgets[3] as MarkdownCell;
        widget.select(next);
        const result = await NotebookActions.runAndAdvance(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(widget.activeCellIndex).toBe(4);
      });

      it('should create a new code cell in edit mode if necessary', async () => {
        const count = widget.widgets.length;
        widget.activeCellIndex = count - 1;
        const result = await NotebookActions.runAndAdvance(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(widget.widgets.length).toBe(count + 1);
        expect(widget.activeCell).toBeInstanceOf(CodeCell);
        expect(widget.mode).toBe('edit');
      });

      it('should allow an undo of the new cell', async () => {
        const count = widget.widgets.length;
        widget.activeCellIndex = count - 1;
        const result = await NotebookActions.runAndAdvance(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
      });

      it('should stop executing code cells on an error', async () => {
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const cell = widget.model!.contentFactory.createCodeCell({});
        widget.model!.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        const result = await NotebookActions.runAndAdvance(
          widget,
          ipySessionContext
        );
        expect(result).toBe(false);
        expect(cell.executionCount).toBeNull();
        await ipySessionContext.session!.kernel!.restart();
      });

      it('should render all markdown cells on an error', async () => {
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const cell = widget.widgets[1] as MarkdownCell;
        cell.rendered = false;
        widget.select(cell);
        const result = await NotebookActions.runAndAdvance(
          widget,
          ipySessionContext
        );
        // Markdown rendering is asynchronous, but the cell
        // provides no way to hook into that. Sleep here
        // to make sure it finishes.
        await sleep(100);
        expect(result).toBe(false);
        expect(cell.rendered).toBe(true);
        expect(widget.activeCellIndex).toBe(2);
        await ipySessionContext.session!.kernel!.restart();
      });
    });

    describe('#runAndInsert()', () => {
      it('should run the selected cells ', async () => {
        const next = widget.widgets[1] as MarkdownCell;
        widget.select(next);
        const cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        const result = await NotebookActions.runAndInsert(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(cell.model.outputs.length).toBeGreaterThan(0);
        expect(next.rendered).toBe(true);
      });

      it('should be a no-op if there is no model', async () => {
        widget.model = null;
        const result = await NotebookActions.runAndInsert(
          widget,
          sessionContext
        );
        expect(result).toBe(false);
      });

      it('should clear the existing selection', async () => {
        const next = widget.widgets[1];
        widget.select(next);
        const result = await NotebookActions.runAndInsert(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(widget.isSelected(widget.widgets[0])).toBe(false);
      });

      it('should insert a new code cell in edit mode after the last selected cell', async () => {
        const next = widget.widgets[2];
        widget.select(next);
        next.model.value.text = 'a = 1';
        const count = widget.widgets.length;
        const result = await NotebookActions.runAndInsert(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        expect(widget.activeCell).toBeInstanceOf(CodeCell);
        expect(widget.mode).toBe('edit');
        expect(widget.widgets.length).toBe(count + 1);
      });

      it('should allow an undo of the cell insert', async () => {
        const next = widget.widgets[2];
        widget.select(next);
        next.model.value.text = 'a = 1';
        const count = widget.widgets.length;
        const result = await NotebookActions.runAndInsert(
          widget,
          sessionContext
        );
        expect(result).toBe(true);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
      });

      it('should stop executing code cells on an error', async () => {
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const cell = widget.model!.contentFactory.createCodeCell({});
        widget.model!.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        const result = await NotebookActions.runAndInsert(
          widget,
          ipySessionContext
        );
        expect(result).toBe(false);
        expect(cell.executionCount).toBeNull();
        await ipySessionContext.session!.kernel!.restart();
      });

      it('should render all markdown cells on an error', async () => {
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const cell = widget.widgets[1] as MarkdownCell;
        cell.rendered = false;
        widget.select(cell);
        const result = await NotebookActions.runAndInsert(
          widget,
          ipySessionContext
        );
        // Markdown rendering is asynchronous, but the cell
        // provides no way to hook into that. Sleep here
        // to make sure it finishes.
        await sleep(100);
        expect(result).toBe(false);
        expect(cell.rendered).toBe(true);
        expect(widget.activeCellIndex).toBe(2);
        await ipySessionContext.session!.kernel!.restart();
      });
    });

    describe('#runAll()', () => {
      beforeEach(() => {
        // Make sure all cells have valid code.
        widget.widgets[2].model.value.text = 'a = 1';
      });

      it('should run all of the cells in the notebok', async () => {
        const next = widget.widgets[1] as MarkdownCell;
        const cell = widget.activeCell as CodeCell;
        cell.model.outputs.clear();
        next.rendered = false;
        const result = await NotebookActions.runAll(widget, sessionContext);
        expect(result).toBe(true);
        expect(cell.model.outputs.length).toBeGreaterThan(0);
        expect(next.rendered).toBe(true);
      });

      it('should be a no-op if there is no model', async () => {
        widget.model = null;
        const result = await NotebookActions.runAll(widget, sessionContext);
        expect(result).toBe(false);
      });

      it('should change to command mode', async () => {
        widget.mode = 'edit';
        const result = await NotebookActions.runAll(widget, sessionContext);
        expect(result).toBe(true);
        expect(widget.mode).toBe('command');
      });

      it('should clear the existing selection', async () => {
        const next = widget.widgets[2];
        widget.select(next);
        const result = await NotebookActions.runAll(widget, sessionContext);
        expect(result).toBe(true);
        expect(widget.isSelected(widget.widgets[2])).toBe(false);
      });

      it('should activate the last cell', async () => {
        await NotebookActions.runAll(widget, sessionContext);
        expect(widget.activeCellIndex).toBe(widget.widgets.length - 1);
      });

      it('should stop executing code cells on an error', async () => {
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const cell = widget.model!.contentFactory.createCodeCell({});
        widget.model!.cells.push(cell);
        const result = await NotebookActions.runAll(widget, ipySessionContext);
        expect(result).toBe(false);
        expect(cell.executionCount).toBeNull();
        expect(widget.activeCellIndex).toBe(widget.widgets.length - 1);
        await ipySessionContext.session!.kernel!.restart();
      });

      it('should render all markdown cells on an error', async () => {
        widget.activeCell!.model.value.text = ERROR_INPUT;
        const cell = widget.widgets[1] as MarkdownCell;
        cell.rendered = false;
        const result = await NotebookActions.runAll(widget, ipySessionContext);
        // Markdown rendering is asynchronous, but the cell
        // provides no way to hook into that. Sleep here
        // to make sure it finishes.
        await sleep(100);
        expect(result).toBe(false);
        expect(cell.rendered).toBe(true);
        await ipySessionContext.session!.kernel!.restart();
      });
    });

    describe('#selectAbove()', () => {
      it('should select the cell above the active cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should not wrap around to the bottom', () => {
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should preserve the mode', () => {
        widget.activeCellIndex = 2;
        NotebookActions.selectAbove(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.selectAbove(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should skip collapsed cells in edit mode', () => {
        widget.activeCellIndex = 3;
        widget.mode = 'edit';
        widget.widgets[1].inputHidden = true;
        widget.widgets[2].inputHidden = true;
        widget.widgets[3].inputHidden = false;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should not change if in edit mode and no non-collapsed cells above', () => {
        widget.activeCellIndex = 1;
        widget.mode = 'edit';
        widget.widgets[0].inputHidden = true;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).toBe(1);
      });

      it('should not skip collapsed cells and in command mode', () => {
        widget.activeCellIndex = 3;
        widget.mode = 'command';
        widget.widgets[1].inputHidden = true;
        widget.widgets[2].inputHidden = true;
        widget.widgets[3].inputHidden = false;
        NotebookActions.selectAbove(widget);
        expect(widget.activeCellIndex).toBe(2);
      });
    });

    describe('#selectBelow()', () => {
      it('should select the cell below the active cell', () => {
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).toBe(1);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should not wrap around to the top', () => {
        widget.activeCellIndex = widget.widgets.length - 1;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).not.toBe(0);
      });

      it('should preserve the mode', () => {
        widget.activeCellIndex = 2;
        NotebookActions.selectBelow(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.selectBelow(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should skip collapsed cells in edit mode', () => {
        widget.activeCellIndex = 0;
        widget.mode = 'edit';
        widget.widgets[1].inputHidden = true;
        widget.widgets[2].inputHidden = true;
        widget.widgets[3].inputHidden = false;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).toBe(3);
      });

      it('should not change if in edit mode and no non-collapsed cells below', () => {
        widget.activeCellIndex = widget.widgets.length - 2;
        widget.mode = 'edit';
        widget.widgets[widget.widgets.length - 1].inputHidden = true;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).toBe(widget.widgets.length - 2);
      });

      it('should not skip collapsed cells and in command mode', () => {
        widget.activeCellIndex = 0;
        widget.mode = 'command';
        widget.widgets[1].inputHidden = true;
        widget.widgets[2].inputHidden = true;
        widget.widgets[3].inputHidden = false;
        NotebookActions.selectBelow(widget);
        expect(widget.activeCellIndex).toBe(1);
      });
    });

    describe('#extendSelectionAbove()', () => {
      it('should extend the selection to the cell above', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(widget.widgets[0])).toBe(true);
      });

      it('should extend the selection to the topmost cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget, true);
        for (let i = widget.activeCellIndex; i >= 0; i--) {
          expect(widget.isSelected(widget.widgets[i])).toBe(true);
        }
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should change to command mode if there is a selection', () => {
        widget.mode = 'edit';
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.mode).toBe('command');
      });

      it('should not wrap around to the bottom', () => {
        widget.mode = 'edit';
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).toBe(0);
        const last = widget.widgets[widget.widgets.length - 1];
        expect(widget.isSelected(last)).toBe(false);
        expect(widget.mode).toBe('edit');
      });

      it('should deselect the current cell if the cell above is selected', () => {
        NotebookActions.extendSelectionBelow(widget);
        NotebookActions.extendSelectionBelow(widget);
        const cell = widget.activeCell!;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(cell)).toBe(false);
      });

      it('should select only the first cell if we move from the second to first', () => {
        NotebookActions.extendSelectionBelow(widget);
        const cell = widget.activeCell!;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.isSelected(cell)).toBe(false);
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should activate the cell', () => {
        widget.activeCellIndex = 1;
        NotebookActions.extendSelectionAbove(widget);
        expect(widget.activeCellIndex).toBe(0);
      });
    });

    describe('#extendSelectionBelow()', () => {
      it('should extend the selection to the cell below', () => {
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(widget.widgets[0])).toBe(true);
        expect(widget.isSelected(widget.widgets[1])).toBe(true);
      });

      it('should extend the selection the bottomost cell', () => {
        NotebookActions.extendSelectionBelow(widget, true);
        for (let i = widget.activeCellIndex; i < widget.widgets.length; i++) {
          expect(widget.isSelected(widget.widgets[i])).toBe(true);
        }
      });
      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should change to command mode if there is a selection', () => {
        widget.mode = 'edit';
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.mode).toBe('command');
      });

      it('should not wrap around to the top', () => {
        const last = widget.widgets.length - 1;
        widget.activeCellIndex = last;
        widget.mode = 'edit';
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).toBe(last);
        expect(widget.isSelected(widget.widgets[0])).toBe(false);
        expect(widget.mode).toBe('edit');
      });

      it('should deselect the current cell if the cell below is selected', () => {
        const last = widget.widgets.length - 1;
        widget.activeCellIndex = last;
        NotebookActions.extendSelectionAbove(widget);
        NotebookActions.extendSelectionAbove(widget);
        const current = widget.activeCell!;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(current)).toBe(false);
      });

      it('should select only the last cell if we move from the second last to last', () => {
        const last = widget.widgets.length - 1;
        widget.activeCellIndex = last;
        NotebookActions.extendSelectionAbove(widget);
        const current = widget.activeCell!;
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.isSelected(current)).toBe(false);
        expect(widget.activeCellIndex).toBe(last);
      });

      it('should activate the cell', () => {
        NotebookActions.extendSelectionBelow(widget);
        expect(widget.activeCellIndex).toBe(1);
      });
    });

    describe('#moveUp()', () => {
      it('should move the selected cells up', () => {
        widget.activeCellIndex = 2;
        NotebookActions.extendSelectionAbove(widget);
        NotebookActions.moveUp(widget);
        expect(widget.isSelected(widget.widgets[0])).toBe(true);
        expect(widget.isSelected(widget.widgets[1])).toBe(true);
        expect(widget.isSelected(widget.widgets[2])).toBe(false);
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.moveUp(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should not wrap around to the bottom', () => {
        expect(widget.activeCellIndex).toBe(0);
        NotebookActions.moveUp(widget);
        expect(widget.activeCellIndex).toBe(0);
      });

      it('should be undo-able', () => {
        widget.activeCellIndex++;
        const source = widget.activeCell!.model.value.text;
        NotebookActions.moveUp(widget);
        expect(widget.model!.cells.get(0).value.text).toBe(source);
        NotebookActions.undo(widget);
        expect(widget.model!.cells.get(1).value.text).toBe(source);
      });
    });

    describe('#moveDown()', () => {
      it('should move the selected cells down', () => {
        NotebookActions.extendSelectionBelow(widget);
        NotebookActions.moveDown(widget);
        expect(widget.isSelected(widget.widgets[0])).toBe(false);
        expect(widget.isSelected(widget.widgets[1])).toBe(true);
        expect(widget.isSelected(widget.widgets[2])).toBe(true);
        expect(widget.activeCellIndex).toBe(2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.moveUp(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should not wrap around to the top', () => {
        widget.activeCellIndex = widget.widgets.length - 1;
        NotebookActions.moveDown(widget);
        expect(widget.activeCellIndex).toBe(widget.widgets.length - 1);
      });

      it('should be undo-able', () => {
        const source = widget.activeCell!.model.value.text;
        NotebookActions.moveDown(widget);
        expect(widget.model!.cells.get(1).value.text).toBe(source);
        NotebookActions.undo(widget);
        expect(widget.model!.cells.get(0).value.text).toBe(source);
      });
    });

    describe('#copy()', () => {
      it('should copy the selected cells to a utils.clipboard', () => {
        const next = widget.widgets[1];
        widget.select(next);
        NotebookActions.copy(widget);
        expect(utils.clipboard.hasData(JUPYTER_CELL_MIME)).toBe(true);
        const data = utils.clipboard.getData(JUPYTER_CELL_MIME);
        expect(data.length).toBe(2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.copy(widget);
        expect(utils.clipboard.hasData(JUPYTER_CELL_MIME)).toBe(false);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.copy(widget);
        expect(widget.mode).toBe('command');
      });

      it('should delete metadata.deletable', () => {
        const next = widget.widgets[1];
        widget.select(next);
        next.model.metadata.set('deletable', false);
        NotebookActions.copy(widget);
        const data = utils.clipboard.getData(JUPYTER_CELL_MIME) as JSONArray;
        data.map(cell => {
          expect(
            ((cell as JSONObject).metadata as JSONObject).deletable
          ).toBeUndefined();
        });
      });
    });

    describe('#cut()', () => {
      it('should cut the selected cells to a utils.clipboard', () => {
        const next = widget.widgets[1];
        widget.select(next);
        const count = widget.widgets.length;
        NotebookActions.cut(widget);
        expect(widget.widgets.length).toBe(count - 2);
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.cut(widget);
        expect(utils.clipboard.hasData(JUPYTER_CELL_MIME)).toBe(false);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.cut(widget);
        expect(widget.mode).toBe('command');
      });

      it('should be undo-able', () => {
        const source = widget.activeCell!.model.value.text;
        NotebookActions.cut(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets[0].model.value.text).toBe(source);
      });

      it('should add a new code cell if all cells were cut', async () => {
        for (let i = 0; i < widget.widgets.length; i++) {
          widget.select(widget.widgets[i]);
        }
        NotebookActions.cut(widget);
        await sleep();
        expect(widget.widgets.length).toBe(1);
        expect(widget.activeCell).toBeInstanceOf(CodeCell);
      });
    });

    describe('#paste()', () => {
      it('should paste cells from a utils.clipboard', () => {
        const source = widget.activeCell!.model.value.text;
        const next = widget.widgets[1];
        widget.select(next);
        const count = widget.widgets.length;
        NotebookActions.cut(widget);
        widget.activeCellIndex = 1;
        NotebookActions.paste(widget);
        expect(widget.widgets.length).toBe(count);
        expect(widget.widgets[2].model.value.text).toBe(source);
        expect(widget.activeCellIndex).toBe(3);
      });

      it('should be a no-op if there is no model', () => {
        NotebookActions.copy(widget);
        widget.model = null;
        NotebookActions.paste(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should be a no-op if there is no cell data on the utils.clipboard', () => {
        const count = widget.widgets.length;
        NotebookActions.paste(widget);
        expect(widget.widgets.length).toBe(count);
      });

      it('should change to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.cut(widget);
        NotebookActions.paste(widget);
        expect(widget.mode).toBe('command');
      });

      it('should be undo-able', () => {
        const next = widget.widgets[1];
        widget.select(next);
        const count = widget.widgets.length;
        NotebookActions.cut(widget);
        widget.activeCellIndex = 1;
        NotebookActions.paste(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count - 2);
      });
    });

    describe('#undo()', () => {
      it('should undo a cell action', () => {
        const count = widget.widgets.length;
        const next = widget.widgets[1];
        widget.select(next);
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count);
      });

      it('should switch the widget to command mode', () => {
        widget.mode = 'edit';
        NotebookActions.undo(widget);
        expect(widget.mode).toBe('command');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.undo(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should be a no-op if there are no cell actions to undo', () => {
        const count = widget.widgets.length;
        NotebookActions.deleteCells(widget);
        widget.model!.cells.clearUndo();
        NotebookActions.undo(widget);
        expect(widget.widgets.length).toBe(count - 1);
      });
    });

    describe('#redo()', () => {
      it('should redo a cell action', () => {
        const count = widget.widgets.length;
        const next = widget.widgets[1];
        widget.select(next);
        NotebookActions.deleteCells(widget);
        NotebookActions.undo(widget);
        NotebookActions.redo(widget);
        expect(widget.widgets.length).toBe(count - 2);
      });

      it('should switch the widget to command mode', () => {
        NotebookActions.undo(widget);
        widget.mode = 'edit';
        NotebookActions.redo(widget);
        expect(widget.mode).toBe('command');
      });

      it('should be a no-op if there is no model', () => {
        NotebookActions.undo(widget);
        widget.model = null;
        NotebookActions.redo(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should be a no-op if there are no cell actions to redo', () => {
        const count = widget.widgets.length;
        NotebookActions.redo(widget);
        expect(widget.widgets.length).toBe(count);
      });
    });

    describe('#toggleAllLineNumbers()', () => {
      it('should toggle line numbers on all cells', () => {
        const state = widget.activeCell!.editor.getOption('lineNumbers');
        NotebookActions.toggleAllLineNumbers(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          const lineNumbers = widget.widgets[i].editor.getOption('lineNumbers');
          expect(lineNumbers).toBe(!state);
        }
      });

      it('should be based on the state of the active cell', () => {
        const state = widget.activeCell!.editor.getOption('lineNumbers');
        for (let i = 1; i < widget.widgets.length; i++) {
          widget.widgets[i].editor.setOption('lineNumbers', !state);
        }
        NotebookActions.toggleAllLineNumbers(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          const lineNumbers = widget.widgets[i].editor.getOption('lineNumbers');
          expect(lineNumbers).toBe(!state);
        }
      });

      it('should preserve the widget mode', () => {
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.toggleAllLineNumbers(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });
    });

    describe('#clearOutputs()', () => {
      it('should clear the outputs on the selected cells', () => {
        // Select the next code cell that has outputs.
        let index = 0;
        for (let i = 1; i < widget.widgets.length; i++) {
          const cell = widget.widgets[i];
          if (cell instanceof CodeCell && cell.model.outputs.length) {
            widget.select(cell);
            index = i;
            break;
          }
        }
        NotebookActions.clearOutputs(widget);
        let cell = widget.widgets[0] as CodeCell;
        expect(cell.model.outputs.length).toBe(0);
        cell = widget.widgets[index] as CodeCell;
        expect(cell.model.outputs.length).toBe(0);
      });

      it('should preserve the widget mode', () => {
        NotebookActions.clearOutputs(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.clearOutputs(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.clearOutputs(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });
    });

    describe('#clearAllOutputs()', () => {
      it('should clear the outputs on all cells', () => {
        const next = widget.widgets[1];
        widget.select(next);
        NotebookActions.clearAllOutputs(widget);
        for (let i = 0; i < widget.widgets.length; i++) {
          const cell = widget.widgets[i];
          if (cell instanceof CodeCell) {
            expect(cell.model.outputs.length).toBe(0);
          }
        }
      });

      it('should preserve the widget mode', () => {
        NotebookActions.clearAllOutputs(widget);
        expect(widget.mode).toBe('command');
        widget.mode = 'edit';
        NotebookActions.clearAllOutputs(widget);
        expect(widget.mode).toBe('edit');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.clearAllOutputs(widget);
        expect(widget.activeCellIndex).toBe(-1);
      });
    });

    describe('#setMarkdownHeader()', () => {
      it('should set the markdown header level of selected cells', () => {
        const next = widget.widgets[1];
        widget.select(next);
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell!.model.value.text.slice(0, 3)).toBe('## ');
        expect(next.model.value.text.slice(0, 3)).toBe('## ');
      });

      it('should convert the cells to markdown type', () => {
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell).toBeInstanceOf(MarkdownCell);
      });

      it('should be clamped between 1 and 6', () => {
        NotebookActions.setMarkdownHeader(widget, -1);
        expect(widget.activeCell!.model.value.text.slice(0, 2)).toBe('# ');
        NotebookActions.setMarkdownHeader(widget, 10);
        expect(widget.activeCell!.model.value.text.slice(0, 7)).toBe('###### ');
      });

      it('should be a no-op if there is no model', () => {
        widget.model = null;
        NotebookActions.setMarkdownHeader(widget, 1);
        expect(widget.activeCellIndex).toBe(-1);
      });

      it('should replace an existing header', () => {
        widget.activeCell!.model.value.text = '# foo';
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell!.model.value.text).toBe('## foo');
      });

      it('should replace leading white space', () => {
        widget.activeCell!.model.value.text = '      foo';
        NotebookActions.setMarkdownHeader(widget, 2);
        expect(widget.activeCell!.model.value.text).toBe('## foo');
      });

      it('should unrender the cells', () => {
        NotebookActions.setMarkdownHeader(widget, 1);
        expect((widget.activeCell as MarkdownCell).rendered).toBe(false);
      });
    });

    describe('#trust()', () => {
      it('should trust the notebook cells if the user accepts', async () => {
        const model = widget.model!;
        model.fromJSON(utils.DEFAULT_CONTENT);
        const cell = model.cells.get(0);
        expect(cell.trusted).not.toBe(true);
        const promise = NotebookActions.trust(widget);
        await acceptDialog();
        await promise;
        expect(cell.trusted).toBe(true);
      });

      it('should not trust the notebook cells if the user aborts', async () => {
        const model = widget.model!;
        model.fromJSON(utils.DEFAULT_CONTENT);
        const cell = model.cells.get(0);
        expect(cell.trusted).not.toBe(true);
        const promise = NotebookActions.trust(widget);
        await dismissDialog();
        await promise;
        expect(cell.trusted).not.toBe(true);
      });

      it('should be a no-op if the model is `null`', async () => {
        widget.model = null;
        await NotebookActions.trust(widget);
      });

      it('should show a dialog if all cells are trusted', async () => {
        const model = widget.model!;
        model.fromJSON(utils.DEFAULT_CONTENT);
        model.fromJSON(utils.DEFAULT_CONTENT);
        for (let i = 0; i < model.cells.length; i++) {
          const cell = model.cells.get(i);
          cell.trusted = true;
        }
        const promise = NotebookActions.trust(widget);
        await acceptDialog();
        await promise;
      });
    });
  });
});
