// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ActivityMonitor } from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';

import { PromiseDelegate } from '@phosphor/coreutils';

import { DataGrid, TextRenderer, CellRenderer } from '@phosphor/datagrid';

import { Message } from '@phosphor/messaging';

import { PanelLayout, Widget } from '@phosphor/widgets';

import { CSVDelimiter } from './toolbar';

import { DSVModel } from './model';

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
  horizontalAlignment: TextRenderer.HorizontalAlignment;
}

/**
 * Search service remembers the search state and the location of the last
 * match, for incremental searching.
 * Search service is also responsible of providing a cell renderer function
 * to set the background color of cells matching the search text.
 */
export class GridSearchService {
  constructor(grid: DataGrid) {
    this._grid = grid;
    this._searchText = '';
    this._row = 0;
    this._column = 0;
  }

  /**
   * Returs a cellrenderer config function to render each cell background.
   * If cell match, background is matchBackgroundColor, if it's the current
   * match, background is currentMatchBackgroundColor.
   */
  cellBackgroundColorRendererFunc(
    config: TextRenderConfig
  ): CellRenderer.ConfigFunc<string> {
    return ({ value, row, column }) => {
      if (this._searchText) {
        if ((value as string).indexOf(this._searchText) !== -1) {
          if (this._row === row && this._column === column) {
            return config.currentMatchBackgroundColor;
          }
          return config.matchBackgroundColor;
        }
      }
    };
  }

  /**
   * incrementally look for searchText.
   */
  find(searchText: string) {
    const model = this._grid.model;
    if (this._searchText !== searchText) {
      // reset search
      this._row = 0;
      this._column = -1;
    }
    this._column++; // incremental search
    this._searchText = searchText;

    // check if the match is in current viewport
    const minRow = this._grid.scrollY / this._grid.baseRowSize;
    const maxRow =
      (this._grid.scrollY + this._grid.pageHeight) / this._grid.baseRowSize;
    const minColumn = this._grid.scrollX / this._grid.baseColumnSize;
    const maxColumn =
      (this._grid.scrollX + this._grid.pageWidth) / this._grid.baseColumnSize;
    const isMatchInViewport = () => {
      return (
        this._row >= minRow &&
        this._row <= maxRow &&
        this._column >= minColumn &&
        this._column <= maxColumn
      );
    };

    for (; this._row < model.rowCount('body'); this._row++) {
      for (; this._column < model.columnCount('body'); this._column++) {
        const cellData = model.data('body', this._row, this._column) as string;
        if (cellData.indexOf(searchText) !== -1) {
          // to update the background of matching cells.
          this._grid.repaint();
          if (!isMatchInViewport()) {
            // scroll the matching cell into view
            let scrollX = this._grid.scrollX;
            let scrollY = this._grid.scrollY;
            /* see also https://github.com/jupyterlab/jupyterlab/pull/5523#issuecomment-432621391 */
            for (let i = scrollY; i < this._row - 1; i++) {
              scrollY += this._grid.sectionSize('row', i);
            }
            for (let j = scrollX; j < this._column - 1; j++) {
              scrollX += this._grid.sectionSize('column', j);
            }
            this._grid.scrollTo(scrollX, scrollY);
          }
          return;
        }
      }
      this._column = 0;
    }
  }

  get searchText(): string {
    return this._searchText;
  }

  private _grid: DataGrid;
  private _searchText: string;
  private _row: number;
  private _column: number;
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

    let context = (this._context = options.context);
    let layout = (this.layout = new PanelLayout());

    this.addClass(CSV_CLASS);

    this._grid = new DataGrid({
      baseRowSize: 24,
      baseColumnSize: 144,
      baseColumnHeaderSize: 36,
      baseRowHeaderSize: 64
    });
    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    layout.addWidget(this._grid);

    this._searchService = new GridSearchService(this._grid);

    this._context.ready.then(() => {
      this._updateGrid();
      this._revealed.resolve(undefined);
      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: context.model.contentChanged,
        timeout: RENDER_TIMEOUT
      });
      this._monitor.activityStopped.connect(
        this._updateGrid,
        this
      );
    });
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
  get revealed() {
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
    this._updateGrid();
  }

  /**
   * The style used by the data grid.
   */
  get style(): DataGrid.IStyle {
    return this._grid.style;
  }
  set style(value: DataGrid.IStyle) {
    this._grid.style = value;
  }

  /**
   * The config used to create text renderer.
   */
  set rendererConfig(rendererConfig: TextRenderConfig) {
    this._grid.defaultRenderer = new TextRenderer({
      textColor: rendererConfig.textColor,
      horizontalAlignment: rendererConfig.horizontalAlignment,
      backgroundColor: this._searchService.cellBackgroundColorRendererFunc(
        rendererConfig
      )
    });
  }

  /**
   * The search service
   */
  get searchService(): GridSearchService {
    return this._searchService;
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
  goToLine(lineNumber: number) {
    let scrollY = this._grid.scrollY;
    /* The lines might not all have uniform height, so we can't just scroll to lineNumber * this._grid.baseRowSize
    see https://github.com/jupyterlab/jupyterlab/pull/5523#issuecomment-432621391 for discussions around
    this. It would be nice if DataGrid had a method to scroll to cell, which could be implemented more efficiently
    because datagrid knows more about the shape of the cells. */
    for (let i = scrollY; i < lineNumber - 1; i++) {
      scrollY += this._grid.sectionSize('row', i);
    }
    this._grid.scrollTo(this._grid.scrollX, scrollY);
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
  private _updateGrid(): void {
    let data: string = this._context.model.toString();
    let delimiter = this._delimiter;
    let oldModel = this._grid.model as DSVModel;
    this._grid.model = new DSVModel({ data, delimiter });
    if (oldModel) {
      oldModel.dispose();
    }
  }

  private _context: DocumentRegistry.Context;
  private _grid: DataGrid;
  private _searchService: GridSearchService;
  private _monitor: ActivityMonitor<any, any> | null = null;
  private _delimiter = ',';
  private _revealed = new PromiseDelegate<void>();
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
    const csvDelimiter = new CSVDelimiter({ selected: content.delimiter });
    this.toolbar.addItem('delimiter', csvDelimiter);
    csvDelimiter.delimiterChanged.connect(
      (sender: CSVDelimiter, delimiter: string) => {
        content.delimiter = delimiter;
      }
    );
  }
}

export namespace CSVDocumentWidget {
  // TODO: In TypeScript 2.8, we can make just the content property optional
  // using something like https://stackoverflow.com/a/46941824, instead of
  // inheriting from this IOptionsOptionalContent.

  export interface IOptions
    extends DocumentWidget.IOptionsOptionalContent<CSVViewer> {
    delimiter?: string;
  }
}

namespace Private {
  export function createContent(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ) {
    return new CSVViewer({ context });
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
    return new CSVDocumentWidget({ context });
  }
}

/**
 * A widget factory for TSV widgets.
 */
export class TSVViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<CSVViewer>
> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<CSVViewer> {
    const delimiter = '\t';
    return new CSVDocumentWidget({ context, delimiter });
  }
}
