// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  disconnectReceiver
} from 'phosphor/lib/core/signaling';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ABCWidgetFactory, DocumentRegistry
} from '../docregistry';

import {
  CSVModel, CSVTable
} from './table';

import {
  CSVToolbar
} from './toolbar';


/**
 * The class name added to a CSV widget.
 */
const CSV_CLASS = 'jp-CSVWidget';

/**
 * The class name added to a CSV widget warning.
 */
const CSV_WARNING_CLASS = 'jp-CSVWidget-warning';


/**
 * A widget for CSV tables.
 */
export
class CSVWidget extends Widget {
  /**
   * Construct a new CSV widget.
   */
  constructor(options: CSVWidget.IOptions) {
    super();

    let context = this._context = options.context;
    let layout = this.layout = new PanelLayout();

    this.addClass(CSV_CLASS);
    this.title.label = context.path.split('/').pop();

    this._warning = new Widget();
    this._warning.addClass(CSV_WARNING_CLASS);

    this._model = new CSVModel({ content: context.model.toString() });
    this._table = new CSVTable();
    this._table.model = this._model;
    this._model.maxExceeded.connect((sender, overflow) => {
      let { available, maximum } = overflow;
      let message = `Table is too long to render,
        rendering ${maximum} of ${available} rows`;
      this._warning.node.textContent = message;
    }, this);

    this._toolbar = new CSVToolbar();
    this._toolbar.delimiterChanged.connect((sender, delimiter) => {
      this._table.model.delimiter = delimiter;
    }, this);

    layout.addWidget(this._toolbar);
    layout.addWidget(this._table);
    layout.addWidget(this._warning);

    context.pathChanged.connect((c, path) => {
      this.title.label = path.split('/').pop();
    }, this);
    context.model.contentChanged.connect(() => {
      this._table.model.content = context.model.toString();
    }, this);
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
    if (this.isDisposed) {
      return;
    }

    super.dispose();
    disconnectReceiver(this);

    this._model.dispose();
    this._model = null;

    this._table.dispose();
    this._table = null;

    this._toolbar.dispose();
    this._toolbar = null;

    this._warning.dispose();
    this._warning = null;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  private _context: DocumentRegistry.Context = null;
  private _model: CSVModel = null;
  private _table: CSVTable = null;
  private _toolbar: CSVToolbar = null;
  private _warning: Widget = null;
}


/**
 * A namespace for `CSVWidget` statics.
 */
export
namespace CSVWidget {
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
class CSVWidgetFactory extends ABCWidgetFactory<CSVWidget, DocumentRegistry.IModel> {
  /**
   * The name of the widget to display in dialogs.
   */
  get name(): string {
    return 'Table';
  }

  /**
   * The file extensions the widget can view.
   */
  get fileExtensions(): string[] {
    return ['.csv'];
  }

  /**
   * The file extensions for which the factory should be the default.
   */
  get defaultFor(): string[] {
    return ['.csv'];
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): CSVWidget {
    return new CSVWidget({ context });
  }
}
