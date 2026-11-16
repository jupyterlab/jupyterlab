// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICellModel } from '@jupyterlab/cells';
import { isCodeCellModel } from '@jupyterlab/cells';
import type { Notebook } from '@jupyterlab/notebook';
import {
  NotebookActions,
  NotebookModel,
  NotebookTrustStatus
} from '@jupyterlab/notebook';
import * as utils from './utils';

/**
 * Spy on the trust getter of each cell.
 */
function spyOnTrust(cells: Iterable<ICellModel>): jest.SpyInstance[] {
  return Array.from(cells, cell => jest.spyOn(cell, 'trusted', 'get'));
}

describe('@jupyterlab/notebook', () => {
  describe('NotebookTrustStatus.Model', () => {
    let notebook: Notebook;
    let model: NotebookModel;
    let status: NotebookTrustStatus.Model;

    beforeEach(() => {
      model = new NotebookModel();
      model.sharedModel.insertCells(0, [
        { cell_type: 'code', metadata: { trusted: true } },
        { cell_type: 'markdown' },
        { cell_type: 'code', metadata: { trusted: false } }
      ]);
      notebook = utils.createNotebook();
      notebook.model = model;
      status = new NotebookTrustStatus.Model();
      status.notebook = notebook;
    });

    afterEach(() => {
      jest.restoreAllMocks();
      status.dispose();
      notebook.dispose();
      model.dispose();
    });

    describe('#notebook', () => {
      it('should count the code cells of a new model', () => {
        const replacement = new NotebookModel();
        replacement.sharedModel.insertCell(0, {
          cell_type: 'code',
          metadata: { trusted: true }
        });

        notebook.model = replacement;

        expect(status.trustedCells).toBe(1);
        expect(status.totalCells).toBe(1);
        replacement.dispose();
      });

      it('should not count again for changes in the previous notebook', () => {
        const other = utils.createNotebook();
        const otherModel = new NotebookModel();
        otherModel.sharedModel.insertCell(0, { cell_type: 'code' });
        other.model = otherModel;
        status.notebook = other;
        const reads = spyOnTrust(otherModel.cells);

        model.cells.get(2).trusted = true;
        model.sharedModel.insertCell(0, { cell_type: 'code' });

        for (const read of reads) {
          expect(read).not.toHaveBeenCalled();
        }
        other.dispose();
        otherModel.dispose();
      });

      it('should reset the counts when set to null', () => {
        status.notebook = null;

        expect(status.trustedCells).toBe(0);
        expect(status.totalCells).toBe(0);
        expect(status.activeCellTrusted).toBe(false);
      });
    });

    describe('#totalCells', () => {
      it('should count a code cell that is added', () => {
        model.sharedModel.insertCell(3, { cell_type: 'code' });

        expect(status.totalCells).toBe(3);
      });

      it('should not count a code cell that is removed', () => {
        model.sharedModel.deleteCell(0);

        expect(status.totalCells).toBe(1);
        expect(status.trustedCells).toBe(0);
      });

      it('should not count a code cell changed to Markdown', () => {
        notebook.activeCellIndex = 0;

        NotebookActions.changeCellType(notebook, 'markdown');

        expect(status.totalCells).toBe(1);
        expect(status.trustedCells).toBe(0);
      });
    });

    describe('#trustedCells', () => {
      it('should count a code cell that becomes trusted', () => {
        model.cells.get(2).trusted = true;

        expect(status.trustedCells).toBe(2);
      });

      it('should count an added code cell that becomes trusted', () => {
        model.sharedModel.insertCell(3, { cell_type: 'code' });

        model.cells.get(3).trusted = true;

        expect(status.trustedCells).toBe(2);
      });

      it('should not read the trust of cells when a source changes', () => {
        const reads = spyOnTrust(model.cells);

        model.cells.get(0).sharedModel.setSource('print("changed")');

        for (const read of reads) {
          expect(read).not.toHaveBeenCalled();
        }
      });

      it('should not read the trust of cells when outputs change', () => {
        const reads = spyOnTrust(model.cells);
        const cell = model.cells.get(0);
        if (!isCodeCellModel(cell)) {
          throw new Error('Expected a code cell');
        }

        cell.sharedModel.setOutputs([
          { output_type: 'stream', name: 'stdout', text: 'changed' }
        ]);

        for (const read of reads) {
          expect(read).not.toHaveBeenCalled();
        }
      });
    });

    describe('#activeCellTrusted', () => {
      it('should update when the active cell becomes trusted', () => {
        notebook.activeCellIndex = 2;
        expect(status.activeCellTrusted).toBe(false);

        model.cells.get(2).trusted = true;

        expect(status.activeCellTrusted).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should stop counting the cells', () => {
        status.dispose();

        model.cells.get(2).trusted = true;

        expect(status.trustedCells).toBe(1);
      });
    });
  });
});
