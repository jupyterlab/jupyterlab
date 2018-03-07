// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DataModel
} from '@phosphor/datagrid';

import {
  parseDSV, parseDSVNoQuotes, IParser
} from './parse';

/*
Possible ideas for further implementation:

- [ ] Instead of parsing the entire file (and freezing the UI), parse just a chunk at a time (say every 10k lines?).
- [ ] Show a spinner or something visible when we are doing delayed parsing.
- [ ] The cache right now handles scrolling down great - it gets the next several hundred rows. However, scrolling up causes lots of cache misses - each new row causes a flush of the cache. When invalidating an entire cache, we should put the requested row in middle of the cache (adjusting for rows at the beginning or end). When populating a cache, we should retrieve rows both above and below the requested row.
- [ ] When we have a header, and we are guessing the parser to use, try checking just the part of the file *after* the header line for quotes. I think often a first header row is quoted, but the rest of the file is not and can be parsed much faster.
- [ ] autdetect the delimiter (look for comma, tab, semicolon in first line. If more than one found, parse first line with comma, tab, semicolon delimiters. One with most fields wins).
*/

const PARSERS: {[key: string]: IParser} = {
  'quotes': parseDSV,
  'noquotes': parseDSVNoQuotes
};

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
      quoteParser = undefined,
      header = true,
    } = options;
    this._data = data;
    this._delimiter = delimiter;
    this._quote = quote;
    this._quoteEscaped = new RegExp(quote + quote, 'g');

    // Guess the row delimiter
    if (rowDelimiter === undefined) {
      let i = data.slice(0, 5000).indexOf('\r');
      if (i === -1) {
        rowDelimiter = '\n';
      } else if (data[i + 1] === '\n') {
        rowDelimiter = '\r\n';
      } else {
        rowDelimiter = '\r';
      }
    }
    this._rowDelimiter = rowDelimiter;

    if (quoteParser === undefined) {
      // Check for the existence of quotes if the quoteParser is not set
      quoteParser = (data.indexOf(quote) >= 0);
    }
    console.log(`quote parser:${quoteParser}, ${data.indexOf(quote)}`);

    if (quoteParser) {
      this._parser = 'quotes';
    } else {
      this._parser = 'noquotes';
    }

    let start = performance.now();
    this._parseAsync();
    let end = performance.now();

    console.log(`Parsed initial ${this._rowCount} rows, ${this._rowCount * this._columnCount} values, in ${(end - start) / 1000}s`);

    if (header === true) {
      let h = [];
      for (let c = 0; c < this._columnCount; c++) {
        h.push(this._getField(0, c));
      }
      this._header = h;
    }


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
      if (this._header.length === 0) {
        return this._rowCount;
      } else {
        return this._rowCount - 1;
      }
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
      if (this._header.length === 0) {
        value = this._getField(row, column);
      } else {
        value = this._getField(row + 1, column);
      }
      break;
    case 'column-header':
      if (this._header.length === 0) {
        value = (column + 1).toString();
      } else {
        value = this._header[column];
      }
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
    let {nrows, offsets} = PARSERS[this._parser]({data: this._data, delimiter: this._delimiter, columnOffsets: false, maxRows});
    if (offsets[offsets.length - 1] > 4294967296) {
      throw 'csv too large for offsets to be stored as 32-bit integers';
    }

    // Get number of columns in first row
    let {ncols} = PARSERS[this._parser]({data: this._data, delimiter: this._delimiter, columnOffsets: true, maxRows: 1});

    // If the full column offsets array is small enough, cache all of them.
    this._rowOffsets = Uint32Array.from(offsets);
    if (nrows * ncols <= this._columnOffsetsMaxSize) {
      this._columnOffsets = new Uint32Array(ncols * nrows);
    } else {
      this._columnOffsets = new Uint32Array(ncols * this._maxCacheGet);
    }

    this._columnOffsets.fill(0xFFFFFFFF);
    this._columnOffsetsStartingRow = 0;
    let oldRowCount = this._rowCount;
    this._columnCount = ncols;
    this._rowCount = nrows;
    if (oldRowCount !== undefined && oldRowCount < nrows) {
      let firstIndex = oldRowCount + 1;
      if (this._header.length > 0) {
        firstIndex -= 1;
      }
      this.emitChanged({
      type: 'rows-inserted',
      region: 'body',
      index: firstIndex,
      span: nrows - oldRowCount
    });
    }
  }

  _getOffsetIndex(row: number, column: number) {
    // check to see if row *should* be in the cache, based on the cache size.
    const ncols = this._columnCount;
    let rowIndex = (row - this._columnOffsetsStartingRow) * ncols;
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

      // Figure out how many rows below us are also invalid.
      let maxRows = 1;
      while (maxRows <= this._maxCacheGet && this._columnOffsets[rowIndex + maxRows * ncols] === 0xFFFFFF) {
        maxRows++;
      }

      // Parse the data to get the column offsets.
      let {offsets} = PARSERS[this._parser]({
        data: this._data,
        delimiter: this._delimiter,
        columnOffsets: true,
        maxRows: maxRows,
        ncols: ncols,
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

    let trimRight = 0;
    let trimLeft = 0;

    if (column === this._columnCount - 1) {
      if (row < this._rowCount - 1) {
        nextIndex = this._getOffsetIndex(row + 1, 0);
        // strip off row delimiter if we are not in the last row.
        trimRight += this._rowDelimiter.length;
      } else {
        nextIndex = this._data.length;
        if (this._data[nextIndex - 1] === this._rowDelimiter[this._rowDelimiter.length - 1]) {
          // The string may or may not end in a row delimiter, so we explicitly check
          trimRight += this._rowDelimiter.length;
        }
      }
    } else {
      nextIndex = this._getOffsetIndex(row, column + 1);
      if (index < nextIndex) {
        // strip field separator if there is one between the two indices.
        trimRight += 1;
      }
    }

    // if quoted field, strip quotes
    if (this._data[index] === this._quote) {
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
    try {
      this._computeOffsets(500);
    } catch (e) {
      if (this._parser === 'quotes') {
        console.warn(e);
        console.log('Switching to noquotes CSV parser');
        this._parser = 'noquotes';
        this._computeOffsets(500);
      } else {
        throw e;
      }
    }

    if (this._rowCount === 500) {
      // Parse full file later, delayed by just a bit to give the UI time to
      // update first.
      this._delayedParse = window.setTimeout(() => {
        let start = performance.now();
        try {
          this._computeOffsets();
        } catch (e) {
          if (this._parser === 'quotes') {
            console.warn(e);
            console.log('Switching to noquotes CSV parser');
            this._parser = 'noquotes';
            this._computeOffsets();
          } else {
            throw e;
          }
        }
        let end = performance.now();
        console.log(`Parsed full ${this._rowCount} rows, ${this._rowCount * this._columnCount} values, in ${(end - start) / 1000}s`);
      }, 50);
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
  private _parser: 'quotes' | 'noquotes';
  private _header: string[] = [];
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
