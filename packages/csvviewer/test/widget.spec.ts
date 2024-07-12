// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import { CellRenderer, DataGrid, JSONModel } from '@lumino/datagrid';
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
          fields: [
            {
              name: 'a'
            },
            { name: 'b' }
          ]
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
