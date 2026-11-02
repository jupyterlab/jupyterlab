// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@lumino/coreutils';
import type { CellGroup } from '@lumino/datagrid';
// The viewer loads this model on demand; its base class must be available then.
// eslint-disable-next-line jupyter/prefer-lazy-imports
import { DataModel } from '@lumino/datagrid';
import type { IDisposable } from '@lumino/disposable';
import type { IParser } from './parse';
import { parseDSV, parseDSVNoQuotes } from './parse';

/*
Possible ideas for further implementation:

- Show a spinner or something visible when we are doing delayed parsing.
- The cache right now handles scrolling down great - it gets the next several hundred rows. However, scrolling up causes lots of cache misses - each new row causes a flush of the cache. When invalidating an entire cache, we should put the requested row in middle of the cache (adjusting for rows at the beginning or end). When populating a cache, we should retrieve rows both above and below the requested row.
- When we have a header, and we are guessing the parser to use, try checking just the part of the file *after* the header row for quotes. I think often a first header row is quoted, but the rest of the file is not and can be parsed much faster.
- autdetect the delimiter (look for comma, tab, semicolon in first line. If more than one found, parse first row with comma, tab, semicolon delimiters. One with most fields wins).
- Toolbar buttons to control the row delimiter, the parsing engine (quoted/not quoted), the quote character, etc.
- Investigate incremental loading strategies in the parseAsync function. In initial investigations, setting the chunk size to 100k in parseAsync seems cause instability with large files in Chrome (such as 8-million row files). Perhaps this is because we are recycling the row offset and column offset arrays quickly? It doesn't seem that there is a memory leak. On this theory, perhaps we just need to keep the offsets list an actual list, and pass it into the parsing function to extend without copying, and finalize it into an array buffer only when we are done parsing. Or perhaps we double the size of the array buffer each time, which may be wasteful, but at the end we trim it down if it's too wasteful (perhaps we have our own object that is backed by an array buffer, but has a push method that will automatically double the array buffer size as needed, and a trim function to finalize the array to exactly the size needed)? Or perhaps we don't use array buffers at all - compare the memory cost and speed of keeping the offsets as lists instead of memory buffers.
- Investigate a time-based incremental parsing strategy, rather than a row-based one. The parser could take a maximum time to parse (say 300ms), and will parse up to that duration, in which case the parser probably also needs a way to notify when it has reached the end of a file.
- For very large files, where we are only storing a small cache, scrolling is very laggy in Safari. It would be good to profile it.
*/

/**
 * Possible delimiter-separated data parsers.
 */
const PARSERS: { [key: string]: IParser } = {
  quotes: parseDSV,
  noquotes: parseDSVNoQuotes
};

/**
 * A data model implementation for in-memory delimiter-separated data.
 *
 * #### Notes
 * This model handles data with up to 2**32 characters.
 */
export class DSVModel extends DataModel implements IDisposable {
  /**
   * Create a data model with static CSV data.
   *
   * @param options - The options for initializing the data model.
   */
  constructor(options: DSVModel.IOptions) {
    super();
    let {
      data,
      delimiter = ',',
      comment = undefined,
      rowDelimiter = undefined,
      quote = '"',
      quoteParser = undefined,
      header = true,
      initialRows = 500
    } = options;
    this._rawData = data;
    this._delimiter = delimiter;
    this._comment = comment;
    this._quote = quote;
    this._quoteEscaped = new RegExp(quote + quote, 'g');
    this._initialRows = initialRows;
    this._hasHeader = header;

    // Guess the row delimiter if it was not supplied. This will be fooled if a
    // different line delimiter possibility appears in the first row.
    if (rowDelimiter === undefined) {
      const i = data.slice(0, 5000).indexOf('\r');
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
      quoteParser = data.indexOf(quote) >= 0;
    }
    this._parser = quoteParser ? 'quotes' : 'noquotes';

    // Parse the data.
    this.parseAsync();

    // Cache the header row.
    if (
      header === true &&
      this._columnCount! > 0 &&
      this._headerRow < this._rowCount!
    ) {
      const h = [];
      for (let c = 0; c < this._columnCount!; c++) {
        h.push(this._getField(this._headerRow, c));
      }
      this._header = h;
    }
  }

  /**
   * Whether this model has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A promise that resolves when the model has parsed all of its data.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * The string representation of the data.
   */
  get rawData(): string {
    return this._rawData;
  }
  set rawData(value: string) {
    this._rawData = value;
  }

  /**
   * The initial chunk of rows to parse.
   */
  get initialRows(): number {
    return this._initialRows;
  }
  set initialRows(value: number) {
    this._initialRows = value;
  }

  /**
   * The header strings.
   */
  get header(): string[] {
    return this._header;
  }
  set header(value: string[]) {
    this._header = value;
    this._hasHeader = value.length > 0;
    this._groups = [];
  }

  /**
   * The delimiter between entries on the same row.
   */
  get delimiter(): string {
    return this._delimiter;
  }

  /**
   * The delimiter between rows.
   */
  get rowDelimiter(): string {
    return this._rowDelimiter;
  }

  /**
   * A boolean determined by whether parsing has completed.
   */
  get doneParsing(): boolean {
    return this._doneParsing;
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
      if (this._hasHeader === false) {
        return this._rowCount!;
      } else {
        return Math.max(this._rowCount! - 1, 0);
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
      return this._columnCount!;
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
   * @returns - The data value for the specified cell.
   */
  data(region: DataModel.CellRegion, row: number, column: number): string {
    let value: string;

    // Look up the field and value for the region.
    switch (region) {
      case 'body': {
        const rawRow = this._bodyRowToRawRow(row);
        if (this._isCommentRow(rawRow) && !this._isSplitComment(rawRow)) {
          // The first cell holds the whole line, merged across the row.
          value = column === 0 ? this._getLine(rawRow) : '';
        } else {
          value = this._getField(rawRow, column);
        }
        break;
      }
      case 'column-header':
        if (this._hasHeader === false) {
          value = (column + 1).toString();
        } else {
          value = this._header[column];
        }
        break;
      case 'row-header': {
        const rowNumber = this._rowNumber(this._bodyRowToRawRow(row));
        value = rowNumber === null ? '' : rowNumber.toString();
        break;
      }
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
   * Get the count of merged cell groups: one per merged comment row.
   *
   * #### Notes
   * The grid scans every group for each cell it paints, so only the first
   * comment rows are merged.
   */
  groupCount(region: DataModel.CellRegion): number {
    if (region !== 'body' || this._columnCount! < 2) {
      return 0;
    }
    return Math.min(this._getMergedRows().length, Private.MAX_MERGED_ROWS);
  }

  /**
   * Get the merged cell group which spans a comment row.
   */
  group(region: DataModel.CellRegion, groupIndex: number): CellGroup | null {
    if (region !== 'body') {
      return null;
    }
    // The grid asks for every group once per painted cell, so reuse them.
    const mergedRows = this._getMergedRows();
    let group = this._groups[groupIndex];
    if (group === undefined) {
      const row = this._rawRowToBodyRow(mergedRows[groupIndex]);
      const c2 = this._columnCount! - 1;
      group = this._groups[groupIndex] = { r1: row, r2: row, c1: 0, c2 };
    }
    return group;
  }

  /**
   * Get the metadata for a cell: `{ comment: true }` for comment rows, with
   * `merged: true` when the row is merged across the columns.
   */
  metadata(
    region: DataModel.CellRegion,
    row: number,
    column: number
  ): DataModel.Metadata {
    const rawRow = this._bodyRowToRawRow(row);
    if (region !== 'body' || !this._isCommentRow(rawRow)) {
      return DataModel.emptyMetadata;
    }
    return this._isSplitComment(rawRow)
      ? Private.COMMENT_METADATA
      : Private.MERGED_COMMENT_METADATA;
  }

  /**
   * Get the body row of a row number, as shown in the row header.
   *
   * #### Notes
   * Rows above the first data row and comment rows have no number.
   */
  bodyRowForNumber(rowNumber: number): number {
    let row = this._firstNumberedRow() + rowNumber - 1;
    for (const comment of this._commentRows) {
      if (comment > row) {
        break;
      }
      if (comment >= this._firstNumberedRow()) {
        row++;
      }
    }
    return this._rawRowToBodyRow(row);
  }

  /**
   * Dispose the resources held by this model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    this._columnCount = undefined;
    this._rowCount = undefined;
    this._rowOffsets = null!;
    this._columnOffsets = null!;
    this._rawData = null!;

    // Clear out state associated with the asynchronous parsing.
    if (this._doneParsing === false) {
      // Explicitly catch this rejection at least once so an error is not thrown
      // to the console.
      this.ready.catch(() => {
        return;
      });
      this._ready.reject(undefined);
    }
    if (this._delayedParse !== null) {
      window.clearTimeout(this._delayedParse);
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
  getOffsetIndex(row: number, column: number): number {
    // Declare local variables.
    const ncols = this._columnCount!;

    // Check to see if row *should* be in the cache, based on the cache size.
    let rowIndex = (row - this._columnOffsetsStartingRow) * ncols;
    if (rowIndex < 0 || rowIndex > this._columnOffsets.length) {
      // Row isn't in the cache, so we invalidate the entire cache and set up
      // the cache to hold the requested row.
      this._columnOffsets.fill(0xffffffff);
      this._columnOffsetsStartingRow = row;
      rowIndex = 0;
    }

    // Check to see if we need to fetch the row data into the cache.
    if (this._columnOffsets[rowIndex] === 0xffffffff) {
      // Figure out how many rows below us also need to be fetched.
      let maxRows = 1;
      while (
        maxRows <= this._maxCacheGet &&
        this._columnOffsets[rowIndex + maxRows * ncols] === 0xffffff
      ) {
        maxRows++;
      }

      // Parse the data to get the column offsets.
      const { offsets } = PARSERS[this._parser]({
        data: this._rawData,
        delimiter: this._delimiter,
        rowDelimiter: this._rowDelimiter,
        quote: this._quote,
        comment: this._comment,
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
   * Parse the data string asynchronously.
   *
   * #### Notes
   * It can take several seconds to parse a several hundred megabyte string, so
   * we parse the first 500 rows to get something up on the screen, then we
   * parse the full data string asynchronously.
   */
  parseAsync(): void {
    // Number of rows to get initially.
    let currentRows = this._initialRows;

    // Number of rows to get in each chunk thereafter. We set this high to just
    // get the rest of the rows for now.
    let chunkRows = Math.pow(2, 32) - 1;

    // We give the UI a chance to draw by delaying the chunk parsing.
    const delay = 30; // milliseconds

    // Define a function to parse a chunk up to and including endRow.
    const parseChunk = (endRow: number) => {
      try {
        this._computeRowOffsets(endRow);
      } catch (e) {
        // Sometimes the data string cannot be parsed with the full parser (for
        // example, we may have the wrong delimiter). In these cases, fall back to
        // the simpler parser so we can show something.
        if (this._parser === 'quotes') {
          console.warn(e);
          this._parser = 'noquotes';
          this._resetParser();
          this._computeRowOffsets(endRow);
        } else {
          throw e;
        }
      }
      return this._doneParsing;
    };

    // Reset the parser to its initial state.
    this._resetParser();

    // Parse the first rows to give us the start of the data right away.
    const done = parseChunk(currentRows);

    // If we are done, return early.
    if (done) {
      return;
    }

    // Define a function to recursively parse the next chunk after a delay.
    const delayedParse = () => {
      // Parse up to the new end row.
      const done = parseChunk(currentRows + chunkRows);
      currentRows += chunkRows;

      // Gradually double the chunk size until we reach a million rows, if we
      // start below a million-row chunk size.
      if (chunkRows < 1000000) {
        chunkRows *= 2;
      }

      // If we aren't done, the schedule another parse.
      if (done) {
        this._delayedParse = null;
      } else {
        this._delayedParse = window.setTimeout(delayedParse, delay);
      }
    };

    // Parse full data string in chunks, delayed by a few milliseconds to give the UI a chance to draw.
    this._delayedParse = window.setTimeout(delayedParse, delay);
  }

  /**
   * Compute the row offsets and initialize the column offset cache.
   *
   * @param endRow - The last row to parse, from the start of the data (first
   * row is row 1).
   *
   * #### Notes
   * This method supports parsing the data incrementally by calling it with
   * incrementally higher endRow. Rows that have already been parsed will not be
   * parsed again.
   */
  private _computeRowOffsets(endRow = 4294967295): void {
    if (this._columnCount === undefined && this._comment) {
      const firstDataRow = this._getFirstDataRow();
      this._preferredColumnCount = firstDataRow.ncols;
      this._headerRow = firstDataRow.row;
      if (this._hasHeader) {
        // The next row offset bounds the last header field.
        endRow = Math.max(endRow, this._headerRow + 2);
      }
    }

    // If we've already parsed up to endRow, or if we've already parsed the
    // entire data set, return early.
    if (this._rowCount! >= endRow || this._doneParsing === true) {
      return;
    }

    // `reparse` is the number of rows we are requesting to parse over again.
    // We generally start at the beginning of the last row offset, so that the
    // first row offset returned is the same as the last row offset we already
    // have. We parse the data up to and including the requested row.
    const reparse = this._rowCount! > 0 ? 1 : 0;
    const { nrows, offsets, maxNcols } = PARSERS[this._parser]({
      data: this._rawData,
      startIndex: this._rowOffsets[this._rowCount! - reparse] ?? 0,
      delimiter: this._delimiter,
      rowDelimiter: this._rowDelimiter,
      quote: this._quote,
      comment: this._comment,
      columnOffsets: false,
      maxRows: endRow - this._rowCount! + reparse
    });

    // If we have already set up our initial bookkeeping, return early if we
    // did not get any new rows beyond the last row that we've parsed, i.e.,
    // nrows===1.
    if (this._startedParsing && nrows <= reparse) {
      this._doneParsing = true;
      this._ready.resolve(undefined);
      return;
    }

    this._startedParsing = true;

    // Update the row count, accounting for how many rows were reparsed.
    const oldRowCount = this._rowCount!;
    const duplicateRows = Math.min(nrows, reparse);
    this._rowCount = oldRowCount + nrows - duplicateRows;

    const oldColumnCount = this._columnCount ?? 0;
    this._columnCount = Math.max(
      oldColumnCount,
      maxNcols ?? 0,
      this._preferredColumnCount
    );
    const columnCountChanged = this._columnCount !== oldColumnCount;

    // If we didn't reach the requested row, we must be done.
    if (this._rowCount < endRow) {
      this._doneParsing = true;
      this._ready.resolve(undefined);
    }

    // Copy the new offsets into a new row offset array if needed.
    if (this._rowCount > oldRowCount) {
      const oldRowOffsets = this._rowOffsets;
      this._rowOffsets = new Uint32Array(this._rowCount);
      this._rowOffsets.set(oldRowOffsets);
      this._rowOffsets.set(offsets, oldRowCount - duplicateRows);
    }

    if (this._comment !== undefined) {
      for (let row = oldRowCount; row < this._rowCount; row++) {
        if (
          this._rawData[this._rowOffsets[row]] === this._comment &&
          !(this._hasHeader && row === this._headerRow)
        ) {
          const fields = this._getLine(row).split(this._delimiter);
          let longest = 0;
          let text = false;
          for (let i = 0; i < fields.length; i++) {
            longest = Math.max(longest, fields[i].length);
            text = text || (i > 0 && fields[i].trim() !== '');
          }
          this._commentRows.push(row);
          // A line padded with empty fields is text, not a row of cells.
          this._commentFields.push(text ? fields.length : 0);
          this._commentLongest.push(longest);
        }
      }
    }

    // Expand the column offsets array if needed

    // If the full column offsets array is small enough, build a cache big
    // enough for all column offsets. We allocate up to 128 megabytes:
    // 128*(2**20 bytes/M)/(4 bytes/entry) = 33554432 entries.
    const maxColumnOffsetsRows = Math.floor(33554432 / this._columnCount);

    if (columnCountChanged) {
      const columnOffsetRows =
        this._rowCount <= maxColumnOffsetsRows
          ? this._rowCount
          : Math.min(this._maxCacheGet, maxColumnOffsetsRows);

      this._columnOffsets = new Uint32Array(
        columnOffsetRows * this._columnCount
      );
      this._columnOffsets.fill(0xffffffff);
      this._columnOffsetsStartingRow = 0;

      if (this._header.length > 0) {
        for (let c = this._header.length; c < this._columnCount; c++) {
          this._header.push(this._getField(this._headerRow, c));
        }
      }

      if (oldColumnCount > 0) {
        this.emitChanged({
          type: 'columns-inserted',
          region: 'body',
          index: oldColumnCount,
          span: this._columnCount - oldColumnCount
        });
      }
    } else if (oldRowCount <= maxColumnOffsetsRows) {
      // Check to see if the new column offsets array is small enough to still
      // store, or if we should cut over to a small cache.
      if (this._rowCount <= maxColumnOffsetsRows) {
        // Expand the existing column offset array for new column offsets.
        const oldColumnOffsets = this._columnOffsets;
        this._columnOffsets = new Uint32Array(
          this._rowCount * this._columnCount
        );
        this._columnOffsets.set(oldColumnOffsets);
        this._columnOffsets.fill(0xffffffff, oldColumnOffsets.length);
      } else {
        // If not, then our cache size is at most the maximum number of rows we
        // fill in the cache at a time.
        const oldColumnOffsets = this._columnOffsets;
        this._columnOffsets = new Uint32Array(
          Math.min(this._maxCacheGet, maxColumnOffsetsRows) * this._columnCount
        );

        // Fill in the entries we already have.
        this._columnOffsets.set(
          oldColumnOffsets.subarray(0, this._columnOffsets.length)
        );

        // Invalidate the rest of the entries.
        this._columnOffsets.fill(0xffffffff, oldColumnOffsets.length);
        this._columnOffsetsStartingRow = 0;
      }
    }

    // We have more rows than before, so emit the rows-inserted change signal.
    let firstIndex = oldRowCount;
    if (this._header.length > 0) {
      firstIndex -= 1;
    }
    this.emitChanged({
      type: 'rows-inserted',
      region: 'body',
      index: firstIndex,
      span: this._rowCount - oldRowCount
    });
  }

  /**
   * Get the parsed string field for a row and column.
   *
   * @param row - The row number of the data item.
   * @param column - The column number of the data item.
   * @returns The parsed string for the data item.
   */
  private _getField(row: number, column: number): string {
    // Declare local variables.
    let value: string;
    let nextIndex;

    // Find the index for the first character in the field.
    const index = this.getOffsetIndex(row, column);

    // Initialize the trim adjustments.
    let trimRight = 0;
    let trimLeft = 0;

    // Find the end of the slice (the start of the next field), and how much we
    // should adjust to trim off a trailing field or row delimiter. First check
    // if we are getting the last column.
    if (column === this._columnCount! - 1) {
      // Check if we are getting any row but the last.
      if (row < this._rowCount! - 1) {
        // Set the next offset to the next row, column 0.
        nextIndex = this.getOffsetIndex(row + 1, 0);

        // Since we are not at the last row, we need to trim off the row
        // delimiter.
        trimRight += this._rowDelimiter.length;
      } else {
        // We are getting the last data item, so the slice end is the end of the
        // data string.
        nextIndex = this._rawData.length;

        // The string may or may not end in a row delimiter (RFC 4180 2.2), so
        // we explicitly check if we should trim off a row delimiter.
        if (
          this._rawData[nextIndex - 1] ===
          this._rowDelimiter[this._rowDelimiter.length - 1]
        ) {
          trimRight += this._rowDelimiter.length;
        }
      }
    } else {
      // The next field starts at the next column offset.
      nextIndex = this.getOffsetIndex(row, column + 1);

      // Trim off the delimiter if it exists at the end of the field
      if (
        index < nextIndex &&
        this._rawData[nextIndex - 1] === this._delimiter
      ) {
        trimRight += 1;
      }
    }

    // Check to see if the field begins with a quote. If it does, trim a quote on either side.
    if (
      this._rawData[index] === this._quote &&
      this._rawData[this._rowOffsets[row]] !== this._comment
    ) {
      trimLeft += 1;
      trimRight += 1;
    }

    // Slice the actual value out of the data string.
    value = this._rawData.slice(index + trimLeft, nextIndex - trimRight);

    // If we have a quoted field and we have an escaped quote inside it, unescape it.
    if (trimLeft === 1 && value.indexOf(this._quote) !== -1) {
      value = value.replace(this._quoteEscaped, this._quote);
    }

    // Return the value.
    return value;
  }

  /**
   * Find the first row that is neither a comment nor empty, and use it to
   * determine the header row and column count.
   */
  private _getFirstDataRow(): { row: number; ncols: number } {
    const comment = this._comment;
    const parser = PARSERS[this._parser];

    let row = 0;
    let startIndex = 0;
    while (startIndex < this._rawData.length) {
      if (
        this._rawData[startIndex] !== comment &&
        !this._rawData.startsWith(this._rowDelimiter, startIndex)
      ) {
        const { ncols } = parser({
          data: this._rawData,
          startIndex,
          delimiter: this._delimiter,
          rowDelimiter: this._rowDelimiter,
          quote: this._quote,
          columnOffsets: true,
          maxRows: 1
        });
        return { row, ncols };
      }
      const nextRow = this._rawData.indexOf(this._rowDelimiter, startIndex);
      if (nextRow === -1) {
        break;
      }
      startIndex = nextRow + this._rowDelimiter.length;
      row++;
    }

    const { ncols } = parser({
      data: this._rawData,
      delimiter: this._delimiter,
      rowDelimiter: this._rowDelimiter,
      quote: this._quote,
      comment: this._comment,
      columnOffsets: true,
      maxRows: 1
    });
    return { row: 0, ncols };
  }

  /**
   * Map a displayed body row to the underlying raw row, skipping the header.
   */
  private _bodyRowToRawRow(row: number): number {
    if (this._hasHeader === false) {
      return row;
    }
    return row < this._headerRow ? row : row + 1;
  }

  /**
   * Map a raw row to the displayed body row.
   */
  private _rawRowToBodyRow(row: number): number {
    if (this._hasHeader === false) {
      return row;
    }
    return row < this._headerRow ? row : row - 1;
  }

  /**
   * The first raw row which gets a row number: the row after the header.
   */
  private _firstNumberedRow(): number {
    return this._hasHeader ? this._headerRow + 1 : this._headerRow;
  }

  /**
   * The number of a raw row among the data rows, or `null` for rows above the
   * first data row and for comment rows.
   */
  private _rowNumber(row: number): number | null {
    const first = this._firstNumberedRow();
    if (row < first || this._isCommentRow(row)) {
      return null;
    }
    const comments =
      Private.lowerBound(this._commentRows, row) -
      Private.lowerBound(this._commentRows, first);
    return row - first + 1 - comments;
  }

  /**
   * Whether a raw row starts with the comment character.
   */
  private _isCommentRow(row: number): boolean {
    return (
      this._comment !== undefined &&
      this._rawData[this._rowOffsets[row]] === this._comment
    );
  }

  /**
   * Whether a comment row is shown split into the columns: it has as many
   * fields as the data, and in a file with two columns its fields are short.
   */
  private _isSplitComment(row: number): boolean {
    const index = Private.lowerBound(this._commentRows, row);
    return this._commentRows[index] === row && this._isSplitCommentAt(index);
  }

  /**
   * Whether the comment row at an index of `_commentRows` is shown split.
   */
  private _isSplitCommentAt(index: number): boolean {
    const columns = this._columnCount!;
    return (
      this._commentFields[index] === columns &&
      (columns > 2 ||
        this._commentLongest[index] <= Private.MAX_TWO_COLUMN_FIELD)
    );
  }

  /**
   * The comment rows merged across the columns, for the current column count.
   */
  private _getMergedRows(): number[] {
    if (
      this._mergedRowsColumns !== this._columnCount ||
      this._mergedRowsComments !== this._commentRows.length
    ) {
      this._mergedRows = this._commentRows.filter(
        (row, index) => !this._isSplitCommentAt(index)
      );
      this._mergedRowsColumns = this._columnCount;
      this._mergedRowsComments = this._commentRows.length;
      this._groups = [];
    }
    return this._mergedRows;
  }

  /**
   * Get the text of a raw row without the row delimiter.
   *
   * #### Notes
   * Quotes in comment rows are literal, so the row ends at the next delimiter.
   */
  private _getLine(row: number): string {
    const start = this._rowOffsets[row];
    const end = this._rawData.indexOf(this._rowDelimiter, start);
    return this._rawData.slice(start, end === -1 ? undefined : end);
  }

  /**
   * Reset the parser state.
   */
  private _resetParser(): void {
    this._columnCount = undefined;

    this._rowOffsets = new Uint32Array(0);
    this._rowCount = 0;
    this._startedParsing = false;
    this._commentRows = [];
    this._commentFields = [];
    this._commentLongest = [];
    this._mergedRows = [];
    this._mergedRowsColumns = undefined;
    this._mergedRowsComments = 0;
    this._groups = [];

    this._columnOffsets = new Uint32Array(0);

    // Clear out state associated with the asynchronous parsing.
    if (this._doneParsing === false) {
      // Explicitly catch this rejection at least once so an error is not thrown
      // to the console.
      this.ready.catch(() => {
        return;
      });
      this._ready.reject(undefined);
    }
    this._doneParsing = false;
    this._ready = new PromiseDelegate<void>();
    if (this._delayedParse !== null) {
      window.clearTimeout(this._delayedParse);
      this._delayedParse = null;
    }

    this.emitChanged({ type: 'model-reset' });
  }

  // Parser settings
  private _delimiter: string;
  private _comment: string | undefined;
  private _quote: string;
  private _quoteEscaped: RegExp;
  private _parser: 'quotes' | 'noquotes';
  private _rowDelimiter: string;

  // Data values
  private _rawData: string;
  private _rowCount: number | undefined = 0;
  private _columnCount: number | undefined;
  private _preferredColumnCount = 0;

  // Cache information
  /**
   * The header strings.
   */
  private _header: string[] = [];
  private _headerRow = 0;
  private _hasHeader = true;
  /**
   * The raw rows which start with the comment character, in order.
   */
  private _commentRows: number[] = [];
  /**
   * The field count of each comment row, or 0 when only empty fields follow
   * the first one.
   */
  private _commentFields: number[] = [];
  private _commentLongest: number[] = [];
  private _mergedRows: number[] = [];
  private _mergedRowsColumns: number | undefined = undefined;
  private _mergedRowsComments = 0;
  private _groups: CellGroup[] = [];
  /**
   * The column offset cache, starting with row _columnOffsetsStartingRow
   *
   * #### Notes
   * The index of the first character in the data string for row r, column c is
   * _columnOffsets[(r-this._columnOffsetsStartingRow)*numColumns+c]
   */
  private _columnOffsets: Uint32Array = new Uint32Array(0);
  /**
   * The row that _columnOffsets[0] represents.
   */
  private _columnOffsetsStartingRow: number = 0;
  /**
   * The maximum number of rows to parse when there is a cache miss.
   */
  private _maxCacheGet: number = 1000;
  /**
   * The index for the start of each row.
   */
  private _rowOffsets: Uint32Array = new Uint32Array(0);
  /**
   * The number of rows to parse initially before doing a delayed parse of the
   * entire data.
   */
  private _initialRows: number;

  // Bookkeeping variables.
  private _delayedParse: number | null = null;
  private _startedParsing: boolean = false;
  private _doneParsing: boolean = false;
  private _isDisposed: boolean = false;
  private _ready = new PromiseDelegate<void>();
}

/**
 * The namespace for the `DSVModel` class statics.
 */
export namespace DSVModel {
  /**
   * An options object for initializing a delimiter-separated data model.
   */
  export interface IOptions {
    /**
     * The field delimiter, such as ',' or '\t'.
     *
     * #### Notes
     * The field delimiter must be a single character.
     */
    delimiter: string;

    /**
     * Optional comment character used to ignore header/column detection for
     * matching rows while still rendering those rows in the grid.
     */
    comment?: string;

    /**
     * The data source for the data model.
     */
    data: string;

    /**
     * Whether the data has a one-row header.
     */
    header?: boolean;

    /**
     * Row delimiter.
     *
     * #### Notes
     * Any carriage return or newline character that is not a delimiter should
     * be in a quoted field, regardless of the row delimiter setting.
     */
    rowDelimiter?: '\r\n' | '\r' | '\n';

    /**
     * Quote character.
     *
     * #### Notes
     * Quotes are escaped by repeating them, as in RFC 4180. The quote must be a
     * single character.
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

    /**
     * The maximum number of initial rows to parse before doing a asynchronous
     * full parse of the data. This should be greater than 0.
     */
    initialRows?: number;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The metadata of the cells in a comment row.
   */
  export const COMMENT_METADATA: DataModel.Metadata = Object.freeze({
    comment: true
  });

  /**
   * The metadata of the cells in a comment row merged across the columns.
   */
  export const MERGED_COMMENT_METADATA: DataModel.Metadata = Object.freeze({
    comment: true,
    merged: true
  });

  /**
   * The maximum number of comment rows merged across the columns.
   */
  export const MAX_MERGED_ROWS = 1000;

  /**
   * The longest field of a comment line split in a file with two columns.
   *
   * #### Notes
   * Prose with one delimiter also has two fields; its fields are longer than
   * column names or units.
   */
  export const MAX_TWO_COLUMN_FIELD = 30;

  /**
   * The number of items in a sorted array which are less than a value.
   */
  export function lowerBound(sorted: number[], value: number): number {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (sorted[middle] < value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  }
}
