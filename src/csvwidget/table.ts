// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as dsv from 'd3-dsv';

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

import {
  HTML_COMMON_CLASS
} from '../renderers/widget';


/**
 * The class name added to a csv table widget.
 */
const CSV_TABLE_CLASS = 'jp-CSVTable';

/**
 * The hard limit on the number of rows to display.
 */
const DISPLAY_LIMIT = 1000;


/**
 * A CSV table content model.
 */
export
class CSVModel extends VDomModel {
  readonly maxExceeded: ISignal<this, void>;

  /**
   * The raw model content.
   */
  get content(): string {
    return this._content;
  }
  set content(content: string) {
    if (this._content === content) {
      return;
    }
    this._content = content;
    this.stateChanged.emit(void 0);
  }

  /**
   * The CSV delimiter value.
   */
  get delimiter(): string {
    return this._delimiter;
  }
  set delimiter(delimiter: string) {
    if (this._delimiter === delimiter) {
      return;
    }
    this._delimiter = delimiter;
    this.stateChanged.emit(void 0);
  }

  /**
   * Parse the content using the model's delimiter.
   *
   * #### Notes
   * This method will always return parsed content that has at most the display
   * limit worth of rows, currently maxing out at 1000 rows.
   */
  parse(): dsv.DSVParsedArray<dsv.DSVRowString> {
    let output = dsv.dsvFormat(this._delimiter).parse(this._content);
    if (output.length > DISPLAY_LIMIT) {
      output.splice(0, DISPLAY_LIMIT);
      this.maxExceeded.emit(void 0);
    }
    return output;
  }

  private _content: string = '';
  private _delimiter: string = '';
}


/**
 * A CSV table content widget.
 */
export
class CSVTable extends VDomWidget<CSVModel> {
  /**
   * Instantiate a new CSV table widget.
   */
  constructor() {
    super();
    this.addClass(CSV_TABLE_CLASS);
    this.addClass(HTML_COMMON_CLASS);
  }

  /**
   * Render the content as virtual DOM nodes.
   */
  protected render(): VNode | VNode[] {
    let parsed = this.model.parse();
    let cols = parsed.columns;
    let rows = parsed.slice(0, DISPLAY_LIMIT);
    return h.table(null, [
      h.thead(null, cols.map(c => h.th(null, c))),
      h.tbody(null, rows.map(r => h.tr(null, cols.map(c => h.td(null, r[c])))))
    ]);
  }
}
