// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IWidgetTracker } from '@jupyterlab/apputils';
import { Sanitizer } from '@jupyterlab/apputils';
import type { Cell } from '@jupyterlab/cells';
import type { Context } from '@jupyterlab/docregistry';
import type {
  INotebookModel,
  KernelError,
  NotebookPanel
} from '@jupyterlab/notebook';
import {
  NotebookToCFactory,
  NotebookToCModel,
  RunningStatus
} from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { signalToPromise } from '@jupyterlab/testing';
import * as utils from './utils';

class TestKernelError extends Error {
  readonly errorName = 'ZeroDivisionError';
  readonly errorValue = 'division by zero';
  readonly traceback: string[] = [];
}

class TestNotebookToCModel extends NotebookToCModel {
  scheduleExecution(cell: Cell): void {
    this.onExecutionScheduled(null, { notebook: this.widget.content, cell });
  }

  finishExecution(
    cell: Cell,
    success: boolean,
    error: KernelError | null
  ): void {
    this.onExecuted(null, {
      notebook: this.widget.content,
      cell,
      success,
      error
    });
  }
}

describe('@jupyterlab/notebook', () => {
  describe('NotebookToCModel', () => {
    let context: Context<INotebookModel>;
    let panel: NotebookPanel;
    let model: TestNotebookToCModel;
    const sanitizer = new Sanitizer();
    const initialCells = [{ cell_type: 'markdown', source: '# heading' }];

    beforeEach(async () => {
      context = await NBTestUtils.createMockContext(false);
      panel = utils.createNotebookPanel(context);
      model = new TestNotebookToCModel(panel, null, sanitizer);
      panel.model!.sharedModel.insertCells(0, initialCells);
    });

    afterEach(() => {
      context.dispose();
    });

    describe('#headingsChanged', () => {
      it('should be emitted on cell insertion/deletion', async () => {
        // Should be called on insertion
        panel.model!.sharedModel.insertCells(0, [
          { cell_type: 'markdown', source: '# heading 2' }
        ]);
        let promise = signalToPromise(model.headingsChanged);
        await model.refresh();
        await promise;
        expect(model.headings).toHaveLength(2);

        // Should be called on deletion
        panel.model!.sharedModel.deleteCell(0);
        promise = signalToPromise(model.headingsChanged);
        await model.refresh();
        await promise;
        expect(model.headings).toHaveLength(1);
      });

      it('should be emitted when reloading notebook model', async () => {
        // Note: if in future the `NotebookPanel` gets reworked to retain
        // widgets for cells which did not change (rather than re-created
        // them each time), this test may be no longer needed.

        // Setup the notebook model
        const content = {
          ...utils.DEFAULT_CONTENT,
          cells: initialCells
        };
        let promise = signalToPromise(model.headingsChanged);
        panel.model!.fromJSON(content);
        await model.refresh();
        await promise;

        // Simulate update via "Revert" button, which will rebuilding the notebook
        // widget from scratch (delete old cells and add new cells).
        panel.model!.fromJSON(content);

        // Should emit because cell references would have changed.
        promise = signalToPromise(model.headingsChanged);
        await model.refresh();
        await promise;
      });
    });

    describe('#refresh', () => {
      it('should clear error status when an errored cell is deleted', async () => {
        panel.model!.sharedModel.insertCells(1, [
          { cell_type: 'code', source: '1 / 2' },
          { cell_type: 'code', source: '1 / 0' },
          { cell_type: 'code', source: '1 / 2' }
        ]);

        await model.refresh();

        const erroredCell = panel.content.widgets[2];
        model.scheduleExecution(erroredCell);
        model.finishExecution(erroredCell, false, new TestKernelError());

        expect(model.headings[0].isRunning).toBe(RunningStatus.Error);

        panel.model!.sharedModel.deleteCell(2);
        expect(panel.content.widgets).not.toContain(erroredCell);
        await model.refresh();

        expect(model.headings[0].isRunning).toBe(RunningStatus.Idle);
        expect(model.headings[0].dataset!['data-running']).toBe(
          RunningStatus.Idle.toString()
        );
      });

      it('should preserve execution status updates during heading refresh', async () => {
        panel.model!.sharedModel.insertCells(1, [
          { cell_type: 'code', source: '1 / 0' }
        ]);

        await model.refresh();

        const headingCell = panel.content.widgets[0];
        const erroredCell = panel.content.widgets[1];
        const getHeadings = headingCell.getHeadings.bind(headingCell);
        let resumeRefresh: (() => void) | undefined;
        const refreshGate = new Promise<void>(resolve => {
          resumeRefresh = resolve;
        });
        const getHeadingsSpy = jest
          .spyOn(headingCell, 'getHeadings')
          .mockImplementation(async () => {
            await refreshGate;
            return getHeadings();
          });

        const refresh = model.refresh();
        await Promise.resolve();

        model.scheduleExecution(erroredCell);
        model.finishExecution(erroredCell, false, new TestKernelError());

        resumeRefresh!();
        await refresh;
        getHeadingsSpy.mockRestore();

        expect(model.headings[0].isRunning).toBe(RunningStatus.Error);
        expect(model.headings[0].dataset!['data-running']).toBe(
          RunningStatus.Error.toString()
        );
      });
    });
  });

  describe('NotebookToCFactory', () => {
    it('refreshes the heading element after a cell is re-rendered', async () => {
      const context = await NBTestUtils.createMockContext(false);
      const panel = utils.createNotebookPanel(context);
      panel.model!.sharedModel.insertCells(0, [
        { cell_type: 'markdown', source: '# heading' }
      ]);

      const cell = panel.content.widgets[0];
      cell.inViewport = true;

      const rendermime = utils.defaultRenderMime();
      const factory = new NotebookToCFactory(
        { has: () => true } as unknown as IWidgetTracker<NotebookPanel>,
        rendermime.markdownParser,
        sanitizer,
        undefined
      );
      const model = factory.createNew(panel);
      await model.refresh();
      await new Promise(resolve => setTimeout(resolve, 0));

      const heading = model.headings[0];
      const initialHeading = cell.node.querySelector('h1');
      expect(initialHeading).not.toBeNull();
      const currentHeading = initialHeading!.cloneNode(true) as HTMLElement;
      initialHeading!.replaceWith(currentHeading);
      const scrollIntoView = jest
        .spyOn(currentHeading, 'scrollIntoView')
        .mockImplementation(() => undefined);

      model.setActiveHeading(heading);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      context.dispose();
    });
  });
});
