// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { DocumentRegistry } from '@jupyterlab/docregistry';
import { Context, TextModelFactory } from '@jupyterlab/docregistry';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { framePromise } from '@jupyterlab/testing';
import { UUID } from '@lumino/coreutils';
import type { CellRenderer } from '@lumino/datagrid';
import { DataGrid, JSONModel } from '@lumino/datagrid';
import { MessageLoop } from '@lumino/messaging';
import type { DSVModel } from '../src';
import { CSVViewer, GridSearchService } from '../src';

function createContext(): Context<DocumentRegistry.IModel> {
  const factory = new TextModelFactory();
  const manager = new ServiceManagerMock();
  const path = UUID.uuid4() + '.csv';
  return new Context({ factory, manager, path });
}

describe('csvviewer/widget', () => {
  const context = createContext();

  describe('CSVViewer', () => {
    describe('#constructor()', () => {
      it('should instantiate a `CSVViewer`', () => {
        const widget = new CSVViewer({ context });
        expect(widget).toBeInstanceOf(CSVViewer);
        widget.dispose();
      });
    });

    describe('#context', () => {
      it('should be the context for the file', () => {
        const widget = new CSVViewer({ context });
        expect(widget.context).toBe(context);
      });
    });

    describe('column sizes', () => {
      let viewerContext: Context<DocumentRegistry.IModel>;
      let widget: CSVViewer;
      let grid: DataGrid;

      beforeEach(async () => {
        viewerContext = createContext();
        await viewerContext.initialize(true);
        viewerContext.model.fromString(
          '# export\nid,name;label,value\n1,Alice;Bob,42'
        );
        widget = new CSVViewer({ context: viewerContext });
        await widget.ready;
        grid = Array.from(widget.children())[0] as DataGrid;
        grid.resizeColumn('body', 0, 240);
        grid.resizeColumn('body', 1, 320);
        MessageLoop.flush();
      });

      afterEach(() => {
        widget.dispose();
        viewerContext.dispose();
        jest.useRealTimers();
      });

      it.each(['comment', 'delimiter'] as const)(
        'should preserve resized columns when changing the %s',
        async option => {
          expect(grid.columnSize('body', 0)).toBe(240);
          expect(grid.columnSize('body', 1)).toBe(320);
          const oldModel = grid.dataModel;
          widget[option] = option === 'comment' ? '#' : ';';
          await framePromise();
          MessageLoop.flush();

          expect(grid.dataModel).not.toBe(oldModel);
          expect(grid.dataModel!.columnCount('body')).toBe(
            option === 'comment' ? 3 : 2
          );
          expect(grid.dataModel!.data('column-header', 0, 0)).toBe(
            option === 'comment' ? 'id' : '# export'
          );
          expect(grid.columnSize('body', 0)).toBe(240);
          expect(grid.columnSize('body', 1)).toBe(320);
        }
      );

      it('should restore widths when columns return after a delimiter change', async () => {
        widget.delimiter = '|';
        await framePromise();
        MessageLoop.flush();
        expect(grid.columnCount('body')).toBe(1);
        expect(grid.columnSize('body', 0)).toBe(240);

        widget.delimiter = ',';
        await framePromise();
        MessageLoop.flush();
        expect(grid.columnCount('body')).toBe(3);
        expect(grid.columnSize('body', 0)).toBe(240);
        expect(grid.columnSize('body', 1)).toBe(320);
        expect(grid.columnSize('body', 2)).toBe(grid.defaultSizes.columnWidth);
      });

      it('should preserve widths when changing both options together', async () => {
        widget.delimiter = ';';
        widget.comment = '#';
        await framePromise();
        MessageLoop.flush();
        expect(grid.dataModel!.data('column-header', 0, 0)).toBe('id,name');
        expect(grid.columnSize('body', 0)).toBe(240);
        expect(grid.columnSize('body', 1)).toBe(320);
      });

      it('should preserve widths when changing options before pending resizes finish', async () => {
        const oldModel = grid.dataModel;
        widget.delimiter = ';';
        for (let i = 0; i < 20 && grid.dataModel === oldModel; i++) {
          await Promise.resolve();
        }
        expect(grid.dataModel).not.toBe(oldModel);
        widget.comment = '#';
        await framePromise();
        MessageLoop.flush();
        expect(grid.dataModel!.data('column-header', 0, 0)).toBe('id,name');
        expect(grid.columnSize('body', 0)).toBe(240);
        expect(grid.columnSize('body', 1)).toBe(320);
      });

      it('should preserve widths of columns discovered during delayed parsing', async () => {
        widget.dispose();
        viewerContext.model.fromString(
          '# export\nid,name\n' + '1,Alice\n'.repeat(500) + '2,Bob,extra'
        );
        widget = new CSVViewer({ context: viewerContext });
        await widget.ready;
        grid = Array.from(widget.children())[0] as DataGrid;
        await (grid.dataModel as DSVModel).ready;
        grid.resizeColumn('body', 0, 240);
        grid.resizeColumn('body', 2, 320);
        MessageLoop.flush();
        expect(grid.columnSize('body', 2)).toBe(320);

        jest.useFakeTimers({ doNotFake: ['requestAnimationFrame'] });
        widget.comment = '#';
        await framePromise();
        MessageLoop.flush();
        expect(grid.columnCount('body')).toBe(2);
        grid.resizeColumn('body', 0, 280);
        MessageLoop.flush();
        jest.runOnlyPendingTimers();
        await (grid.dataModel as DSVModel).ready;
        MessageLoop.flush();

        expect(grid.columnCount('body')).toBe(3);
        expect(grid.columnSize('body', 0)).toBe(280);
        expect(grid.columnSize('body', 2)).toBe(320);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new CSVViewer({ context });
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new CSVViewer({ context });
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });
  });

  describe('GridSearchService', () => {
    function createModel(): JSONModel {
      return new JSONModel({
        data: [
          { index: 0, a: 'other', b: 'match 1' },
          { index: 1, a: 'other', b: 'match 2' }
        ],
        schema: {
          primaryKey: ['index'],
          fields: [{ name: 'a' }, { name: 'b' }]
        }
      });
    }
    function createGridSearchService(model: JSONModel): GridSearchService {
      const grid = new DataGrid();
      grid.dataModel = model;
      return new GridSearchService(grid);
    }

    it('searches incrementally and set background color', () => {
      const model = createModel();
      const searchService = createGridSearchService(model);

      const cellRenderer = searchService.cellBackgroundColorRendererFunc({
        matchBackgroundColor: 'anotherMatch',
        currentMatchBackgroundColor: 'currentMatch',
        textColor: '',
        horizontalAlignment: 'right'
      });

      /**
       * fake rendering a cell and returns the background color for this coordinate.
       */
      function fakeRenderCell(row: number, column: number) {
        const cellConfig = {
          value: model.data('body', row, column),
          row,
          column
        } as CellRenderer.CellConfig;
        return cellRenderer(cellConfig);
      }

      // searching for "match", cells at (0,1) and (1,1) should match.
      // (0,1) is the current match
      const query = /match/;
      searchService.find(query);
      expect(fakeRenderCell(0, 1)).toBe('currentMatch');
      expect(fakeRenderCell(1, 1)).toBe('anotherMatch');
      expect(fakeRenderCell(0, 0)).toBe('');

      // search again, the current match "moves" to be (1,1)
      searchService.find(query);
      expect(fakeRenderCell(0, 1)).toBe('anotherMatch');
      expect(fakeRenderCell(1, 1)).toBe('currentMatch');
    });
  });
});
