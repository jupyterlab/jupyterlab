// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import * as d3Dsv from 'd3-dsv';


/**
 * The class name added to a csv widget.
 */
const CSV_CLASS = 'jp-CSVWidget';


/**
 * A widget for csv tables.
 */
export
class CSVWidget extends Widget {
  /**
   * Construct a new csv table widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this._context = context;
    this.node.tabIndex = -1;
    this.addClass(CSV_CLASS);

    if (context.model.toString()) {
      this.update();
    }
    context.pathChanged.connect(() => {
      this.update();
    });
    context.model.contentChanged.connect(() => {
      this.update();
    });
    context.contentsModelChanged.connect(() => {
      this.update();
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._context = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this.title.label = this._context.path.split('/').pop();
    let cm = this._context.contentsModel;
    if (cm === null) {
      return;
    }
    let content = this._context.model.toString();
    this.renderTable(content);
  }

  /**
   * Render an html table from a csv string.
   */
  renderTable(content: string) {
    let parsed = d3Dsv.dsvFormat(",").parse(content);
    let table = document.createElement('table');
    let header = document.createElement('tr');
    for (let name of parsed.columns) {
      let th = document.createElement('th');
      th.textContent = name;
      header.appendChild(th);
    }
    table.appendChild(header);
    for (let row of parsed) {
      let tr = document.createElement('tr');
      for (let col of parsed.columns) {
        let td = document.createElement('td');
        td.textContent = row[col]
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    this.node.textContent = '';
    this.node.appendChild(table);
  }

  private _context: IDocumentContext<IDocumentModel>;
}


/**
 * A widget factory for csv tables.
 */
export
class CSVWidgetFactory extends ABCWidgetFactory<CSVWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): CSVWidget {
    let widget = new CSVWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
