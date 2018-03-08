// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*
Possible options to add to the parser:

- Optional offsets array to modify, so we don't need to create a new offsets list (we would need to be careful not to overwrite things if a row needs to be truncated.)
- Comment character at the start of the line
- Skip empty whitespace lines
- Skip rows with empty columns
- Logging an error for too many or too few fields on a line
- Ignore whitespace around delimiters
- Sanity check on field size, with an error if the field exceeds the size
- Tests against https://github.com/maxogden/csv-spectrum
- Benchmark against https://www.npmjs.com/package/csv-parser and https://www.npmjs.com/package/csv-string and fast-csv.

*/

/**
 * Interface for a delimiter-separated data parser.
 *
 * @param options: The parser options
 * @returns An object giving the offsets for the rows or columns parsed.
 *
 * #### Notes
 * The parsers are based on [RFC 4180](https://tools.ietf.org/html/rfc4180).
 */
export
type IParser = (options: IParser.IOptions) => IParser.IResults;

export
namespace IParser {
  /**
   * The options for a parser.
   */
  export
  interface IOptions {
    /**
     * The data to parse.
     */
    data: string;

    /**
     * Whether to return column offsets in the offsets array.
     *
     * #### Notes
     * If false, the returned offsets array contains just the row offsets. If
     * true, the returned offsets array contains all column offsets for each
     * column in the rows (i.e., it has nrows*ncols entries). Individual rows
     * will have empty columns added or extra columns merged into the last
     * column if they do not have exactly ncols columns.
     */
    columnOffsets: boolean;

    /**
     * The delimiter to use. Defaults to ','.
     */
    delimiter?: string;

    /**
     * The row delimiter to use. Defaults to '\r\n'.
     */
    rowDelimiter?: string;

    /**
     * The quote character for quoting fields. Defaults to the double quote (").
     */
    quote?: string;

    /**
     * Whether to use a regex to shortcut processing. If false, use a loop-based
     * shortcut which sometimes is faster. Defaults to false.
     */
    regex?: boolean;

    /**
     * The starting index in the string for processing. Defaults to 0. This
     * index should be the first character of a new row.
     */
    startIndex?: number;

    /**
     * Maximum number of rows to parse.
     *
     * If this is not given, parsing proceeds to the end of the data.
     */
    maxRows?: number;

    /**
     * Number of columns in each row to parse.
     *
     * #### Notes
     * If this is not given, the ncols defaults to the number of columns in the
     * first row.
     */
    ncols?: number;

  }

  /**
   * The results from a parser.
   */
  export
  interface IResults {
    /**
     * The number of rows parsed.
     */
    nrows: number;

    /**
     * The number of columns parsed, or 0 if only row offsets are returned.
     */
    ncols: number;

    /**
     * The index offsets into the data string for the rows or data items.
     *
     * #### Notes
     * If the columnOffsets argument to the parser is false, the offsets array
     * will be an array of length nrows, where `offsets[r]` is the index of the
     * first character of row r.
     *
     * If the columnOffsets argument to the parser is true, the offsets array
     * will be an array of length `nrows*ncols`, where `offsets[r*ncols + c]` is
     * the index of the first character of the item in row r, column c.
     */
    offsets: number[];
  }
}

/**
 * Possible parser states.
 */
enum STATE {
  QUOTED_FIELD,
  QUOTED_FIELD_QUOTE,
  UNQUOTED_FIELD,
  NEW_FIELD,
  NEW_ROW,
}

/**
 * Possible row delimiters for the parser.
 */
enum ROW_DELIMITER {
  CR,
  CRLF,
  LF
}

/**
 * Parse delimiter-separated data.
 *
 * @param options: The parser options
 * @returns An object giving the offsets for the rows or columns parsed.
 *
 * #### Notes
 * This implementation is based on [RFC 4180](https://tools.ietf.org/html/rfc4180).
 */
export
function parseDSV(options: IParser.IOptions): IParser.IResults {
  const {
    data,
    columnOffsets,
    delimiter = ',',
    startIndex = 0,
    maxRows = 0xFFFFFFFF,
    rowDelimiter = '\r\n',
    quote = '"',
    regex = false,
  } = options;

  // ncols will be set automatically if it is undefined.
  let ncols = options.ncols;

  // Set up our return variables.
  let nrows = 0;
  let offsets = [];

  // Set up some useful local variables.
  const CH_DELIMITER = delimiter.charCodeAt(0);
  const CH_QUOTE = quote.charCodeAt(0);
  const CH_LF = 10; // \n
  const CH_CR = 13; // \r
  const endIndex = data.length;
  const endfield = new RegExp(`[${delimiter}${rowDelimiter}]`, 'g');
  const { QUOTED_FIELD, QUOTED_FIELD_QUOTE, UNQUOTED_FIELD, NEW_FIELD, NEW_ROW } = STATE;
  const { CR, LF, CRLF } = ROW_DELIMITER;
  const rowDelimiterCode = (rowDelimiter === '\r\n' ? CRLF : (rowDelimiter === '\r' ? CR : LF));

  // Always start off at the beginning of a row.
  let state = NEW_ROW;

  // We increment the index immediately in the loop, so decrement the start index here.
  let i = startIndex - 1;

  // Declare some useful temporaries
  let char;
  let col;

  // Loop through the data string
  while (i < endIndex - 1) {
    // Move to the next character.
    i++;

    // Update return values based on state.
    switch (state) {
    case NEW_ROW:
      // If we just parsed the first row and the ncols is undefined, set it to
      // the number of columns we found in the first row.
      if (nrows === 1 && ncols === undefined) {
        ncols = col;
      }

      // Pad or truncate the column offsets if we are returning them so that
      // each row has exactly the same number of columns.
      if (columnOffsets === true && nrows > 0) {
        if (col < ncols) {
          // We didn't have enough columns, so add some more.
          for (; col < ncols; col++) {
            offsets.push(i);
          }
        } else if (col > ncols) {
          // We had too many columns, so truncate them.
          offsets.length = offsets.length - (col - ncols);
        }
      }

      // Shortcut return if nrows reaches the maximum rows we are to parse.
      if (nrows === maxRows) {
        return {nrows, ncols: columnOffsets ? ncols : 0, offsets};
      }

      // Start a new row offset and update relevant variables.
      offsets.push(i);
      nrows++;
      col = 1;
      break;

    case NEW_FIELD:
      // If we are returning column offsets, log the current index.
      if (columnOffsets === true) {
        offsets.push(i);
      }

      // Update the column counter.
      col++;
      break;

    default: break;
    }

    // Get the integer code for the current character, so the comparisons below
    // are faster.
    char = data.charCodeAt(i);

    // Update the parser state.
    switch (state) {

    // At the beginning of a row or field, we can have a quote, row delimiter, or field delimiter.
    case NEW_ROW:
    case NEW_FIELD:
      switch (char) {

      // If we have a quote, we are starting an escaped field.
      case CH_QUOTE:
        state = QUOTED_FIELD;
        break;

      // A row delimiter means we are immediately starting a new row.
      case CH_CR:
        if (rowDelimiterCode === CR) {
          state = NEW_ROW;
        } else if (rowDelimiterCode === CRLF && data.charCodeAt(i + 1) === CH_LF) {
          // If we see an expected \r\n, then increment past the \n and start the new row.
          i++;
          state = NEW_ROW;
        } else {
          throw `string index ${i} (in row ${nrows}, column ${col}): carriage return found, but not as part of a row delimiter C ${ data.charCodeAt(i + 1)}`;
        }
        break;
      case CH_LF:
        if (rowDelimiterCode === LF) {
          state = NEW_ROW;
        } else {
          throw `string index ${i} (in row ${nrows}, column ${col}): line feed found, but row delimiter starts with a carriage return`;
        }
        break;

      // A field delimiter means we are immediately starting a new field.
      case CH_DELIMITER:
        state = NEW_FIELD;
        break;

      // Otherwise, we are starting an unquoted field.
      default:
        state = UNQUOTED_FIELD;
        break;
      }
      break;

    // We are in a quoted field.
    case QUOTED_FIELD:
      // Skip ahead until we see another quote, which either ends the quoted
      // field or starts an escaped quote.
      i = data.indexOf(quote, i);
      if (i < 0) {
        throw `string index ${i} (in row ${nrows}, column ${col}): mismatched quote`;
      }
      state = QUOTED_FIELD_QUOTE;
      break;

    // We just saw a quote in a quoted field. This could be the end of the
    // field, or it could be a double quote (i.e., an escaped quote).
    case QUOTED_FIELD_QUOTE:
      switch (char) {
      // Another quote means we just saw an escaped quote, so we are still in
      // the quoted field.
      case CH_QUOTE:
        state = QUOTED_FIELD;
        break;

      // A field or row delimiter means the quoted field just ended and we are
      // going into a new field or new row.
      case CH_DELIMITER:
        state = NEW_FIELD;
        break;
      case CH_CR:
        if (rowDelimiterCode === CR) {
          state = NEW_ROW;
        } else if (rowDelimiterCode === CRLF && data.charCodeAt(i + 1) === CH_LF) {
          i++;
          state = NEW_ROW;
        } else {
          throw `string index ${i} (in row ${nrows}, column ${col}): carriage return found, but not as part of a row delimiter - A ${ data.charCodeAt(i + 1)}`;
        }
        break;
      case CH_LF:
        if (rowDelimiterCode === LF) {
          state = NEW_ROW;
        } else {
          throw `string index ${i} (in row ${nrows}, column ${col}): line feed found at index ${i}, but row delimiter starts with a carriage return`;
        }
        break;

      default:
        throw `string index ${i} (in row ${nrows}, column ${col}): quote in escaped field not followed by quote, delimiter, or row delimiter`;
      }
      break;

    // We are in an unquoted field, so the only thing we look for is the next
    // row or field delimiter.
    case UNQUOTED_FIELD:
      // Skip ahead to either the next field delimiter or possible start of a
      // row delimiter (CR or LF). In some cases and browsers, the regex
      // approach is faster by quite a bit, but in others, the loop is faster.
      // More testing is needed to see which approach we want to keep.
      if (regex) {
        endfield.lastIndex = i;
        let match = endfield.exec(data);
        if (match) {
          i = match.index;
          char = data.charCodeAt(i);
        }
      } else {
        while (i < endIndex - 1) {
          char = data.charCodeAt(i);
          if (char === CH_DELIMITER || char === CH_LF || char === CH_CR) {
            break;
          }
          i++;
        }
      }

      // Process the character we're seeing in an unquoted field.
      switch (char) {
      // A row delimiter means we are starting a new field.
      case CH_DELIMITER:
        state = NEW_FIELD;
        break;

      // A row delimiter means we are starting a new row.
      case CH_CR:
        if (rowDelimiterCode === CR) {
          state = NEW_ROW;
        } else if (rowDelimiterCode === CRLF && data.charCodeAt(i + 1) === CH_LF) {
          i++;
          state = NEW_ROW;
        } else {
          throw `string index ${i} (in row ${nrows}, column ${col}): carriage return found, but not as part of a row delimiter B De ${rowDelimiterCode} ${ data.charCodeAt(i + 1)}`;
        }
        break;
      case CH_LF:
        if (rowDelimiterCode === LF) {
          state = NEW_ROW;
        } else {
          throw `string index ${i} (in row ${nrows}, column ${col}): line feed found, but row delimiter starts with a carriage return`;
        }
        break;

      // Otherwise, we continue on in the unquoted field.
      default: continue;
      }
      break;

    // We should never reach this point since the parser state is handled above,
    // so throw an error if we do.
    default:
      throw `string index ${i} (in row ${nrows}, column ${col}): state not recognized`;
    }
  }

  return {nrows, ncols: columnOffsets ? ncols : 0, offsets};
}


/**
 * Parse delimiter-separated data where no delimiter is quoted.
 *
 * @param options: The parser options
 * @returns An object giving the offsets for the rows or columns parsed.
 *
 * #### Notes
 * This function is an optimized parser for cases where there are no field or
 * row delimiters in quotes. Note that the data can have quotes, but they are
 * not interpreted in any special way. This implementation is based on [RFC
 * 4180](https://tools.ietf.org/html/rfc4180), but disregards quotes.
 */
export
function parseDSVNoQuotes(options: IParser.IOptions): IParser.IResults {
  // Set option defaults.
  const {
    data,
    columnOffsets,
    delimiter = ',',
    rowDelimiter = '\r\n',
    startIndex = 0,
    maxRows = 0xFFFFFFFF,
  } = options;

  // ncols will be set automatically if it is undefined.
  let ncols = options.ncols;

  // Set up our return variables.
  let offsets: number[] = [];
  let nrows = 0;

  // Set up various state variables.
  let rowDelimiterLength = rowDelimiter.length;
  let currRow = startIndex;
  let len = data.length;
  let nextRow: number;
  let col: number;
  let rowString: string;
  let colIndex: number;

  // The end of the current row.
  let rowEnd: number;

  // Start parsing at the start index.
  nextRow = startIndex;

  // Loop through rows until we run out of data or we've reached maxRows.
  while (nextRow !== -1 && nrows < maxRows && currRow < len) {
    // Store the offset for the beginning of the row and increment the rows.
    offsets.push(currRow);
    nrows++;

    // Find the next row delimiter.
    nextRow = data.indexOf(rowDelimiter, currRow);

    // If the next row delimiter is not found, set the end of the row to the
    // end of the data string.
    rowEnd = nextRow === -1 ? len : nextRow;

    // If we are returning column offsets, push them onto the array.
    if (columnOffsets === true) {
      // Find the next field delimiter. We slice the current row out so that
      // the indexOf will stop at the end of the row. It may possibly be faster
      // to just use a loop to check each character.
      col = 1;
      rowString = data.slice(currRow, rowEnd);
      colIndex = rowString.indexOf(delimiter);

      if (ncols === undefined) {
        // If we don't know how many columns we need, loop through and find all
        // of the field delimiters in this row.
        while (colIndex !== -1) {
          offsets.push(currRow + colIndex + 1);
          col++;
          colIndex = rowString.indexOf(delimiter, colIndex + 1);
        }

        // Set ncols to the number of fields we found.
        ncols = col;
      } else {
        // If we know the number of columns we expect, find the field delimiters
        // up to that many columns.
        while (colIndex !== -1 && col <= ncols) {
          offsets.push(currRow + colIndex + 1);
          col++;
          colIndex = rowString.indexOf(delimiter, colIndex + 1);
        }

        // If we didn't reach the number of columns we expected, pad the offsets
        // with the offset just before the row delimiter.
        if (col < ncols) {
          for (; col <= ncols; col++) {
            offsets.push(rowEnd);
          }
        }
      }
    }

    // Skip past the row delimiter at the end of the row.
    currRow = rowEnd + rowDelimiterLength;
  }

  return {nrows, ncols: columnOffsets ? ncols : 0, offsets};
}
