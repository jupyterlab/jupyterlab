// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DataModel
} from '@phosphor/datagrid';

import {
  parseDSV, parseDSVNoQuotes, IParser
} from './parse';

/*

TODO:

- [ ] Have a UI show that only initial parsing has been done. Perhaps a spinner in the toolbar.
- [ ] When getting the cache lines, look forward to see how many rows are invalid before just getting the cache line size
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
      quoteParser = undefined
    } = options;
    this._data = data;
    this._delimiter = delimiter;
    this._rowDelimiter = rowDelimiter;
    this._quote = quote;
    this._quoteEscaped = new RegExp(quote + quote, 'g');

    if (quoteParser === undefined) {
      // Check for the existence of quotes if the quoteParser is not set
      quoteParser = (data.indexOf(quote) > 0);
    }

    if (quoteParser) {
      this._parser = parseDSV;
    } else {
      this._parser = parseDSVNoQuotes;
    }

    let start = performance.now();
    this._parseAsync();
    let end = performance.now();

    console.log(`Parsed initial ${this._rowCount} rows, ${this._rowCount * this._columnCount} values, in ${(end - start) / 1000}s`);
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
    return 1;
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
      value = (column + 1).toString();
      break;
    case 'row-header':
      value = (row + 1).toString();
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

  private _computeOffsets(maxRows = 4294967295) {
    let {nrows, offsets} = this._parser({data: this._data, delimiter: this._delimiter, columnOffsets: false, maxRows});
    if (offsets[offsets.length - 1] > 4294967296) {
      throw 'csv too large for offsets to be stored as 32-bit integers';
    }

    // Get number of columns in first row
    let {ncols} = this._parser({data: this._data, delimiter: this._delimiter, columnOffsets: true, maxRows: 1});

    // If the full column offsets array is small enough, cache all of them.
    if (nrows * ncols <= this._columnOffsetsMaxSize) {
      this._rowOffsets = new Uint32Array(0);
      this._columnOffsets = new Uint32Array(ncols * nrows);
    } else {
      this._rowOffsets = Uint32Array.from(offsets);
      this._columnOffsets = new Uint32Array(ncols * this._maxCacheGet);
    }

    this._columnOffsets.fill(0xFFFFFFFF);
    this._columnOffsetsStartingRow = 0;
    let oldRowCount = this._rowCount;
    this._columnCount = ncols;
    this._rowCount = nrows;
    if (oldRowCount !== undefined && oldRowCount < nrows) {
      this.emitChanged({
        type: 'rows-inserted',
        region: 'body',
        index: oldRowCount + 1,
        span: nrows - oldRowCount
      });
    }
  }

  _getOffsetIndex(row: number, column: number) {
    // check to see if row *should* be in the cache, based on the cache size.
    let rowIndex = (row - this._columnOffsetsStartingRow) * this._columnCount;
    if (rowIndex < 0 || rowIndex > this._columnOffsets.length) {
      // Row shouldn't be in the cache, invalidate the entire cache by setting
      // all row indices to 0 (perhaps faster to fill all with zeros?), set the
      // new starting row index. Proceed to the next step.
      this._columnOffsets.fill(0xFFFFFFFF);
      this._columnOffsetsStartingRow = row;
      rowIndex = 0;
    }

    if (this._columnOffsets[rowIndex] === 0xFFFFFFFF) {
      // The row is not in the cache yet.

      // Figure out how many rows we need.
      let rowsLeft = (this._columnOffsets.length - rowIndex) / this._columnCount;
      let maxRows = Math.min(this._maxCacheGet, rowsLeft);

      // Parse the data to get the column offsets.
      let {offsets} = this._parser({
        data: this._data,
        delimiter: this._delimiter,
        columnOffsets: true,
        maxRows: maxRows,
        ncols: this._columnCount,
        startIndex: this._rowOffsets[row]
      });

      // Fill in cache.
      for (let i = 0; i < offsets.length; i++) {
        this._columnOffsets[rowIndex + i] = offsets[i];
      }
    }

    // Return index from cache.
    return this._columnOffsets[rowIndex + column];
  }

  _getField(row: number, column: number) {
    let value: string;
    let index = this._getOffsetIndex(row, column);
    let nextIndex;
    if (column === this._columnCount) {
      nextIndex = this._getOffsetIndex(row + 1, 0);
    } else {
      nextIndex = this._getOffsetIndex(row, column + 1);
    }
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
    if (this._data[index] === '"') {
      trimLeft += 1;
      trimRight += 1;
    }
    value = this._data.slice(index + trimLeft, nextIndex - trimRight);

    // If we have a quoted field and we have an escaped quote, unescape it.
    if (trimLeft === 1 && value.indexOf(this._quote) !== -1) {
      value = value.replace(this._quoteEscaped, this._quote);
    }
    return value;
  }

  private _parseAsync() {
    if (this._delayedParse !== 0) {
      clearTimeout(this._delayedParse);
      this._delayedParse = 0;
    }
    // Initially parse the first 500 rows to get the first screen up quick.
    this._computeOffsets(500);

    if (this._rowCount === 500) {
      // Parse full file later.
      this._delayedParse = setTimeout(() => {
        let start = performance.now();
        this._computeOffsets();
        let end = performance.now();
        console.log(`Parsed full ${this._rowCount} rows, ${this._rowCount * this._columnCount} values, in ${(end - start) / 1000}s`);
      });
    }
  }

  private _data: string;
  private _delimiter: string;
  private _rowDelimiter: string;
  private _quote: string;
  private _quoteEscaped: RegExp;
  

  /**
   * The index for the start of each row.
   *
   * #### Notes
   * The max string size in browsers is less than 2**32, so we only use uint32
   *
   * This may be empty if we store *all* column offsets in the column offset cache.
   */
  private _rowOffsets: Uint32Array;

  /**
   * The column offset cache.
   *
   * #### Notes
   *  This contains all column offsets starting with row
   * _columnOffsetsStartingRow.
   *
   * Offsets are stored in row-major order, even though they are accessed
   * typically in column-major order. The offset for row r, column c is at index
   * i=r*numColumns+c, and the data is at data.slice(offset[i], offset[i+1]).
   *
   * The max string size in browsers is less than 2**32, so we only use uint32.
   */
  private _columnOffsets: Uint32Array;
  private _columnOffsetsStartingRow: number;
  private _columnCount: number;
  private _rowCount: number;

  /**
   * The number of lines to parse when filling in the cache.
   */
  private _maxCacheGet: number = 1000;
  private _columnOffsetsMaxSize: number = 33554432; // 128M=2**25=2**(20+7-2)
  private _delayedParse: number;

  // Whether to use the parser that understands quotes or not.
  private _parser: IParser;
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

    /**
     * Whether to use the parser for quoted fields.
     *
     * #### Notes
     * Setting this to false uses a much, much faster parser, but assumes there
     * are not any field or row delimiters inside quotes. If this is not set, it
     * defaults to true if any quotes are found in the data, and false
     * otherwise.
     */
    quoteParser?: boolean;
  }
}
