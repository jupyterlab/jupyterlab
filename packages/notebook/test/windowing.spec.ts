// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { NotebookModel, NotebookViewModel } from '@jupyterlab/notebook';
import * as utils from './utils';

describe('@jupyterlab/notebook', () => {
  describe('NotebookViewModel', () => {
    describe('#setEstimatedWidgetSize()', () => {
      it('should ignore non-positive height estimates', () => {
        const model = new NotebookModel();
        model.fromJSON(utils.DEFAULT_CONTENT);
        const notebook = utils.createNotebook();
        notebook.model = model;

        const viewModel = new NotebookViewModel([...notebook.widgets]);
        const cellId = notebook.widgets[0].model.id;
        const fallbackEstimate = viewModel.estimateWidgetSize(0);
        expect(fallbackEstimate).toBeGreaterThan(0);

        viewModel.setEstimatedWidgetSize(cellId, 0);
        expect(viewModel.estimateWidgetSize(0)).toBe(fallbackEstimate);

        viewModel.setEstimatedWidgetSize(cellId, -10);
        expect(viewModel.estimateWidgetSize(0)).toBe(fallbackEstimate);

        viewModel.setEstimatedWidgetSize(cellId, 120);
        expect(viewModel.estimateWidgetSize(0)).toBe(120);

        // A subsequent 0 measurement should not overwrite a valid estimate
        viewModel.setEstimatedWidgetSize(cellId, 0);
        expect(viewModel.estimateWidgetSize(0)).toBe(120);

        // Passing null clears the stored estimate
        viewModel.setEstimatedWidgetSize(cellId, null);
        expect(viewModel.estimateWidgetSize(0)).toBe(fallbackEstimate);

        viewModel.dispose();
        notebook.dispose();
        model.dispose();
      });
    });
  });
});
