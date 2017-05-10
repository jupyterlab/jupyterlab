// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as dsv from 'd3-dsv';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  VDomModel, VDomWidget
} from '@jupyterlab/apputils';


/**
 * The hard limit on the number of rows to display.
 */
export
const DISPLAY_LIMIT: number = 1000;

/**
 * The class name added to a csv table widget.
 */
const CSV_TABLE_CLASS: string = 'jp-CSVTable';


/**
 * A CSV table content model.
 */
export
class CSVModel extends VDomModel {
  /**
   * Instantiate a CSV model.
   */
  constructor(options: CSVModel.IOptions = {}) {
    super();
    this._content = options.content || '';
    this._delimiter = options.delimiter || ',';
  }

  /**
   * A signal emitted when the parsed value's rows exceed the display limit. It
   * emits the length of the parsed value.
   */
  get maxExceeded(): ISignal<this, CSVModel.IOverflow> {
    return this._maxExceeded;
  }

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
    let available = output.length;
    let maximum = DISPLAY_LIMIT;
    if (available > maximum) {
      // Mutate the array instead of slicing in order to conserve memory.
      output.splice(maximum);
      this._maxExceeded.emit({ available, maximum });
    }
    return output;
  }

  private _content: string;
  private _delimiter: string;
  private _maxExceeded = new Signal<this, CSVModel.IOverflow>(this);
}


/**
 * A namespace for `CSVModel` statics.
 */
export
namespace CSVModel {
  /**
   * The value emitted when there are more data rows than what can be displayed.
   */
  export
  interface IOverflow {
    /**
     * The actual number of rows in the data.
     */
    available: number;

    /**
     * The maximum number of items that can be displayed.
     */
    maximum: number;
  }

  /**
   * Instantiation options for CSV models.
   */
  export
  interface IOptions {
    /**
     * The raw model content.
     */
    content?: string;

    /**
     * The CSV delimiter value.
     *
     * #### Notes
     * If this value is not set, it defaults to `','`.
     */
    delimiter?: string;
  }
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
    this.addClass('jp-RenderedHTMLCommon');
  }

  /**
   * Render the content as virtual DOM nodes.
   */
  protected render(): VirtualNode | VirtualNode[] {
    if (!this.model) {
      return h.table([h.thead(), h.tbody()]);
    }

    let rows = this.model.parse();
    let cols = rows.columns || [];
    return h.table([
      h.thead(cols.map(col => h.th(col))),
      h.tbody(rows.map(row => h.tr(cols.map(col => h.td(row[col])))))
    ]);
  }
}
