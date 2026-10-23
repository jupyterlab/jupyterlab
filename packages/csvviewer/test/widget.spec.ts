// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { DocumentRegistry } from '@jupyterlab/docregistry';
import { Context, TextModelFactory } from '@jupyterlab/docregistry';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { framePromise, signalToPromise } from '@jupyterlab/testing';
import { UUID } from '@lumino/coreutils';
import type { CellRenderer } from '@lumino/datagrid';
import { DataGrid, DataModel, JSONModel } from '@lumino/datagrid';
import { MessageLoop } from '@lumino/messaging';
import type { TextRenderConfig } from '../src';
import { CSVViewer, DSVModel, GridSearchService } from '../src';

const FRUITS = `fruit,colour,price
apple,red,1.20
banana,yellow,0.50
apple,green,1.10
cherry,red,3.00
pineapple,brown,2.50
`;

const RENDER_CONFIG: TextRenderConfig = {
  matchBackgroundColor: 'match',
  currentMatchBackgroundColor: 'current',
  textColor: '',
  horizontalAlignment: 'right'
};

function createContext(): Context<DocumentRegistry.IModel> {
  const factory = new TextModelFactory();
  const manager = new ServiceManagerMock();
  const path = UUID.uuid4() + '.csv';
  return new Context({ factory, manager, path });
}

/**
 * A data model whose body cells can be changed in place.
 */
class EditableModel extends DataModel {
  constructor(header: string[], rows: string[][]) {
    super();
    this._header = header;
    this._rows = rows;
  }

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._rows.length : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? this._header.length : 1;
  }

  data(region: DataModel.CellRegion, row: number, column: number): string {
    switch (region) {
      case 'body':
        return this._rows[row][column];
      case 'column-header':
        return this._header[column];
      case 'row-header':
        return `${row + 1}`;
      case 'corner-header':
        return '';
    }
  }

  setData(row: number, column: number, value: string): void {
    this._rows[row][column] = value;
    this.emitChanged({
      type: 'cells-changed',
      region: 'body',
      row,
      column,
      rowSpan: 1,
      columnSpan: 1
    });
  }

  private _header: string[];
  private _rows: string[][];
}

/**
 * Create a query with the flags that the search box uses.
 */
function createQuery(text: string): RegExp {
  return new RegExp(text, 'gim');
}

/**
 * Get the background color that the search gives to a cell.
 */
function renderBackground(
  searchService: GridSearchService,
  model: DataModel,
  region: DataModel.CellRegion,
  row: number,
  column: number
): string {
  const render = searchService.cellBackgroundColorRendererFunc(RENDER_CONFIG);
  return render({
    region,
    row,
    column,
    value: model.data(region, row, column)
  } as CellRenderer.CellConfig);
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
          const changed = signalToPromise(widget.dataChanged);
          widget[option] = option === 'comment' ? '#' : ';';
          await expect(changed).resolves.toEqual([widget, undefined]);
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
        const changed = signalToPromise(widget.dataChanged);
        jest.runOnlyPendingTimers();
        await expect(changed).resolves.toEqual([widget, undefined]);
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

    describe('#dataChanged', () => {
      async function createViewer(content: string): Promise<CSVViewer> {
        const context = createContext();
        context.model.fromString(content);
        await context.initialize(true);
        const widget = new CSVViewer({ context });
        await widget.ready;
        return widget;
      }

      it('should be emitted when the delimiter changes', async () => {
        const widget = await createViewer(FRUITS);
        const changed = signalToPromise(widget.dataChanged);
        widget.delimiter = ';';
        await expect(changed).resolves.toEqual([widget, undefined]);
        widget.dispose();
      });

      it('should be emitted when the file changes', async () => {
        const widget = await createViewer(FRUITS);
        const changed = signalToPromise(widget.dataChanged);
        widget.context.model.fromString(
          FRUITS.replace('apple,green', 'grape,green')
        );
        await expect(changed).resolves.toEqual([widget, undefined]);
        widget.dispose();
      });

      it('should be emitted when the rest of a large file is parsed', async () => {
        // The data model parses the first rows at once, and the rest after a
        // delay. The viewer uses the default number of first rows.
        const { initialRows } = new DSVModel({ data: '', delimiter: ',' });
        const rows = Array.from(
          { length: initialRows + 100 },
          (_, i) => `${i},row ${i}`
        );
        const widget = await createViewer(['id,name', ...rows].join('\n'));
        await expect(signalToPromise(widget.dataChanged)).resolves.toEqual([
          widget,
          undefined
        ]);
        widget.dispose();
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
    function createGridSearchService(model: DataModel): GridSearchService {
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

    it('reports the number of matches and the current match index', () => {
      const model = createModel();
      const searchService = createGridSearchService(model);
      expect(searchService.matchesCount).toBeNull();
      expect(searchService.currentMatchIndex).toBeNull();

      const query = /match/;
      searchService.find(query);
      expect(searchService.matchesCount).toBe(2);
      expect(searchService.currentMatchIndex).toBe(0);

      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(1);

      searchService.find(query, true);
      expect(searchService.currentMatchIndex).toBe(0);

      searchService.clear();
      expect(searchService.matchesCount).toBeNull();
      expect(searchService.currentMatchIndex).toBeNull();
    });

    it('reports no current match when nothing matches', () => {
      const searchService = createGridSearchService(createModel());
      searchService.find(/missing/);
      expect(searchService.matchesCount).toBe(0);
      expect(searchService.currentMatchIndex).toBeNull();
    });

    it('reports the current match and the number of matches in a CSV file', () => {
      const searchService = createGridSearchService(
        new DSVModel({ data: FRUITS, delimiter: ',' })
      );
      const query = createQuery('apple');
      const indices = [false, false, false, false, true].map(reverse => {
        searchService.find(query, reverse);
        return searchService.currentMatchIndex;
      });
      expect(indices).toEqual([0, 1, 2, 0, 2]);
      expect(searchService.matchesCount).toBe(3);
    });

    it('does not read the grid again to report the current match', () => {
      const model = new DSVModel({ data: FRUITS, delimiter: ',' });
      const searchService = createGridSearchService(model);
      const query = createQuery('apple');
      searchService.find(query);
      expect(searchService.matchesCount).toBe(3);
      const data = jest.spyOn(model, 'data');
      for (const [reverse, index] of [
        [false, 1],
        [false, 2],
        [false, 0],
        [true, 2],
        [true, 1]
      ] as const) {
        searchService.find(query, reverse);
        data.mockClear();
        expect(searchService.currentMatchIndex).toBe(index);
        expect(searchService.matchesCount).toBe(3);
        expect(data).not.toHaveBeenCalled();
      }
    });

    it('finds and counts the matches in the column headers', () => {
      const model = new DSVModel({ data: FRUITS, delimiter: ',' });
      const searchService = createGridSearchService(model);
      // `colour` and `price` in the header, then `cherry` in the body.
      const query = createQuery('c');
      expect(searchService.find(query)).toBe(true);
      expect(searchService.matchesCount).toBe(3);
      expect(searchService.currentMatchIndex).toBe(0);
      expect(
        renderBackground(searchService, model, 'column-header', 0, 1)
      ).toBe('current');
      expect(
        renderBackground(searchService, model, 'column-header', 0, 2)
      ).toBe('match');

      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(1);
      expect(
        renderBackground(searchService, model, 'column-header', 0, 2)
      ).toBe('current');

      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(2);
      expect(renderBackground(searchService, model, 'body', 3, 0)).toBe(
        'current'
      );
    });

    it('does not highlight the row numbers', () => {
      const model = new DSVModel({ data: FRUITS, delimiter: ',' });
      const searchService = createGridSearchService(model);
      searchService.find(createQuery('3'));
      expect(searchService.matchesCount).toBe(1);
      expect(renderBackground(searchService, model, 'body', 3, 2)).toBe(
        'current'
      );
      expect(renderBackground(searchService, model, 'row-header', 2, 0)).toBe(
        ''
      );
    });

    it('does not search the column headers that the grid hides', () => {
      const grid = new DataGrid({ headerVisibility: 'row' });
      const model = new DSVModel({ data: FRUITS, delimiter: ',' });
      grid.dataModel = model;
      const searchService = new GridSearchService(grid);
      // Only `cherry`, because `colour` and `price` are in the hidden header.
      const query = createQuery('c');
      expect(searchService.find(query)).toBe(true);
      expect(searchService.matchesCount).toBe(1);
      expect(searchService.currentMatchIndex).toBe(0);
      expect(renderBackground(searchService, model, 'body', 3, 0)).toBe(
        'current'
      );

      // The current match stays on `cherry` when the grid shows the header.
      grid.headerVisibility = 'all';
      expect(searchService.matchesCount).toBe(3);
      expect(searchService.currentMatchIndex).toBe(2);
      expect(renderBackground(searchService, model, 'body', 3, 0)).toBe(
        'current'
      );

      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(0);
      expect(
        renderBackground(searchService, model, 'column-header', 0, 1)
      ).toBe('current');
    });

    it('reports no current match after the grid hides the header that holds it', () => {
      const grid = new DataGrid();
      const model = new DSVModel({ data: FRUITS, delimiter: ',' });
      grid.dataModel = model;
      const searchService = new GridSearchService(grid);
      // Every cell matches, so the first match is `fruit` in the header.
      const query = createQuery('^');
      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(0);

      // The search box reads the current match before the number of matches.
      grid.headerVisibility = 'row';
      expect(searchService.currentMatchIndex).toBeNull();
      expect(searchService.matchesCount).toBe(15);
      expect(renderBackground(searchService, model, 'body', 0, 0)).toBe(
        'match'
      );

      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(0);
      expect(renderBackground(searchService, model, 'body', 0, 0)).toBe(
        'current'
      );
    });

    it('accepts data models with values other than strings', () => {
      const model = new JSONModel({
        data: [
          { id: 1, price: 10, note: null },
          { id: 2, price: 7, note: 'x10' }
        ],
        schema: {
          primaryKey: ['id'],
          fields: [{ name: 'id' }, { name: 'price' }, { name: 'note' }]
        }
      });
      const searchService = createGridSearchService(model);
      expect(searchService.find(createQuery('10'))).toBe(true);
      expect(searchService.matchesCount).toBe(2);
      expect(searchService.currentMatchIndex).toBe(0);
      expect(renderBackground(searchService, model, 'body', 0, 0)).toBe(
        'current'
      );
      expect(renderBackground(searchService, model, 'row-header', 0, 0)).toBe(
        ''
      );

      // A missing value is shown as an empty cell, so it does not match.
      expect(searchService.find(createQuery('null'))).toBe(false);
      expect(searchService.matchesCount).toBe(0);

      // The corner header holds the name of the row header column.
      expect(searchService.find(createQuery('id'))).toBe(false);
      expect(
        renderBackground(searchService, model, 'corner-header', 0, 0)
      ).toBe('');
    });

    it('updates the matches when the data model changes', () => {
      const model = new EditableModel(
        ['fruit', 'colour'],
        [
          ['apple', 'red'],
          ['apple', 'green']
        ]
      );
      const searchService = createGridSearchService(model);
      const query = createQuery('apple');
      searchService.find(query);
      expect(searchService.matchesCount).toBe(2);
      expect(searchService.currentMatchIndex).toBe(0);

      model.setData(1, 0, 'grape');
      expect(searchService.matchesCount).toBe(1);
      expect(searchService.currentMatchIndex).toBe(0);

      // The current match does not match any more.
      model.setData(0, 0, 'pear');
      expect(searchService.matchesCount).toBe(0);
      expect(searchService.currentMatchIndex).toBeNull();
    });

    it('updates the matches when the grid gets a new data model', () => {
      const grid = new DataGrid();
      grid.dataModel = new DSVModel({ data: FRUITS, delimiter: ',' });
      const searchService = new GridSearchService(grid);
      const query = createQuery('apple');
      searchService.find(query);
      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(1);
      expect(searchService.matchesCount).toBe(3);

      // The current match is the second `apple`, which becomes `grape`.
      grid.dataModel = new DSVModel({
        data: FRUITS.replace('apple,green', 'grape,green'),
        delimiter: ','
      });
      expect(searchService.matchesCount).toBe(2);
      expect(searchService.currentMatchIndex).toBeNull();

      // The next match is `pineapple`.
      searchService.find(query);
      expect(searchService.currentMatchIndex).toBe(1);
      expect(
        renderBackground(searchService, grid.dataModel, 'body', 4, 0)
      ).toBe('current');
    });

    it('emits `changed` after the current match moves', () => {
      const searchService = createGridSearchService(
        new DSVModel({ data: FRUITS, delimiter: ',' })
      );
      const indices: (number | null)[] = [];
      searchService.changed.connect(() => {
        indices.push(searchService.currentMatchIndex);
      });
      const query = createQuery('apple');
      searchService.find(query);
      searchService.find(query);
      // The grid has to be painted again to remove the old highlights.
      searchService.find(createQuery('missing'));
      expect(indices).toEqual([0, 1, null]);
    });

    it('moves through the matches in the order they are read', () => {
      // A linear congruential generator, so that every run tests the same grids.
      let seed = 1;
      const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      const randomCell = () => (random() < 0.3 ? 'xa' : 'b');

      for (let grid = 0; grid < 200; grid++) {
        const columnCount = 1 + Math.floor(random() * 4);
        const rowCount = Math.floor(random() * 5);
        const header = Array.from({ length: columnCount }, randomCell);
        const rows = Array.from({ length: rowCount }, () =>
          Array.from({ length: columnCount }, randomCell)
        );
        const model = new EditableModel(header, rows);
        const searchService = createGridSearchService(model);
        // The matching cells, as [region, row, column], in the order they are read.
        const matches = [header, ...rows].flatMap((values, row) =>
          values.flatMap((value, column) =>
            value.includes('a')
              ? [
                  row === 0
                    ? (['column-header', 0, column] as const)
                    : (['body', row - 1, column] as const)
                ]
              : []
          )
        );

        const query = createQuery('a');
        let expected: number | null = null;
        for (let step = 0; step < 12; step++) {
          const reverse = random() < 0.4;
          if (matches.length > 0) {
            expected =
              expected === null
                ? reverse
                  ? matches.length - 1
                  : 0
                : (expected + (reverse ? -1 : 1) + matches.length) %
                  matches.length;
          }
          expect(searchService.find(query, reverse)).toBe(matches.length > 0);
          const current = matches.findIndex(
            ([region, row, column]) =>
              renderBackground(searchService, model, region, row, column) ===
              'current'
          );
          expect(current === -1 ? null : current).toBe(expected);
          expect(searchService.currentMatchIndex).toBe(expected);
          expect(searchService.matchesCount).toBe(matches.length);
        }
      }
    });
  });
});
