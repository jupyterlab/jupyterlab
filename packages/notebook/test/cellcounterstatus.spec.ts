// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CellCounterStatus,
  Notebook,
  NotebookModel,
  StaticNotebook
} from '@jupyterlab/notebook';
import ReactDOMServer from 'react-dom/server';
import * as utils from './utils';

const notebookConfig: StaticNotebook.INotebookConfig = {
  ...StaticNotebook.defaultNotebookConfig,
  windowingMode: 'none'
};

function createCodeCell() {
  return {
    cell_type: 'code' as const,
    execution_count: null,
    metadata: { tags: [] },
    outputs: [],
    source: ['print("hello")\n']
  };
}

function createNotebook(): Notebook {
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
      createCodeCell(),
      createCodeCell(),
      createCodeCell(),
      createCodeCell(),
      createCodeCell()
    ]
  });

  widget.model = model;
  return widget;
}

describe('@jupyterlab/notebook', () => {
  describe('CellCounterStatus', () => {
    let widget: Notebook;
    let status: CellCounterStatus;

    beforeEach(() => {
      widget = createNotebook();
      status = new CellCounterStatus();
    });

    afterEach(() => {
      status.dispose();
      widget.model?.dispose();
      widget.dispose();
    });

    describe('#model', () => {
      it('tracks the active cell and total cell count', () => {
        widget.activeCellIndex = 2;

        status.model.notebook = widget;

        expect(status.model.activeCell).toBe(3);
        expect(status.model.selectionStart).toBe(3);
        expect(status.model.selectionEnd).toBe(3);
        expect(status.model.totalCells).toBe(5);
      });

      it('updates the selected cell range', () => {
        status.model.notebook = widget;

        widget.activeCellIndex = 1;
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);

        expect(status.model.activeCell).toBe(2);
        expect(status.model.selectionStart).toBe(2);
        expect(status.model.selectionEnd).toBe(4);
        expect(status.model.totalCells).toBe(5);
      });
    });

    describe('#render()', () => {
      it('renders the active cell position for a single cell', () => {
        widget.activeCellIndex = 1;
        status.model.notebook = widget;

        const html = ReactDOMServer.renderToString(status.render()!);

        expect(html).toContain('Cell 2/5');
      });

      it('renders the selected range when multiple cells are selected', () => {
        status.model.notebook = widget;

        widget.activeCellIndex = 1;
        widget.select(widget.widgets[2]);
        widget.select(widget.widgets[3]);

        const html = ReactDOMServer.renderToString(status.render()!);

        expect(html).toContain('2:4/5');
      });
    });
  });
});
