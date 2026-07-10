// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import type { Cell } from '@jupyterlab/cells';
import type { Context } from '@jupyterlab/docregistry';
import type {
  INotebookModel,
  KernelError,
  NotebookPanel
} from '@jupyterlab/notebook';
import { NotebookToCModel, RunningStatus } from '@jupyterlab/notebook';
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
    });
  });
});
