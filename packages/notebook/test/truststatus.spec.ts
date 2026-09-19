// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { isCodeCellModel } from '@jupyterlab/cells';
import type { Notebook } from '@jupyterlab/notebook';
import {
  NotebookActions,
  NotebookModel,
  NotebookTrustStatus
} from '@jupyterlab/notebook';
import * as utils from './utils';

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

  function counts(): { trustedCells: number; totalCells: number } {
    return { trustedCells: status.trustedCells, totalCells: status.totalCells };
  }

  function expectNoRescan(): void {
    const reads = Array.from(model.cells, cell =>
      jest.spyOn(cell, 'trusted', 'get')
    );
    try {
      model.cells.get(0).sharedModel.setSource('changed after cells changed');
      for (const read of reads) {
        expect(read).not.toHaveBeenCalled();
      }
    } finally {
      reads.forEach(read => read.mockRestore());
    }
  }

  it('should preserve cell order and counts after a batch insertion', () => {
    model.sharedModel.insertCells(
      0,
      Array.from({ length: 256 }, (_, index) => ({
        cell_type: 'code' as const,
        metadata: { trusted: index % 2 === 0 }
      }))
    );
    expect(counts()).toEqual({ trustedCells: 129, totalCells: 258 });

    model.sharedModel.deleteCell(0);
    expect(counts()).toEqual({ trustedCells: 128, totalCells: 257 });
    model.sharedModel.deleteCell(254);
    expect(counts()).toEqual({ trustedCells: 128, totalCells: 256 });
    model.cells.get(0).trusted = true;
    expect(counts()).toEqual({ trustedCells: 129, totalCells: 256 });
    expectNoRescan();
  });

  it.each([
    [0, 0],
    [2, 1]
  ])('should remove code cell %i from the counts', (index, trusted) => {
    model.sharedModel.deleteCell(index);
    expect(counts()).toEqual({ trustedCells: trusted, totalCells: 1 });
    expectNoRescan();
  });

  it('should track trust changes before removing all cells', () => {
    model.cells.get(0).trusted = false;
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 2 });
    model.sharedModel.deleteCellRange(0, model.cells.length);
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 0 });
    expect(status.activeCellTrusted).toBe(false);
  });

  it.each([
    [0, 2],
    [2, 0]
  ])('should track cells moved from %i to %i', (from, to) => {
    model.sharedModel.moveCell(from, to);
    expect(counts()).toEqual({ trustedCells: 1, totalCells: 2 });

    model.sharedModel.deleteCell(to);
    expect(counts()).toEqual({
      trustedCells: from === 0 ? 0 : 1,
      totalCells: 1
    });
    expectNoRescan();
  });

  it('should restore counts and subscriptions on undo and redo', () => {
    model.sharedModel.clearUndoHistory();
    model.sharedModel.deleteCell(0);
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 1 });

    model.sharedModel.undo();
    expect(counts()).toEqual({ trustedCells: 1, totalCells: 2 });
    model.sharedModel.redo();
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 1 });
    model.sharedModel.undo();
    model.cells.get(0).trusted = false;
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 2 });
  });

  it.each(['markdown', 'raw'] as const)(
    'should track conversion between code and %s cells',
    type => {
      notebook.activeCellIndex = 0;
      NotebookActions.changeCellType(notebook, type);
      expect(counts()).toEqual({ trustedCells: 0, totalCells: 1 });

      NotebookActions.changeCellType(notebook, 'code');
      expect(counts()).toEqual({ trustedCells: 1, totalCells: 2 });
      model.cells.get(0).trusted = false;
      expect(counts()).toEqual({ trustedCells: 0, totalCells: 2 });
    }
  );

  it('should rebuild counts when notebook content is replaced', () => {
    model.fromJSON({
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {},
      cells: [
        {
          cell_type: 'code',
          source: '',
          metadata: { trusted: true },
          execution_count: null,
          outputs: []
        }
      ]
    });
    expect(counts()).toEqual({ trustedCells: 1, totalCells: 1 });
    model.cells.get(0).trusted = false;
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 1 });
  });

  it.each([false, true])(
    'should disconnect the old model when switching notebooks: %s',
    switchNotebook => {
      const replacement = new NotebookModel();
      replacement.sharedModel.insertCell(0, {
        cell_type: 'code',
        metadata: { trusted: true }
      });
      const other = utils.createNotebook();
      try {
        if (switchNotebook) {
          other.model = replacement;
          status.notebook = other;
        } else {
          notebook.model = replacement;
        }
        expect(counts()).toEqual({ trustedCells: 1, totalCells: 1 });

        const changed = jest.fn();
        status.stateChanged.connect(changed);
        model.cells.get(2).trusted = true;
        model.sharedModel.insertCell(0, { cell_type: 'code' });
        expect(counts()).toEqual({ trustedCells: 1, totalCells: 1 });
        expect(changed).not.toHaveBeenCalled();

        replacement.cells.get(0).trusted = false;
        expect(counts()).toEqual({ trustedCells: 0, totalCells: 1 });
        expect(changed).toHaveBeenCalledTimes(1);
      } finally {
        status.notebook = null;
        other.dispose();
        notebook.model = null;
        replacement.dispose();
      }
    }
  );

  it('should reset counts and disconnect when the notebook is cleared', () => {
    model.cells.get(0).trusted = false;
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 2 });
    status.notebook = null;
    model.cells.get(2).trusted = true;
    model.sharedModel.insertCell(0, { cell_type: 'code' });
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 0 });
    expect(status.activeCellTrusted).toBe(false);
  });

  it.each(['source', 'output'])(
    'should not read trust state on %s updates',
    update => {
      const reads = Array.from(model.cells, cell =>
        jest.spyOn(cell, 'trusted', 'get')
      );
      const changed = jest.fn();
      status.stateChanged.connect(changed);
      const cell = model.cells.get(0);
      if (!isCodeCellModel(cell)) {
        throw new Error('Expected a code cell');
      }
      if (update === 'source') {
        cell.sharedModel.setSource('print("changed")');
      } else {
        cell.sharedModel.setOutputs([
          { output_type: 'stream', name: 'stdout', text: 'changed' }
        ]);
      }

      for (const read of reads) {
        expect(read).not.toHaveBeenCalled();
      }
      expect(changed).not.toHaveBeenCalled();
      expect(counts()).toEqual({ trustedCells: 1, totalCells: 2 });
    }
  );

  it('should disconnect signals when disposed', () => {
    model.cells.get(0).trusted = false;
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 2 });
    status.dispose();
    model.cells.get(2).trusted = true;
    model.sharedModel.deleteCell(0);
    expect(counts()).toEqual({ trustedCells: 0, totalCells: 2 });
  });
});
