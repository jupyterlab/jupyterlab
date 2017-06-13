// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as dsv from 'd3-dsv';

import {
  DataGrid, JSONModel
} from '@phosphor/datagrid';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  ActivityMonitor
} from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CSVToolbar
} from './toolbar';


/**
 * The class name added to a CSV viewer.
 */
const CSV_CLASS = 'jp-CSVViewer';

/**
 * The class name added to a CSV viewer toolbar.
 */
const CSV_VIEWER_CLASS = 'jp-CSVViewer-toolbar';

/**
 * The class name added to a CSV viewer datagrid.
 */
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';


const RENDER_TIMEOUT = 1000;


/**
 * A viewer for CSV tables.
 */
export
class CSVViewer extends Widget {
  /**
   * Construct a new CSV viewer.
   */
  constructor(options: CSVViewer.IOptions) {
    super();

    let context = this._context = options.context;
    let layout = this.layout = new PanelLayout();

    this.addClass(CSV_CLASS);
    this.title.label = context.path.split('/').pop();

    this._grid = new DataGrid();
    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'column';

    this._toolbar = new CSVToolbar();
    this._toolbar.delimiterChanged.connect(this._onDelimiterChanged, this);
    this._toolbar.addClass(CSV_VIEWER_CLASS);
    layout.addWidget(this._toolbar);
    layout.addWidget(this._grid);

    context.pathChanged.connect(this._onPathChanged, this);
    // Throttle the rendering rate of the widget.
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
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
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this._grid === null) {
      return;
    }
    let grid = this._grid;
    let toolbar = this._toolbar;
    let monitor = this._monitor;
    this._grid = null;
    this._toolbar = null;
    this._monitor = null;

    grid.dispose();
    toolbar.dispose();
    monitor.dispose();

    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Handle a change in delimiter.
   */
  private _onDelimiterChanged(sender: CSVToolbar, delimiter: string): void {
    this._delimiter = delimiter;
    this._updateGrid();
  }

  /**
   * Handle a change in path.
   */
  private _onPathChanged(): void {
    this.title.label = this._context.path.split('/').pop();
  }

  /**
   * Create the json model for the grid.
   */
  private _updateGrid(): void {
    let content = this._context.model.toString();
    let data = dsv.dsvFormat(this._delimiter).parse(content);
    let model = new JSONModel({
      data,
      schema: {
        fields: data.columns.map(name => { return { name, type: 'string' }; }),
      }
    });
    this._grid.model = model;
  }

  private _context: DocumentRegistry.Context = null;
  private _grid: DataGrid = null;
  private _toolbar: CSVToolbar = null;
  private _monitor: ActivityMonitor<any, any> = null;
  private _delimiter = ',';
}


/**
 * A namespace for `CSVViewer` statics.
 */
export
namespace CSVViewer {
  /**
   * Instantiation options for CSV widgets.
   */
  export
  interface IOptions {
    /**
     * The document context for the CSV being rendered by the widget.
     */
    context: DocumentRegistry.Context;
  }
}


/**
 * A widget factory for CSV widgets.
 */
export
class CSVViewerFactory extends ABCWidgetFactory<CSVViewer, DocumentRegistry.IModel> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): CSVViewer {
    return new CSVViewer({ context });
  }
}
