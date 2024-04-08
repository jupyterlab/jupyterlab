// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookModel,
  NotebookPanel,
  NotebookToCModel
} from '@jupyterlab/notebook';
import { Context } from '@jupyterlab/docregistry';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { Sanitizer } from '@jupyterlab/apputils';
import { signalToPromise } from '@jupyterlab/testing';
import * as utils from './utils';

describe('@jupyterlab/notebook', () => {
  describe('NotebookToCModel', () => {
    let context: Context<INotebookModel>;
    let panel: NotebookPanel;
    let model: NotebookToCModel;
    const sanitizer = new Sanitizer();
    const initialCells = [{ cell_type: 'markdown', source: '# heading' }];

    beforeEach(async () => {
      context = await NBTestUtils.createMockContext(false);
      panel = utils.createNotebookPanel(context);
      model = new NotebookToCModel(panel, null, sanitizer);
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
  });
});
