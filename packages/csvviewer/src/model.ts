// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DataModel
} from '@phosphor/datagrid';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  parseDSV, parseDSVNoQuotes, IParser
} from './parse';

/*
Possible ideas for further implementation:

- Instead of parsing the entire file (and freezing the UI), parse just a chunk at a time (say every 10k rows?).
- Show a spinner or something visible when we are doing delayed parsing.
- The cache right now handles scrolling down great - it gets the next several hundred rows. However, scrolling up causes lots of cache misses - each new row causes a flush of the cache. When invalidating an entire cache, we should put the requested row in middle of the cache (adjusting for rows at the beginning or end). When populating a cache, we should retrieve rows both above and below the requested row.
- When we have a header, and we are guessing the parser to use, try checking just the part of the file *after* the header row for quotes. I think often a first header row is quoted, but the rest of the file is not and can be parsed much faster.
- autdetect the delimiter (look for comma, tab, semicolon in first line. If more than one found, parse first row with comma, tab, semicolon delimiters. One with most fields wins).
- Toolbar buttons to control the row delimiter, the parsing engine (quoted/not quoted), the quote character, etc.
*/

/**
 * Possible delimiter-separated data parsers.
 */
const PARSERS: {[key: string]: IParser} = {
  'quotes': parseDSV,
  'noquotes': parseDSVNoQuotes
};

/**
 * A data model implementation for in-memory delimiter-separated data.
 *
 * #### Notes
 * This model handles data with up to 2**32 characters.
 */
export
class DSVModel extends DataModel implements IDisposable {
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
      // Check for the existence of quotes if the quoteParser is not set.
      quoteParser = (data.indexOf(quote) >= 0);
    }
    this._parser = quoteParser ? 'quotes' : 'noquotes';

    // Parse the data.
    this._parseAsync();

    // Cache the header row.
    if (header === true && this._rowCount > 0 && this._columnCount > 0) {
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
    return 1;
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

  /**
   * Compute the row offsets and initialize the column offset cache.
   */
  private _computeOffsets(maxRows = 4294967295) {
    // Parse the data up to the number of rows requested.
    let {nrows, offsets} = PARSERS[this._parser]({
      data: this._data,
      delimiter: this._delimiter,
      rowDelimiter: this._rowDelimiter,
      columnOffsets: false,
      maxRows,
    });

    // Get number of columns in first row
    let {ncols} = PARSERS[this._parser]({
      data: this._data,
      delimiter: this._delimiter,
      rowDelimiter: this._rowDelimiter,
      columnOffsets: true,
      maxRows: 1
    });

    // Store the row offsets.
    this._rowOffsets = Uint32Array.from(offsets);

    // If the full column offsets array is small enough, build a cache big
    // enough for all column offsets. We allocate up to 128 megabytes:
    // 128*(2**20 bytes/M)/(4 bytes/entry) = 33554432 entries.
    if (nrows * ncols <= 33554432) {
      this._columnOffsets = new Uint32Array(ncols * nrows);
    } else {
      // If not, then our cache size is the maximum number of rows we'll get
      // from the cache at a time.
      this._columnOffsets = new Uint32Array(ncols * this._maxCacheGet);
    }

    // Invalidate the entire cache.
    this._columnOffsets.fill(0xFFFFFFFF);
    this._columnOffsetsStartingRow = 0;

    // Update the column and row counts.
    let oldRowCount = this._rowCount;
    this._columnCount = ncols;
    this._rowCount = nrows;

    // Emit the model changed signal.
    if (oldRowCount !== undefined && oldRowCount < nrows) {
      // If we have more rows than before, emit the rows-inserted change signal.
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
    } else {
      // Otherwise, emit the full model reset change signal.
      this.emitChanged({
        type: 'model-reset',
        region: 'body',
      });
    }
  }

  /**
   * Get the index in the data string for the first character of a row and
   * column.
   *
   * @param row - The row of the data item.
   * @param column - The column of the data item.
   * @returns - The index into the data string where the data item starts.
   */
  _getOffsetIndex(row: number, column: number): number {
    // Declare local variables.
    const ncols = this._columnCount;

    // Check to see if row *should* be in the cache, based on the cache size.
    let rowIndex = (row - this._columnOffsetsStartingRow) * ncols;
    if (rowIndex < 0 || rowIndex > this._columnOffsets.length) {
      // Row isn't in the cache, so we invalidate the entire cache and set up
      // the cache to hold the requested row.
      this._columnOffsets.fill(0xFFFFFFFF);
      this._columnOffsetsStartingRow = row;
      rowIndex = 0;
    }

    // Check to see if we need to fetch the row data into the cache.
    if (this._columnOffsets[rowIndex] === 0xFFFFFFFF) {
      // Figure out how many rows below us also need to be fetched.
      let maxRows = 1;
      while (maxRows <= this._maxCacheGet && this._columnOffsets[rowIndex + maxRows * ncols] === 0xFFFFFF) {
        maxRows++;
      }

      // Parse the data to get the column offsets.
      let {offsets} = PARSERS[this._parser]({
        data: this._data,
        delimiter: this._delimiter,
        rowDelimiter: this._rowDelimiter,
        columnOffsets: true,
        maxRows: maxRows,
        ncols: ncols,
        startIndex: this._rowOffsets[row]
      });

      // Copy results to the cache.
      for (let i = 0; i < offsets.length; i++) {
        this._columnOffsets[rowIndex + i] = offsets[i];
      }
    }

    // Return the offset index from cache.
    return this._columnOffsets[rowIndex + column];
  }

  /**
   * Get the parsed string field for a row and column.
   *
   * @param row - The row number of the data item.
   * @param column - The column number of the data item.
   * @returns The parsed string for the data item.
   */
  _getField(row: number, column: number) {
    // Declare local variables.
    let value: string;
    let nextIndex;

    // Find the index for the first character in the field.
    let index = this._getOffsetIndex(row, column);

    // Initialize the trim adjustments.
    let trimRight = 0;
    let trimLeft = 0;

    // Find the end of the slice (the start of the next field), and how much we
    // should adjust to trim off a trailing field or row delimiter. First check
    // if we are getting the last column.
    if (column === this._columnCount - 1) {
      // Check if we are getting any row but the last.
      if (row < this._rowCount - 1) {
        // Set the next offset to the next row, column 0.
        nextIndex = this._getOffsetIndex(row + 1, 0);

        // Since we are not at the last row, we need to trim off the row
        // delimiter.
        trimRight += this._rowDelimiter.length;
      } else {
        // We are getting the last data item, so the slice end is the end of the
        // data string.
        nextIndex = this._data.length;

        // The string may or may not end in a row delimiter (RFC 4180 2.2), so
        // we explicitly check if we should trim off a row delimiter.
        if (this._data[nextIndex - 1] === this._rowDelimiter[this._rowDelimiter.length - 1]) {
          trimRight += this._rowDelimiter.length;
        }
      }
    } else {
      // The next field starts at the next column offset.
      nextIndex = this._getOffsetIndex(row, column + 1);

      // We may be in a short row, where we filled in columns without delimiters
      // in the string. If there is room for a delimiter before the next field,
      // we need to trim it.
      if (index < nextIndex) {
        // Strip field separator if there is room for one between the two indices.
        trimRight += 1;
      }
    }

    // Check to see if the field begins with a quote. If it does, trim a quote on either side.
    if (this._data[index] === this._quote) {
      trimLeft += 1;
      trimRight += 1;
    }

    // Slice the actual value out of the data string.
    value = this._data.slice(index + trimLeft, nextIndex - trimRight);

    // If we have a quoted field and we have an escaped quote inside it, unescape it.
    if (trimLeft === 1 && value.indexOf(this._quote) !== -1) {
      value = value.replace(this._quoteEscaped, this._quote);
    }

    // Return the value.
    return value;
  }

  /**
   * Parse the data string asynchronously.
   *
   * #### Notes
   * It can take several seconds to parse a several hundred megabyte string, so
   * we parse the first 500 rows to get something up on the screen, then we
   * parse the full data string asynchronously.
   */
  private _parseAsync() {
    // Cancel any previously-scheduled delayed parsing.
    if (this._delayedParse !== 0) {
      clearTimeout(this._delayedParse);
      this._delayedParse = 0;
    }

    // Try parsing the first 500 rows to give us the start of the data right away.
    try {
      this._computeOffsets(500);
    } catch (e) {
      // Sometimes the data string cannot be parsed with the full parser (for
      // example, we may have the wrong delimiter). In these cases, fall back to
      // the simpler parser so we can show something.
      if (this._parser === 'quotes') {
        console.warn(e);
        this._parser = 'noquotes';
        this._computeOffsets(500);
      } else {
        throw e;
      }
    }

    // If we didn't get 500 rows from the string, then we must have parsed the
    // entire string, so just return now.
    if (this._rowCount < 500) {
      return;
    }

    // Parse full data string, delayed by a few milliseconds to give the UI a chance to draw first.
    this._delayedParse = window.setTimeout(() => {
      try {
        this._computeOffsets();
      } catch (e) {
        if (this._parser === 'quotes') {
          console.warn(e);
          this._parser = 'noquotes';
          this._computeOffsets();
        } else {
          throw e;
        }
      }
    }, 50);
  }

  /**
   * Whether this model has been disposed.
   */
  get isDisposed() {
    return this._isDisposed;
  }

  /**
   * Dispose the resources held by this model.
   */
  dispose() {
    if (this._isDisposed) {
      return;
    }
    if (this._delayedParse !== 0) {
      clearTimeout(this._delayedParse);
      this._delayedParse = 0;
    }
    this._columnOffsets = null;
    this._data = null;
    this._rowOffsets = null;
  }

  // Parser settings
  private _delimiter: string;
  private _quote: string;
  private _quoteEscaped: RegExp;
  private _parser: 'quotes' | 'noquotes';
  private _rowDelimiter: string;

  // Data values
  private _data: string;
  private _rowCount: number;
  private _columnCount: number;

  // Cache information
  /**
   * The header strings.
   */
  private _header: string[] = [];
  /**
   * The column offset cache, starting with row _columnOffsetsStartingRow
   *
   * #### Notes
   * The index of the first character in the data string for row r, column c is
   * _columnOffsets[(r-this._columnOffsetsStartingRow)*numColumns+c]
   */
  private _columnOffsets: Uint32Array;
  /**
   * The row that _columnOffsets[0] represents.
   */
  private _columnOffsetsStartingRow: number;
  /**
   * The maximum number of rows to parse when there is a cache miss.
   */
  private _maxCacheGet: number = 1000;
  /**
   * The index for the start of each row.
   */
  private _rowOffsets: Uint32Array;

  // Bookkeeping variables.
  private _delayedParse: number;
  private _isDisposed: boolean = false;
}


/**
 * The namespace for the `DSVModel` class statics.
 */
export
namespace DSVModel {

  /**
   * An options object for initializing a delimiter-separated data model.
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
     * Whether the data has a one-row header.
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
     * Quotes are escaped by repeating them, as in RFC 4180.
     */
    quote?: string;

    /**
     * Whether to use the parser that can handle quoted delimiters.
     *
     * #### Notes
     * Setting this to false uses a much faster parser, but assumes there are
     * not any field or row delimiters that are quoted in fields. If this is not
     * set, it defaults to true if any quotes are found in the data, and false
     * otherwise.
     */
    quoteParser?: boolean;
  }
}
