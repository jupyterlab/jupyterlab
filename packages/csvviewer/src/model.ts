// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DataModel
} from '@phosphor/datagrid';


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
  this._data = options.data;
  this._delimiter = options.delimiter;
  this._computeOffsets();
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
    return this._offsets.length;
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
    if (this._parsedRowNum !== row) {
      this._parsedRow = this._data.slice(this._offsets[row], this._offsets[row + 1]).split(this._delimiter);
      this._parsedRowNum = row;
    }
    value = this._parsedRow[column];
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
  let offsets = [0];

  // Calculate the line offsets.
  let len = this._data.length;
  for (let i = 0; i < len; i++) {
      if (this._data[i] === '\n') {
          offsets.push(i + 1);
      }
  }
  if (offsets[offsets.length] > 4294967296) {
    throw 'csv too large';
  }
  if (offsets.length > 1) {
    this._columnCount = this._data.slice(0, offsets[1]).split(this._delimiter).length;
  } else {
    // one row
    this._columnCount = this._data.split(this._delimiter).length;
  }
  this._offsets = Uint32Array.from(offsets);
}

private _data: string;
private _delimiter: string;

/**
 * The offsets for each successive line.
 *
 * #### Notes
 * If an offset is more than 2^32, then the data is more than 4GB. That's not
 * practical in browsers these days?
 */
private _offsets: Uint32Array;

private _parsedRowNum: number;
private _parsedRow: string[];
private _columnCount: number;
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
  }
}
