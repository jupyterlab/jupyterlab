// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ActivityMonitor } from '@jupyterlab/coreutils';
import type {
  DocumentRegistry,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { ABCWidgetFactory, DocumentWidget } from '@jupyterlab/docregistry';
import { PromiseDelegate } from '@lumino/coreutils';
import type * as DataGridModule from '@lumino/datagrid';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';
import type * as DSVModelModule from './model';
import { CSVComment, CSVDelimiter } from './toolbar';

/**
 * The class name added to a CSV viewer.
 */
const CSV_CLASS = 'jp-CSVViewer';

/**
 * The class name added to a CSV viewer datagrid.
 */
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';

/**
 * The timeout to wait for change activity to have ceased before rendering.
 */
const RENDER_TIMEOUT = 1000;

/**
 * Configuration for cells textrenderer.
 */
export class TextRenderConfig {
  /**
   * default text color
   */
  textColor: string;
  /**
   * background color for a search match
   */
  matchBackgroundColor: string;
  /**
   * background color for the current search match.
   */
  currentMatchBackgroundColor: string;
  /**
   * horizontalAlignment of the text
   */
  horizontalAlignment: DataGridModule.TextRenderer.HorizontalAlignment;
  /**
   * font size
   */
  fontSize?: string;
  /**
   * font family
   */
  fontFamily?: string;
}

/**
 * Search service remembers the search state and the location of the last
 * match, for incremental searching.
 * Search service is also responsible of providing a cell renderer function
 * to set the background color of cells matching the search text.
 */
export class GridSearchService {
  constructor(grid: DataGridModule.DataGrid) {
    this._grid = grid;
    this._query = null;
    this._row = 0;
    this._column = -1;
  }

  /**
   * A signal fired when the grid changes.
   */
  get changed(): ISignal<GridSearchService, void> {
    return this._changed;
  }

  /**
   * Returns a cellrenderer config function to render each cell background.
   * If cell match, background is matchBackgroundColor, if it's the current
   * match, background is currentMatchBackgroundColor.
   *
   * The search covers the column headers and the body, so the row headers
   * and the corner header are never highlighted.
   */
  cellBackgroundColorRendererFunc(
    config: TextRenderConfig
  ): DataGridModule.CellRenderer.ConfigFunc<string> {
    return ({ value, region, row, column }) => {
      if (
        !this._query ||
        region === 'row-header' ||
        region === 'corner-header' ||
        (region === 'column-header' && row >= this._headerRows) ||
        !Private.matches(value, this._query)
      ) {
        return '';
      }
      // The search goes through the column header rows, then the body rows.
      const searchRow =
        region === 'column-header' ? row : row + this._headerRows;
      if (
        this._hasMatch &&
        this._row === searchRow &&
        this._column === column
      ) {
        return config.currentMatchBackgroundColor;
      }
      return config.matchBackgroundColor;
    };
  }

  /**
   * Clear the search.
   */
  clear(): void {
    this._query = null;
    this._row = 0;
    this._column = -1;
    this._hasMatch = false;
    this._currentMatchIndex = null;
    this._matchesCount = null;
    this._changed.emit(undefined);
  }

  /**
   * The number of cells matching the current query, or `null` without a query.
   */
  get matchesCount(): number | null {
    const model = this._grid.dataModel;
    if (!this._query || !model) {
      return null;
    }
    const headerRows = this._syncWithGrid(model);
    if (this._matchesCount === null) {
      this._matchesCount = Private.countMatchesBefore(
        model,
        headerRows,
        this._query,
        headerRows + model.rowCount('body'),
        0
      );
    }
    return this._matchesCount;
  }

  /**
   * The index of the current match, or `null` if there is none.
   */
  get currentMatchIndex(): number | null {
    const model = this._grid.dataModel;
    if (!this._query || !model) {
      return null;
    }
    // The current match is lost when the grid hides the header that holds it.
    const headerRows = this._syncWithGrid(model);
    if (!this._hasMatch) {
      return null;
    }
    if (this._currentMatchIndex === null) {
      // The data changed after the last step, so count the matches again.
      if (
        this._row >= headerRows + model.rowCount('body') ||
        this._column >= model.columnCount('body') ||
        !Private.matches(
          Private.data(model, headerRows, this._row, this._column),
          this._query
        )
      ) {
        return null;
      }
      this._currentMatchIndex = Private.countMatchesBefore(
        model,
        headerRows,
        this._query,
        this._row,
        this._column
      );
    }
    return this._currentMatchIndex;
  }

  /**
   * incrementally look for searchText.
   */
  find(query: RegExp, reverse = false): boolean {
    const model = this._grid.dataModel;
    if (!model) {
      return false;
    }
    // The search goes through the column header rows, then the body rows.
    const headerRows = this._syncWithGrid(model);
    const rowCount = headerRows + model.rowCount('body');
    const columnCount = model.columnCount('body');

    if (
      this._query !== query ||
      // The data got smaller than the position of the last match.
      (this._looping && (this._row >= rowCount || this._column >= columnCount))
    ) {
      // reset search
      this._row = 0;
      this._column = -1;
      this._currentMatchIndex = null;
    }
    if (this._query !== query) {
      this._matchesCount = null;
    }
    const previousIndex = this._hasMatch ? this._currentMatchIndex : null;
    const startsBeforeFirstCell = this._row === 0 && this._column === -1;
    const startsAfterLastCell =
      this._row === rowCount - 1 && this._column === columnCount;
    this._query = query;
    this._hasMatch = false;
    this._currentMatchIndex = null;

    // check if the match is in current viewport

    const minRow = this._grid.scrollY / this._grid.defaultSizes.rowHeight;
    const maxRow =
      (this._grid.scrollY + this._grid.pageHeight) /
      this._grid.defaultSizes.rowHeight;
    const minColumn =
      this._grid.scrollX / this._grid.defaultSizes.columnHeaderHeight;
    const maxColumn =
      (this._grid.scrollX + this._grid.pageWidth) /
      this._grid.defaultSizes.columnHeaderHeight;
    const isInViewport = (row: number, column: number) => {
      return (
        row >= minRow &&
        row <= maxRow &&
        column >= minColumn &&
        column <= maxColumn
      );
    };

    const increment = reverse ? -1 : 1;
    this._column += increment;
    for (
      let row = this._row;
      reverse ? row >= 0 : row < rowCount;
      row += increment
    ) {
      for (
        let col = this._column;
        reverse ? col >= 0 : col < columnCount;
        col += increment
      ) {
        if (Private.matches(Private.data(model, headerRows, row, col), query)) {
          // The column headers do not scroll.
          const bodyRow = row - headerRows;
          if (bodyRow >= 0 && !isInViewport(bodyRow, col)) {
            this._grid.scrollToRow(bodyRow);
          }
          this._row = row;
          this._column = col;
          this._hasMatch = true;
          if (!reverse && startsBeforeFirstCell) {
            this._currentMatchIndex = 0;
          } else if (reverse && startsAfterLastCell) {
            this._currentMatchIndex =
              this._matchesCount === null ? null : this._matchesCount - 1;
          } else if (previousIndex !== null) {
            this._currentMatchIndex = previousIndex + increment;
          }

          // to update the background of matching cells.

          // TODO: we only really need to invalidate the previous and current
          // cell rects, not the entire grid.
          this._changed.emit(undefined);
          return true;
        }
      }
      this._column = reverse ? columnCount - 1 : 0;
    }
    // We've finished searching all the way to the limits of the grid. If this
    // is the first time through (looping is true), wrap the indices and search
    // again. Otherwise, give up.
    if (this._looping) {
      this._looping = false;
      this._row = reverse ? 0 : rowCount - 1;
      this._wrapRows(reverse);
      try {
        return this.find(query, reverse);
      } finally {
        this._looping = true;
      }
    }
    // to remove the highlights of the previous query.
    this._changed.emit(undefined);
    return false;
  }

  /**
   * Wrap indices if needed to just before the start or just after the end.
   */
  private _wrapRows(reverse = false) {
    const model = this._grid.dataModel!;
    const rowCount = this._headerRows + model.rowCount('body');
    const columnCount = model.columnCount('body');

    if (reverse && this._row <= 0) {
      // if we are at the front, wrap to just past the end.
      this._row = rowCount - 1;
      this._column = columnCount;
    } else if (!reverse && this._row >= rowCount - 1) {
      // if we are at the end, wrap to just before the front.
      this._row = 0;
      this._column = -1;
    }
  }

  get query(): RegExp | null {
    return this._query;
  }

  /**
   * Follow the data model and the header visibility of the grid, which both
   * change the cells that the search goes through.
   *
   * @returns The number of column header rows that the search goes through.
   */
  private _syncWithGrid(model: DataGridModule.DataModel): number {
    // The search skips the column headers when the grid hides them.
    const visibility = this._grid.headerVisibility;
    const headerRows =
      visibility === 'all' || visibility === 'column'
        ? model.rowCount('column-header')
        : 0;
    if (model !== this._model) {
      this._model?.changed.disconnect(this._onModelChanged, this);
      model.changed.connect(this._onModelChanged, this);
      this._model = model;
      this._onModelChanged();
    } else if (headerRows !== this._headerRows) {
      if (this._hasMatch && this._row >= this._headerRows) {
        // Keep the current match on the same body cell.
        this._row += headerRows - this._headerRows;
      } else if (this._hasMatch) {
        // The current match is in a column header that is now hidden.
        this._row = 0;
        this._column = -1;
        this._hasMatch = false;
      }
      this._onModelChanged();
    }
    this._headerRows = headerRows;
    return headerRows;
  }

  /**
   * Forget the matches counted in the previous data.
   */
  private _onModelChanged(): void {
    this._matchesCount = null;
    this._currentMatchIndex = null;
  }

  private _grid: DataGridModule.DataGrid;
  private _model: DataGridModule.DataModel | null = null;
  private _headerRows = 0;
  private _query: RegExp | null;
  private _row: number;
  private _column: number;
  private _hasMatch = false;
  private _currentMatchIndex: number | null = null;
  private _matchesCount: number | null = null;
  private _looping = true;
  private _changed = new Signal<GridSearchService, void>(this);
}

/**
 * A viewer for CSV tables.
 */
export class CSVViewer extends Widget {
  /**
   * Construct a new CSV viewer.
   */
  constructor(options: CSVViewer.IOptions) {
    super();

    this._context = options.context;
    this.layout = new PanelLayout();

    this.addClass(CSV_CLASS);

    this._ready = this.initialize();
  }

  /**
   * Promise which resolves when the content is ready.
   */
  get ready(): Promise<void> {
    return this._ready;
  }

  protected async initialize(): Promise<void> {
    const layout = this.layout as PanelLayout;
    if (this.isDisposed || !layout) {
      return;
    }
    const { BasicKeyHandler, BasicMouseHandler, DataGrid } =
      await Private.ensureDataGrid();
    this._defaultStyle = DataGrid.defaultStyle;
    this._grid = new DataGrid({
      defaultSizes: {
        rowHeight: 24,
        columnWidth: 144,
        rowHeaderWidth: 64,
        columnHeaderHeight: 36
      }
    });
    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    this._grid.keyHandler = new BasicKeyHandler();
    this._grid.mouseHandler = new BasicMouseHandler();
    this._grid.copyConfig = {
      separator: '\t',
      format: DataGrid.copyFormatGeneric,
      headers: 'all',
      warningThreshold: 1e6
    };

    layout.addWidget(this._grid);

    this._searchService = new GridSearchService(this._grid);
    this._searchService.changed.connect(this._updateRenderer, this);

    await this._context.ready;
    await this._updateGrid();
    this._revealed.resolve(undefined);
    // Throttle the rendering rate of the widget.
    this._monitor = new ActivityMonitor({
      signal: this._context.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(this._updateGrid, this);
  }

  /**
   * The CSV widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * A promise that resolves when the csv viewer is ready to be revealed.
   */
  get revealed(): Promise<void> {
    return this._revealed.promise;
  }

  /**
   * The delimiter for the file.
   */
  get delimiter(): string {
    return this._delimiter;
  }
  set delimiter(value: string) {
    if (value === this._delimiter) {
      return;
    }
    this._delimiter = value;
    void this._updateGrid();
  }

  /**
   * The optional comment character for the file.
   */
  get comment(): string | null {
    return this._comment;
  }
  set comment(value: string | null) {
    if (value === this._comment) {
      return;
    }
    this._comment = value;
    void this._updateGrid();
  }

  /**
   * The style used by the data grid.
   */
  get style(): DataGridModule.DataGrid.Style {
    return this._grid.style;
  }
  set style(value: DataGridModule.DataGrid.Style) {
    this._grid.style = { ...this._defaultStyle, ...value };
  }

  /**
   * The config used to create text renderer.
   */
  set rendererConfig(rendererConfig: TextRenderConfig) {
    this._baseRenderer = rendererConfig;
    void this._updateRenderer();
  }

  /**
   * The search service
   */
  get searchService(): GridSearchService {
    return this._searchService;
  }

  /**
   * A signal emitted when the data shown in the grid changes: after the file
   * or the parsing options change, and when the rest of a large file is parsed.
   */
  get dataChanged(): ISignal<CSVViewer, void> {
    return this._dataChanged;
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this._monitor) {
      this._monitor.dispose();
    }
    super.dispose();
  }

  /**
   * Go to line
   */
  goToLine(lineNumber: number): void {
    this._grid.scrollToRow(lineNumber);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Create the model for the grid.
   */
  private async _updateGrid(): Promise<void> {
    const updateId = ++this._updateId;
    const { BasicSelectionModel } = await Private.ensureDataGrid();
    const { DSVModel } = await Private.ensureDSVModel();
    if (updateId !== this._updateId) {
      return;
    }
    const data: string = this._context.model.toString();
    const delimiter = this._delimiter;
    const oldModel = this._grid.dataModel as DSVModelModule.DSVModel;
    // Replacing the data model clears the grid's column sizes.
    for (let i = 0; i < this._grid.columnCount('body'); i++) {
      this._columnWidths[i] = this._grid.columnSize('body', i);
    }
    const dataModel = (this._grid.dataModel = new DSVModel({
      data,
      delimiter,
      comment: this._comment ?? undefined
    }));
    const columnCount = Math.min(
      dataModel.columnCount('body'),
      this._columnWidths.length
    );
    for (let i = 0; i < columnCount; i++) {
      this._grid.resizeColumn('body', i, this._columnWidths[i]);
    }
    dataModel.changed.connect(this._onDataModelChanged, this);
    this._grid.selectionModel = new BasicSelectionModel({ dataModel });
    if (oldModel) {
      oldModel.changed.disconnect(this._onDataModelChanged, this);
      oldModel.dispose();
    }
    this._dataChanged.emit(undefined);
  }

  /**
   * Restore widths of new columns and notify listeners of data changes.
   */
  private _onDataModelChanged(
    sender: DSVModelModule.DSVModel,
    args: DataGridModule.DataModel.ChangedArgs
  ): void {
    if (args.type === 'columns-inserted' && args.region === 'body') {
      const end = Math.min(args.index + args.span, this._columnWidths.length);
      for (let i = args.index; i < end; i++) {
        this._grid.resizeColumn('body', i, this._columnWidths[i]);
      }
    }
    this._dataChanged.emit(undefined);
  }

  /**
   * Update the renderer for the grid.
   */
  private async _updateRenderer(): Promise<void> {
    if (this._baseRenderer === null) {
      return;
    }
    const { TextRenderer } = await Private.ensureDataGrid();
    const rendererConfig = this._baseRenderer;
    const renderer = new TextRenderer({
      font: `${rendererConfig.fontSize ?? '12px'} ${rendererConfig.fontFamily ?? 'sans-serif'}`,
      textColor: rendererConfig.textColor,
      horizontalAlignment: rendererConfig.horizontalAlignment,
      backgroundColor:
        this._searchService.cellBackgroundColorRendererFunc(rendererConfig)
    });
    this._grid.cellRenderers.update({
      body: renderer,
      'column-header': renderer,
      'corner-header': renderer,
      'row-header': renderer
    });
  }

  private _context: DocumentRegistry.Context;
  private _grid: DataGridModule.DataGrid;
  private _defaultStyle: typeof DataGridModule.DataGrid.defaultStyle;
  private _searchService: GridSearchService;
  private _dataChanged = new Signal<CSVViewer, void>(this);
  private _monitor: ActivityMonitor<DocumentRegistry.IModel, void> | null =
    null;
  private _delimiter = ',';
  private _comment: string | null = null;
  private _columnWidths: number[] = [];
  private _updateId = 0;
  private _revealed = new PromiseDelegate<void>();
  private _baseRenderer: TextRenderConfig | null = null;
  private _ready: Promise<void>;
}

/**
 * A namespace for `CSVViewer` statics.
 */
export namespace CSVViewer {
  /**
   * Instantiation options for CSV widgets.
   */
  export interface IOptions {
    /**
     * The document context for the CSV being rendered by the widget.
     */
    context: DocumentRegistry.Context;
  }
}

/**
 * A document widget for CSV content widgets.
 */
export class CSVDocumentWidget extends DocumentWidget<CSVViewer> {
  constructor(options: CSVDocumentWidget.IOptions) {
    let { content, context, delimiter, reveal, ...other } = options;
    content = content || Private.createContent(context);
    reveal = Promise.all([reveal, content.revealed]);
    super({ content, context, reveal, ...other });

    if (delimiter) {
      content.delimiter = delimiter;
    }
  }

  /**
   * Set URI fragment identifier for rows
   */
  setFragment(fragment: string): void {
    const parseFragments = fragment.split('=');

    // TODO: expand to allow columns and cells to be selected
    // reference: https://tools.ietf.org/html/rfc7111#section-3
    if (parseFragments[0] !== '#row') {
      return;
    }

    // multiple rows, separated by semi-colons can be provided, we will just
    // go to the top one
    let topRow = parseFragments[1].split(';')[0];

    // a range of rows can be provided, we will take the first value
    topRow = topRow.split('-')[0];

    // go to that row
    void this.context.ready.then(() => {
      this.content.goToLine(Number(topRow));
    });
  }
}

export namespace CSVDocumentWidget {
  // TODO: In TypeScript 2.8, we can make just the content property optional
  // using something like https://stackoverflow.com/a/46941824, instead of
  // inheriting from this IOptionsOptionalContent.

  export interface IOptions extends DocumentWidget.IOptionsOptionalContent<CSVViewer> {
    /**
     * Data delimiter character
     */
    delimiter?: string;
  }
}

/**
 * A widget factory for CSV widgets.
 */
export class CSVViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<CSVViewer>
> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<CSVViewer> {
    const translator = this.translator;
    return new CSVDocumentWidget({ context, translator });
  }

  /**
   * Default factory for toolbar items to be added after the widget is created.
   */
  protected defaultToolbarFactory(
    widget: IDocumentWidget<CSVViewer>
  ): DocumentRegistry.IToolbarItem[] {
    return [
      {
        name: 'delimiter',
        widget: new CSVDelimiter({
          widget: widget.content,
          translator: this.translator
        })
      },
      {
        name: 'comment',
        widget: new CSVComment({
          widget: widget.content,
          translator: this.translator
        })
      }
    ];
  }
}

/**
 * A widget factory for TSV widgets.
 */
export class TSVViewerFactory extends CSVViewerFactory {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<CSVViewer> {
    const delimiter = '\t';
    return new CSVDocumentWidget({
      context,
      delimiter,
      translator: this.translator
    });
  }
}

namespace Private {
  let gridLoaded: PromiseDelegate<typeof DataGridModule> | null = null;
  let modelLoaded: PromiseDelegate<typeof DSVModelModule> | null = null;

  /**
   * Get the value of a cell, where the column header rows come before the
   * body rows.
   */
  export function data(
    model: DataGridModule.DataModel,
    headerRows: number,
    row: number,
    column: number
  ): unknown {
    return row < headerRows
      ? model.data('column-header', row, column)
      : model.data('body', row - headerRows, column);
  }

  /**
   * Test whether the text that the grid shows for a value matches the query.
   */
  export function matches(value: unknown, query: RegExp): boolean {
    let text: string;
    if (typeof value === 'string') {
      // The values of a CSV file are strings, so they skip the conversion.
      text = value;
    } else {
      // A missing value is shown as an empty cell.
      text = value === null || value === undefined ? '' : String(value);
    }
    return text.search(query) !== -1;
  }

  /**
   * Count the matching cells before the given cell, row by row.
   */
  export function countMatchesBefore(
    model: DataGridModule.DataModel,
    headerRows: number,
    query: RegExp,
    row: number,
    column: number
  ): number {
    const columnCount = model.columnCount('body');
    let count = 0;
    for (let r = 0; r <= row; r++) {
      const end = r === row ? column : columnCount;
      for (let c = 0; c < end; c++) {
        if (matches(data(model, headerRows, r, c), query)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Lazily load the datagrid module when the first grid is requested.
   */
  export async function ensureDataGrid(): Promise<typeof DataGridModule> {
    if (gridLoaded == null) {
      gridLoaded = new PromiseDelegate();
      gridLoaded.resolve(await import('@lumino/datagrid'));
    }
    return gridLoaded.promise;
  }

  export async function ensureDSVModel(): Promise<typeof DSVModelModule> {
    if (modelLoaded == null) {
      modelLoaded = new PromiseDelegate();
      modelLoaded.resolve(await import('./model'));
    }
    return modelLoaded.promise;
  }

  export function createContent(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): CSVViewer {
    return new CSVViewer({ context });
  }
}
