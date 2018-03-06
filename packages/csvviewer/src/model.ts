// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DataModel
} from '@phosphor/datagrid';

import {
  parseDSV// , STATE
} from './parse';

/*

TODO:

- [ ] Parse the file incrementally and notify that the model had rows added. Have a UI showing when the parsing is done.
- [ ] Mode to show just the header (saves a *ton* of memory)
- current progress: Parsed 1169059 rows, 38578947 values, in 10.476500000047963s
*/

/**
 * A data model implementation for in-memory DSV data.
 */
export
class DSVModel extends DataModel {
  /**
   * Create a data model with static CSV data.
   *
   * @param options - The options for initializing the data model.
   */
  constructor(options: DSVModel.IOptions) {
    super();
    let {
      data,
      delimiter=',',
      rowDelimiter = undefined,
      quote = '"',
    } = options;
    this._data = data;
    this._delimiter = delimiter;
    this._rowDelimiter = rowDelimiter;
    this._quote = quote;
    this._quoteEscaped = new RegExp(quote + quote, 'g');

    let start = performance.now();
    this._computeOffsets();
    let end = performance.now();
    console.log(`Parsed ${this._rowCount} rows, ${this._rowCount * this._columnCount} values, in ${(end - start) / 1000}s`);
  }

  /**
   * Get the row count for a region in the data model.
   *
   * @param region - The row region of interest.
   *
   * @returns - The row count for the region.
   */
  rowCount(region: DataModel.RowRegion): number {
    if (region === 'body') {
      return this._rowCount;
    }
    return 1;  // TODO multiple column-header rows?
  }

  /**
   * Get the column count for a region in the data model.
   *
   * @param region - The column region of interest.
   *
   * @returns - The column count for the region.
   */
  columnCount(region: DataModel.ColumnRegion): number {
    if (region === 'body') {
      return this._columnCount;
    }
    return 0;
  }

  /**
   * Get the data value for a cell in the data model.
   *
   * @param region - The cell region of interest.
   *
   * @param row - The row index of the cell of interest.
   *
   * @param column - The column index of the cell of interest.
   *
   * @param returns - The data value for the specified cell.
   */
  data(region: DataModel.CellRegion, row: number, column: number): any {
    // Set up the field and value variables.
    let value: string;

    // Look up the field and value for the region.
    switch (region) {
    case 'body':
      value = this._getField(row, column);
      break;
    case 'column-header':
      value = '';
      break;
    case 'row-header':
      value = '';
      break;
    case 'corner-header':
      value = '';
      break;
    default:
      throw 'unreachable';
    }

    // Return the final value.
    return value;
  }

  private _computeOffsets() {
    // Calculate the line offsets.
    /*let offsets: number[] = [];
    let callbacks: any = {};
    let nrows = 0;
    let ncols = 0;
    let col = 0;
    callbacks[STATE.NEW_ROW] = (i: number, data: string) => {
      // Check the number of columns
      if (col < ncols) {
        // console.warn(`parsed ${col} columns instead of the expected ${ncols} in row ${nrows} in the row before before data: ${data.slice(i, 50)}`);
        // pad the number of columns
        for (; col < ncols; col++) {
          offsets.push(i);
        }
      } else if (col > ncols) {
        // truncate the columns
        // console.warn(`parsed ${col} columns instead of the expected ${ncols} in row ${nrows} in the row before before data: ${data.slice(i, 50)}`);
        offsets.length = offsets.length - (col - ncols);
      }
      offsets.push(i);
      nrows++;
      col = 0;
    };
    callbacks[STATE.NEW_FIELD] = (i: number) => {
      offsets.push(i);
      // At the very start, nrows is immediately incremented.
      if (nrows === 1) {
        ncols++;
      }
      col++;
    };
    */
    let {nrows, ncols, offsets} = parseDSV({data: this._data, delimiter: this._delimiter, regex: false});
    if (offsets[offsets.length] > 4294967296) {
      throw 'csv too large for offsets to be stored as 32-bit integers';
    }
    this._offsets = Uint32Array.from(offsets);
    this._columnCount = ncols;
    this._rowCount = nrows;
  }

  _getField(row: number, column: number) {
    let value: string;
    let i = row * this._columnCount + column;
    let trimRight = 0;
    let trimLeft = 0;
    // If we are at the end of a row, then strip off the delimiter.
    if (column === this._columnCount) {
      // strip off row ending
      trimRight += this._rowDelimiter.length;
    } else {
      // strip off delimiter
      trimRight += this._delimiter.length;
    }
    // if quoted field, strip quotes
    if (this._data[this._offsets[i]] === '"') {
      trimLeft += 1;
      trimRight += 1;
    }
    value = this._data.slice(this._offsets[i] + trimLeft, this._offsets[i + 1] - trimRight);
    if (trimRight === 1) {
      value = value.replace(this._quoteEscaped, this._quote);
    }
    return value;
  }

  private _data: string;
  private _delimiter: string;
  private _rowDelimiter: string;
  private _quote: string;
  private _quoteEscaped: RegExp;

  /**
   * The offsets for each datum.
   *
   * #### Notes
   * The offsets are 32-bit integers, on the assumption that bigger offset
   * (i.e., data over 4GB) is not practical.
   *
   * Offsets are stored in row-major order, even though they are accessed
   * typically in column-major order. The offset for row r, column c is at index
   * i=r*numColumns+c, and the data is at data.slice(offset[i], offset[i+1]).
   */
  private _offsets: Uint32Array;
  private _columnCount: number;
  private _rowCount: number;
}


/**
 * The namespace for the `DSVModel` class statics.
 */
export
namespace DSVModel {

  /**
   * An options object for initializing a CSV data model.
   */
  export
  interface IOptions {
    /**
     * The schema for the for the data model.
     *
     * The schema should be treated as an immutable object.
     */
    delimiter: string;

    /**
     * The data source for the data model.
     *
     * The data model takes full ownership of the data source.
     */
    data: string;

    /**
     * Whether the DSV has a one-row header.
     */
    header?: boolean;

    /**
     * Line ending
     */
    rowDelimiter?: string;

    /**
     * Quote character.
     *
     * #### Notes
     * Quotes are escaped by repeating them.
     */
    quote?: string;
  }
}
