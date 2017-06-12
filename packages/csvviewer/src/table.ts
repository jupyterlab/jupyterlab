// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as dsv from 'd3-dsv';

import {
  DataModel
} from '@phosphor/datagrid';


/**
 * A CSV table content model.
 */
export
class CSVModel extends DataModel {
  /**
   * Instantiate a CSV model.
   */
  constructor(options: CSVModel.IOptions = {}) {
    super();
    this._content = options.content || '';
    this._delimiter = options.delimiter || ',';
    this._parse();
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
    this._parse();
    this.emitChanged({ type: 'model-reset' });
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
    this._parse();
    this.emitChanged({ type: 'model-reset' });
  }

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._data.length : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    let count = this._data.columns ? this._data.columns.length : 1;
    return region === 'body' ? count : 1;
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    let colName = this._data.columns ? this._data.columns[column] : '';
    if (region === 'row-header') {
      return `${row + 1}`;
    }
    if (region === 'column-header') {
      return `${colName}`;
    }
    if (region === 'corner-header') {
      return '';
    }
    return String(this._data[row][colName]);
  }

  /**
   * Parse the content using the model's delimiter.
   *
   * #### Notes
   * This method will always return parsed content that has at most the display
   * limit worth of rows, currently maxing out at 1000 rows.
   */
  private _parse(): void {
    this._data = dsv.dsvFormat(this._delimiter).parse(this._content);
  }

  private _content: string;
  private _delimiter: string;
  private _data: dsv.DSVParsedArray<dsv.DSVRowString>;
}


/**
 * A namespace for `CSVModel` statics.
 */
export
namespace CSVModel {
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
