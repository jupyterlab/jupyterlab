// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Possible features to add:
// automatically telling if there are no quotes (in which case we can probably use much faster approach)
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

/**
 * Parse delimiter-separated data.
 *
 * @param options: The function options
 */
export
function parseDSV(options: parseDSV.IOptions): {nrows: number, ncols: number, offsets: number[]} {
  const {
    data,
    delimiter = ',',
    regex = true,
    // callbacks = {},
    startIndex = 0,
    startState = STATE.NEW_ROW,
    endIndex = data.length
  } = options;
  const CH_DELIMITER = delimiter.charCodeAt(0);
  const CH_QUOTE = 34; // "
  const CH_LF = 10; // \n
  const CH_CR = 13; // \r
  let endfield = new RegExp(`[${delimiter}\n\r]`, 'g');

  const { ESCAPED, ESCAPED_FIRST_QUOTE, UNESCAPED, NEW_FIELD, NEW_ROW, CR } = STATE;

  let state = startState;
  let i = startIndex - 1;
  let char;
  // let result;
  let offsets = [];
  let nrows = 0;
  let ncols = 1;
  let col = 1;
  while (i < endIndex - 1) {
    i++;
    if (state === NEW_ROW) {
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
      col = 1;
    } else if (state === NEW_FIELD) {
      offsets.push(i);
      // At the very start, nrows is immediately incremented.
      if (nrows === 1) {
        ncols++;
      }
      col++;
    }
/*
    if (callbacks[state] !== undefined) {
      result = callbacks[state](i, data, state);
      if (result) {
        return;
      }
    }
*/
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
  return {nrows, ncols, offsets};
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
     * Whether to use a regex to shortcut processing. If false, use a loop-based shortcut which sometimes is faster. Defaults to true.
     */
    regex?: boolean;

    /**
     * Callbacks for each state.
     */
    callbacks?: {[key: number]: ICallback};

    /**
     * The starting index in the string for processing. Defaults to 0.
     */
    startIndex?: number;

    /**
     * The starting parse state. Defaults to STATE.NEW_ROW.
     */
    startState?: number;

    /**
     * The ending index for parsing. Parsing proceeds up to, but not including, this index. Defaults to data.length.
     */
    endIndex?: number;
  }
}

export
function _parseDSVNoQuotes(data: string, delimiter: string) {
  let len = data.length;
  let i = 0;
  let offsets = [0];
  let k = 0;
  while (i < len) {
    k = data.indexOf('\r\n', i);
    if (k > 0) {
      offsets.push(k);
    }
    i = k;
  }
  return offsets;
}
