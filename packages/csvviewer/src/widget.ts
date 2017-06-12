// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DataGrid
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
  CSVModel
} from './table';

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

    this._model = new CSVModel({ content: context.model.toString() });
    this._grid = new DataGrid();
    this._grid.model = this._model;

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
    this._monitor.activityStopped.connect(this._onContentChanged, this);
  }

  /**
   * The CSV widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * The CSV data model.
   */
  get model(): CSVModel {
    return this._model;
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this._model === null) {
      return;
    }
    let grid = this._grid;
    let toolbar = this._toolbar;
    let monitor = this._monitor;
    this._model = null;
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
    this._model.delimiter = delimiter;
  }

  /**
   * Handle a change in content.
   */
  private _onContentChanged(): void {
    this._model.content = this._context.model.toString();
  }

  /**
   * Handle a change in path.
   */
  private _onPathChanged(): void {
    this.title.label = this._context.path.split('/').pop();
  }

  private _context: DocumentRegistry.Context = null;
  private _model: CSVModel = null;
  private _grid: DataGrid = null;
  private _toolbar: CSVToolbar = null;
  private _monitor: ActivityMonitor<any, any> = null;
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
