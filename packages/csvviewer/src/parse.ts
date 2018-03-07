// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Possible features to add:
// automatically telling if there are no quotes (in which case we can probably use much faster indexOf approach)
// Perhaps we allow quotes in a 'header row', but the search the rest of the file for quotes for faster approach
// comment character at start of line
// skip empty whitespace lines
// Skip rows with empty columns.
// preview (only parse the first N rows)
// header row (which adjusts the row index down one)
// error for too many/too few fields on a line. 
// Setting newline (\n, \r, \r\n), or even better, autoguessing it.
// Trim whitespace around delimiters (unless quoted)
// Sanity check on field size, with error if field exceeds the size.
// Test against https://github.com/maxogden/csv-spectrum. 
// Benchmark against https://www.npmjs.com/package/csv-parser and
// https://www.npmjs.com/package/csv-string and fast-csv.
// Check how fast the callback approach is compared to just getting the line offsets explicitly

// TODO: should the parse take an optional array to slot values into if it is
// given a specific number of rows and cols? This would save the offset array
// allocation initially. If so, the column padding/truncation needs to move to
// the NEW_FIELD case.

/**
 * Parse delimiter-separated data.
 *
 * @param options: The function options
 * @returns an object representing nrows/ncols parsed, and an offset array of
 * either nrows*ncols entries, or nrows entries, depending on the input option.
 * If computeOffsets is false, ncols returned will be 0.
 */
export
function parseDSV(options: parseDSV.IOptions): {nrows: number, ncols: number, offsets: number[]} {
  const {
    data,
    delimiter = ',',
    regex = false,
    startIndex = 0,
    columnOffsets = false,
    maxRows = 0xFFFFFFFF,
  } = options;
  // ncols will be set automatically if it is undefined.
  let ncols = options.ncols;

  const CH_DELIMITER = delimiter.charCodeAt(0);
  const CH_QUOTE = 34; // "
  const CH_LF = 10; // \n
  const CH_CR = 13; // \r
  const endIndex = data.length;
  const endfield = new RegExp(`[${delimiter}\n\r]`, 'g');

  const { ESCAPED, ESCAPED_FIRST_QUOTE, UNESCAPED, NEW_FIELD, NEW_ROW, CR } = STATE;

  // Always start off at the beginning of a row.
  let state = NEW_ROW;

  // we increment the index immediately in the loop, so decrement it here.
  let i = startIndex - 1;

  let char;
  let offsets = [];

  // Rows actually parsed
  let nrows = 0;

  let col;
  while (i < endIndex - 1) {
    i++;

    // Update return values based on state.
    switch (state) {
    case NEW_ROW:
      // If we just parsed the first row and the ncols is undefined, set it.
      if (nrows === 1 && ncols === undefined) {
        ncols = col;
      }

      // Pad or truncate the column offsets if we are returning them.
      if (columnOffsets === true && nrows > 0) {
        if (col < ncols) {
          // console.warn(`parsed ${col} columns instead of the expected ${ncols} in row ${nrows} in the row before before data: ${data.slice(i, 50)}`);
          for (; col < ncols; col++) {
            offsets.push(i);
          }
        } else if (col > ncols) {
          // console.warn(`parsed ${col} columns instead of the expected ${ncols} in row ${nrows} in the row before before data: ${data.slice(i, 50)}`);
          offsets.length = offsets.length - (col - ncols);
        }
      }

      // Return if nrows reaches the row goal.
      if (nrows === maxRows) {
        // Could also do a labeled break to jump to the end, or could convert
        // this switch to an if/else and use a break to escape the while loop.
        return {nrows, ncols: columnOffsets ? ncols : 0, offsets};
      }

      // Push the row offset
      offsets.push(i);

      // Increment row counter and reset column counter.
      nrows++;
      col = 1;
      break;

    case NEW_FIELD:
      if (columnOffsets === true) {
        offsets.push(i);
      }
      col++;
      break;

    default: break;
    }
    char = data.charCodeAt(i);
    switch (state) {
    case NEW_ROW:
    case NEW_FIELD:
      switch (char) {
      case CH_QUOTE:
        state = ESCAPED;
        break;
      case CH_CR:
        state = CR;
        break;
      case CH_LF:
        state = NEW_ROW;
        break;
      case CH_DELIMITER:
        state = NEW_FIELD;
        break;
      default:
        state = UNESCAPED;
        break;
      }
      break;

    case ESCAPED:
      // skip ahead until we see another quote
      i = data.indexOf('"', i);
      if (i < 0) {
        throw 'mismatched quote';
      }
      char = data.charCodeAt(i);
      switch (char) {
      case CH_QUOTE:
        state = ESCAPED_FIRST_QUOTE;
        break;
      default: continue;
      }
      break;

    case ESCAPED_FIRST_QUOTE:
      switch (char) {
      case CH_QUOTE:
        state = ESCAPED;
        break;
      case CH_DELIMITER:
        state = NEW_FIELD;
        break;
      case CH_CR: // line ending \r\n
        state = CR;
        break;
      case CH_LF: // line ending \n
        state = NEW_ROW;
        break;
      default:
        throw 'quote in escaped field not followed by quote, delimiter, or carriage return';
      }
      break;

    case UNESCAPED:
      // skip ahead to either the next delimiter or next CR or LF
      // Most of the time, the next thing is a delimiter. So find the next delimiter, then search in that range for a newline by a for loop?
      // The loop is slightly faster in Firefox, quite a bit slower in Chrome.
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

      switch (char) {
      case CH_DELIMITER:
        state = NEW_FIELD;
        break;
      case CH_CR: // line ending \r\n
        state = CR;
        break;
      case CH_LF: // line ending \n
        state = NEW_ROW;
        break;

      default: continue;
      }
      break;

    case CR:
      switch (char) {
      case CH_LF:
        state = NEW_ROW;
        break;
      default:
        throw 'CR not followed by newline';
      }
      break;

    default:
      throw 'state not recognized';
    }
  }
  return {nrows, ncols: columnOffsets ? ncols : 0, offsets};
}

export
enum STATE {
  ESCAPED,
  ESCAPED_FIRST_QUOTE,
  UNESCAPED,
  NEW_FIELD,
  NEW_ROW,
  CR
}

export
enum NEWLINE {
  CR,
  CRLF,
  LF
}

export
namespace parseDSV {
  export
  type ICallback = (i: number, data: string, state: STATE) => void | boolean;

  export
  interface IOptions {
    /**
     * The data to parse.
     */
    data: string;

    /**
     * The delimiter to use. Defaults to ','.
     */
    delimiter?: string;

    /**
     * The line delimiter to use. Defaults to '\r\n'.
     */
    lineDelimiter?: string;

    /**
     * Whether to use a regex to shortcut processing. If false, use a loop-based
     * shortcut which sometimes is faster. Defaults to false.
     */
    regex?: boolean;

    /**
     * Callbacks for each state.
     */
    // callbacks?: {[key: number]: ICallback};

    /**
     * The starting index in the string for processing. Defaults to 0. This must
     * be at the start of a row.
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
    columnOffsets?: boolean;
  }
}

/**
 * Optimized row offset parsing assuming there are no quotes.
 */
export
function parseDSVNoQuotes(options: parseDSV.IOptions) {
  const {
    data,
    delimiter = ',',
    lineDelimiter = '\n',
    startIndex = 0,
    columnOffsets = false,
    maxRows = 0xFFFFFFFF,
  } = options;
  // ncols will be set automatically if it is undefined.
  let ncols = options.ncols;
  let lineDelimiterLength = lineDelimiter.length;
  let i = startIndex;
  let len = data.length;
  let nextLine: number;
  let col: number;
  let offsets: number[] = [];
  let nrows = 0;
  let rowString: string;


  let lineEnd: number;
  nextLine = startIndex;
  while (nextLine !== -1 && nrows < maxRows) {
    offsets.push(i);
    nrows++;
    nextLine = data.indexOf(lineDelimiter, i);
    lineEnd = nextLine === -1 ? len : nextLine;

    if (columnOffsets === true) {
      // Assumes the slice is a zero-cost view. Otherwise it may be better to
      // just indexOf our way through until we pass stop or go negative,
      // possibly overshooting the end of the line.
      col = 1;
      rowString = data.slice(i, lineEnd);
      i = rowString.indexOf(delimiter);

      if (ncols === undefined) {
        while (i !== -1) {
          offsets.push(startIndex + i);
          col++;
          i = rowString.indexOf(delimiter, i + 1);
        }
        ncols = col;
      } else {
        while (i !== -1 && col <= ncols) {
          offsets.push(startIndex + i);
          col++;
          i = rowString.indexOf(delimiter, i + 1);
        }
        if (col < ncols) {
          for (; col <= ncols; col++) {
            offsets.push(nextLine);
          }
        }
      }
    }
    i = lineEnd + lineDelimiterLength;
  }

  return {nrows, ncols: columnOffsets ? ncols : 0, offsets};
}
