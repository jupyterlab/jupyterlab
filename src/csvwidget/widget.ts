// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
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

import {
  HTML_COMMON_CLASS
} from '../renderers/widget';


import * as d3Dsv from 'd3-dsv';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';


/**
 * The class name added to a csv widget.
 */
const CSV_CLASS = 'jp-CSVWidget';

/**
 * The class name added to a csv toolbar widget.
 */
const CSV_TOOLBAR_CLASS = 'jp-CSVWidget-toolbar';

/**
 * The class name added to a csv toolbar's dropdown element.
 */
const CSV_TOOLBAR_DROPDOWN_CLASS = 'jp-CSVWidget-toolbarDropdown';

/**
 * The class name added to a csv table widget.
 */
const CSV_TABLE_CLASS = 'jp-CSVWidget-table';

/**
 * The class name added to a csv warning widget.
 */
const CSV_WARNING_CLASS = 'jp-CSVWidget-warning';

/**
 * The hard limit on the number of rows to display.
 */
const DISPLAY_LIMIT = 1000;


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

    this.layout = new PanelLayout();
    this._toolbar = new Widget({ node: createDelimiterSwitcherNode() });
    this._toolbar.addClass(CSV_TOOLBAR_CLASS);
    this._table = new Widget();
    this._table.addClass(CSV_TABLE_CLASS);
    this._table.addClass(HTML_COMMON_CLASS);
    this._warning = new Widget();
    this._warning.addClass(CSV_WARNING_CLASS);

    let layout = this.layout as PanelLayout;
    layout.addWidget(this._toolbar);
    layout.addWidget(this._table);
    layout.addWidget(this._warning);

    let select = this._toolbar.node.getElementsByClassName(
      CSV_TOOLBAR_DROPDOWN_CLASS)[0] as HTMLSelectElement;

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

    // Change delimiter on a change in the dropdown.
    select.addEventListener('change', event => {
      this.delimiter = select.value;
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
    let delimiter = this.delimiter as string;
    this.renderTable(content, delimiter);
  }

  /**
   * Render an html table from a csv string.
   */
  renderTable(content: string, delimiter: string) {
    let parsed = d3Dsv.dsvFormat(delimiter).parse(content);
    let table = document.createElement('table');
    let header = document.createElement('thead');
    let body = document.createElement('tbody');
    for (let name of parsed.columns) {
      let th = document.createElement('th');
      th.textContent = name;
      header.appendChild(th);
    }
    for (let row of parsed.slice(0, DISPLAY_LIMIT)) {
      let tr = document.createElement('tr');
      for (let col of parsed.columns) {
        let td = document.createElement('td');
        td.textContent = row[col];
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    let msg =  `Table is too long to render, rendering ${DISPLAY_LIMIT} of ` +
               `${parsed.length} rows`;
    if (parsed.length > DISPLAY_LIMIT) {
      this._warning.node.textContent = msg;
    } else {
      this._warning.node.textContent = '';
    }
    table.appendChild(header);
    table.appendChild(body);
    this._table.node.textContent = '';
    this._table.node.appendChild(table);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  private _context: IDocumentContext<IDocumentModel>;
  private delimiter: string = ',';
  private _toolbar: Widget = null;
  private _table: Widget = null;
  private _warning: Widget = null;
}


/**
 * Create the node for the delimiter switcher.
 */
function createDelimiterSwitcherNode(): HTMLElement {
  let div = document.createElement('div');
  let label = document.createElement('span');
  label.textContent = 'Delimiter:';
  let select = document.createElement('select');
  for (let delim of [',', ';', '\t']) {
    let option = document.createElement('option');
    option.value = delim;
    if (delim === '\t') {
      option.textContent = '\\t';
    } else {
      option.textContent = delim;
    }
    select.appendChild(option);
  }
  select.className = CSV_TOOLBAR_DROPDOWN_CLASS;
  div.appendChild(label);
  div.appendChild(select);
  return div;
}


/**
 * A widget factory for csv tables.
 */
export
class CSVWidgetFactory extends ABCWidgetFactory<CSVWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: Kernel.IModel): CSVWidget {
    let widget = new CSVWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
