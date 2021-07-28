// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { CodeCell, MarkdownCell } from '@jupyterlab/cells';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import {
  createSessionContext,
  sleep
} from '@jupyterlab/testutils';
import { JupyterServer } from '@jupyterlab/testutils/lib/start_jupyter_server';
import { KernelError, Notebook, NotebookActions, NotebookModel } from '../src';
import * as utils from './utils';

const ERROR_INPUT = 'a = foo';


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

  describe('ExecutionIndicator', () => {
    let widget: Notebook;
    let sessionContext: ISessionContext;
    let ipySessionContext: ISessionContext;

    beforeAll(async function () {
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
      model.sharedModel.clearUndoHistory();

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
        let failed = 0;
        widget.select(next);
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.executed.connect((_, args) => {
          const { success } = args;
          emitted += 1;
          if (!success) {
            failed += 1;
          }
        });

        await NotebookActions.run(widget, sessionContext);
        expect(emitted).toBe(2);
        expect(failed).toBe(0);
        expect(next.rendered).toBe(true);
      });

      it('should emit an error for a cell execution failure.', async () => {
        let emitted = 0;
        let failed = 0;
        let cellError: KernelError | null | undefined = null;
        NotebookActions.executed.connect((_, args) => {
          const { success, error } = args;
          emitted += 1;
          if (!success) {
            failed += 1;
            cellError = error;
          }
        });

        const cell = widget.model!.contentFactory.createCodeCell({});
        cell.value.text = ERROR_INPUT;
        widget.model!.cells.push(cell);
        widget.select(widget.widgets[widget.widgets.length - 1]);
        const result = await NotebookActions.run(widget, ipySessionContext);
        expect(result).toBe(false);
        expect(emitted).toBe(2);
        expect(failed).toBe(1);
        expect(cellError).toBeInstanceOf(KernelError);
        expect(cellError!.errorName).toBe('NameError');
        expect(cellError!.errorValue).toBe("name 'foo' is not defined");
        expect(cellError!.traceback).not.toBeNull();
        await ipySessionContext.session!.kernel!.restart();
      });
    });

    describe('#executionScheduled', () => {
      it('should emit only when code cell execution is scheduled', async () => {
        const cell = widget.activeCell as CodeCell;
        const next = widget.widgets[1] as MarkdownCell;
        let emitted = 0;
        widget.activeCell!.model.value.text = "print('hello')";
        widget.select(next);
        cell.model.outputs.clear();
        next.rendered = false;
        NotebookActions.executionScheduled.connect(() => {
          emitted += 1;
        });

        await NotebookActions.run(widget, sessionContext);
        expect(emitted).toBe(1);
        expect(next.rendered).toBe(true);
      });
    });

    describe('#runAll()', () => {
      beforeEach(() => {
        // Make sure all cells have valid code.
        widget.widgets[2].model.value.text = 'a = 1';
      });

      it('should run all of the cells in the notebook', async () => {
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

  });
});
