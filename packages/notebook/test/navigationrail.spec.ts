// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICodeCellModel } from '@jupyterlab/cells';
import type { NotebookNavigationRail } from '@jupyterlab/notebook';
import { Notebook, NotebookModel, StaticNotebook } from '@jupyterlab/notebook';
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
      expect(rail.node.getAttribute('role')).toBe('navigation');
    });

    it('should render a line for each cell in the notebook', () => {
      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      );
      expect(lines.length).toBe(4);
    });

    it('should render a compact, evenly spaced line for every cell', () => {
      notebook.notebookConfig = {
        ...notebook.notebookConfig,
        windowingMode: 'contentVisibility'
      };
      const model = new NotebookModel();
      model.fromJSON({
        ...utils.DEFAULT_CONTENT,
        cells: Array.from({ length: 8 }, (_, index) =>
          createCodeCell(
            index === 2
              ? Array.from({ length: 12 }, () => 'long cell').join('\n')
              : `cell ${index + 1}`
          )
        )
      });
      notebook.model = model;

      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      );
      expect(lines).toHaveLength(8);
      expect(lines[0].getAttribute('aria-label')).toBe('Cell 1 of 8');
      expect(lines[7].getAttribute('aria-label')).toBe('Cell 8 of 8');
      const positions = Array.from(lines, line =>
        Number.parseFloat((line as HTMLElement).style.top)
      );
      expect(positions[2] - positions[1]).toBeCloseTo(
        positions[1] - positions[0]
      );
    });

    it('should update the active line when the active cell changes', () => {
      notebook.activeCellIndex = 1;
      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      );
      expect(lines[1].classList.contains('jp-mod-active')).toBe(true);
      expect(lines[1].getAttribute('aria-current')).toBe('true');
      expect(lines[0].classList.contains('jp-mod-active')).toBe(false);
      expect(lines[0].getAttribute('aria-current')).toBeNull();

      notebook.activeCellIndex = 2;
      expect(lines[2].classList.contains('jp-mod-active')).toBe(true);
      expect(lines[2].getAttribute('aria-current')).toBe('true');
      expect(lines[1].classList.contains('jp-mod-active')).toBe(false);
      expect(lines[1].getAttribute('aria-current')).toBeNull();
    });

    it('should mark a line when a cell has an error output', () => {
      const codeModel = notebook.model!.cells.get(0) as ICodeCellModel;
      codeModel.outputs.fromJSON([
        {
          output_type: 'error',
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: ['ZeroDivisionError: division by zero']
        }
      ]);

      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      );
      expect(lines[0].classList.contains('jp-mod-error')).toBe(true);
      expect(lines[0].getAttribute('aria-label')).toContain(
        'ZeroDivisionError'
      );
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

      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      );
      expect(lines[0].classList.contains('jp-mod-error')).toBe(true);

      codeModel.outputs.clear();
      expect(lines[0].classList.contains('jp-mod-error')).toBe(false);
    });

    it('should change the active cell when a line is clicked', () => {
      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      ) as NodeListOf<HTMLElement>;
      expect(lines.length).toBe(4);

      lines[3].click();
      expect(notebook.activeCellIndex).toBe(3);
    });

    it('should update lines when cells are added or removed', () => {
      notebook.model!.sharedModel.insertCell(4, {
        cell_type: 'code',
        metadata: {}
      });

      let lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      );
      expect(lines.length).toBe(5);

      notebook.model!.sharedModel.deleteCell(0);
      lines = rail.node.querySelectorAll('.jp-Notebook-navigationRail-line');
      expect(lines.length).toBe(4);
    });

    it('should toggle visibility when notebookConfig.showCellNavigationRail changes', () => {
      expect(notebook.showCellNavigationRail).toBe(false);
      expect(notebook.node.classList.contains('jp-mod-navigationRail')).toBe(
        false
      );

      notebook.notebookConfig = {
        ...notebook.notebookConfig,
        showCellNavigationRail: true
      };
      expect(notebook.showCellNavigationRail).toBe(true);
      expect(notebook.node.classList.contains('jp-mod-navigationRail')).toBe(
        true
      );

      notebook.notebookConfig = {
        ...notebook.notebookConfig,
        showCellNavigationRail: false
      };
      expect(notebook.showCellNavigationRail).toBe(false);
      expect(notebook.node.classList.contains('jp-mod-navigationRail')).toBe(
        false
      );
    });

    it('should render a clean tooltip on hover and hide it when the rail is hidden', () => {
      notebook.showCellNavigationRail = true;
      const lines = rail.node.querySelectorAll(
        '.jp-Notebook-navigationRail-line'
      ) as NodeListOf<HTMLElement>;

      lines[0].dispatchEvent(new MouseEvent('mouseenter'));
      const tooltip = document.body.querySelector(
        '.jp-Notebook-navigationRail-tooltip'
      ) as HTMLElement | null;
      expect(tooltip).not.toBeNull();
      expect(tooltip!.style.display).toBe('block');
      expect(tooltip!.textContent).toContain('a = 1');
      expect(tooltip!.textContent).toContain('Cell 1 of 4');

      notebook.showCellNavigationRail = false;
      expect(tooltip!.style.display).toBe('none');
    });
  });
});
