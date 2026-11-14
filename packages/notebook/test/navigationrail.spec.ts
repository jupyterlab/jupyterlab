// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICodeCellModel } from '@jupyterlab/cells';
import {
  Notebook,
  NotebookModel,
  NotebookNavigationRail,
  StaticNotebook
} from '@jupyterlab/notebook';
import * as utils from './utils';

const notebookConfig: StaticNotebook.INotebookConfig = {
  ...StaticNotebook.defaultNotebookConfig,
  windowingMode: 'none'
};

function createCodeCell(source = 'print("hello")\n') {
  return {
    cell_type: 'code' as const,
    execution_count: null,
    metadata: { tags: [] },
    outputs: [],
    source: [source]
  };
}

function createMarkdownCell(source = '# Title\n') {
  return {
    cell_type: 'markdown' as const,
    metadata: { tags: [] },
    source: [source]
  };
}

function createNotebookWithCells(): Notebook {
  const widget = new Notebook({
    rendermime: utils.defaultRenderMime(),
    contentFactory: utils.createNotebookFactory(),
    mimeTypeService: utils.mimeTypeService,
    notebookConfig
  });
  const model = new NotebookModel();

  model.fromJSON({
    ...utils.DEFAULT_CONTENT,
    cells: [
      createCodeCell('a = 1'),
      createCodeCell('b = 2'),
      createMarkdownCell('# Notes'),
      createCodeCell('c = 3')
    ]
  });

  widget.model = model;
  return widget;
}

describe('@jupyterlab/notebook', () => {
  describe('NotebookNavigationRail', () => {
    let notebook: Notebook;
    let rail: NotebookNavigationRail;

    beforeEach(() => {
      notebook = createNotebookWithCells();
      rail = notebook.navigationRailWidget!;
    });

    afterEach(() => {
      notebook.dispose();
    });

    it('should be created and attached to the notebook', () => {
      expect(rail).toBeDefined();
      expect(rail.node.classList.contains('jp-Notebook-navigationRail')).toBe(
        true
      );
    });

    it('should render a dot for each cell in the notebook', () => {
      const dots = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-dot'
      );
      expect(dots.length).toBe(4);
    });

    it('should update active dot when active cell changes', () => {
      notebook.activeCellIndex = 1;
      const dots = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-dot'
      );
      expect(dots[1].classList.contains('jp-mod-active')).toBe(true);
      expect(dots[0].classList.contains('jp-mod-active')).toBe(false);

      notebook.activeCellIndex = 2;
      expect(dots[2].classList.contains('jp-mod-active')).toBe(true);
      expect(dots[1].classList.contains('jp-mod-active')).toBe(false);
    });

    it('should display a red dot when a cell has an error output', () => {
      const codeModel = notebook.model!.cells.get(0) as ICodeCellModel;
      codeModel.outputs.fromJSON([
        {
          output_type: 'error',
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: ['ZeroDivisionError: division by zero']
        }
      ]);

      const dots = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-dot'
      );
      expect(dots[0].classList.contains('jp-mod-error')).toBe(true);
      expect(dots[0].getAttribute('aria-label')).toContain('ZeroDivisionError');
    });

    it('should clear error state when cell outputs are cleared', () => {
      const codeModel = notebook.model!.cells.get(0) as ICodeCellModel;
      codeModel.outputs.fromJSON([
        {
          output_type: 'error',
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: ['ZeroDivisionError: division by zero']
        }
      ]);

      const dots = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-dot'
      );
      expect(dots[0].classList.contains('jp-mod-error')).toBe(true);

      codeModel.outputs.clear();
      expect(dots[0].classList.contains('jp-mod-error')).toBe(false);
    });

    it('should change active cell on dot click', () => {
      const dots = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-dot'
      ) as NodeListOf<HTMLElement>;
      expect(dots.length).toBe(4);

      dots[3].click();
      expect(notebook.activeCellIndex).toBe(3);
    });

    it('should dynamically update dots when cells are added or removed', () => {
      notebook.model!.sharedModel.insertCell(4, {
        cell_type: 'code',
        metadata: {}
      });

      let dots = rail.node.querySelectorAll('.jp-Notebook-navigationRail-dot');
      expect(dots.length).toBe(5);

      notebook.model!.sharedModel.deleteCell(0);
      dots = rail.node.querySelectorAll('.jp-Notebook-navigationRail-dot');
      expect(dots.length).toBe(4);
    });

    it('should toggle visibility when notebookConfig.showCellNavigationRail changes', () => {
      expect(notebook.navigationRail).toBe(true);

      notebook.notebookConfig = {
        ...notebook.notebookConfig,
        showCellNavigationRail: false
      };
      expect(notebook.navigationRail).toBe(false);

      notebook.notebookConfig = {
        ...notebook.notebookConfig,
        showCellNavigationRail: true
      };
      expect(notebook.navigationRail).toBe(true);
    });
  });
});
