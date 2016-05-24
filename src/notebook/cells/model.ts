// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as utils
 from 'jupyter-js-utils';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  CellType, IBaseCell, ICodeCell
} from '../notebook/nbformat';

import {
  IMetadataCursor, MetadataCursor
} from '../common/metadata';

import {
  ObservableOutputs
} from '../output-area';


/**
 * The definition of a model object for a cell.
 */
export
interface ICellModel extends IDisposable {
  /**
   * The type of cell.
   */
  type: CellType;

  /**
   * A signal emitted when the content of the model changes.
   */
  contentChanged: ISignal<ICellModel, string>;

  /**
   * The input content of the cell.
   */
  source: string;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any;

  /**
   * Get a metadata cursor for the cell.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the cell.
   */
  getMetadata(name: string): IMetadataCursor;

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): string[];
}


/**
 * The definition of a code cell.
 */
export
interface ICodeCellModel extends ICellModel {
  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  executionCount: number;

  /**
   * The cell outputs.
   */
  outputs: ObservableOutputs;
}


/**
 * An implementation of the cell model.
 */
export
class CellModel implements ICellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  constructor(cell?: IBaseCell) {
    if (!cell) {
      return;
    }
    this.source = cell.source;
    let metadata = utils.copy(cell.metadata);
    if (this.type !== 'raw') {
      delete metadata['format'];
    }
    if (this.type !== 'code') {
      delete metadata['collapsed'];
      delete metadata['scrolled'];
    }
    this._metadata = metadata;
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get contentChanged(): ISignal<ICellModel, string> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * The input content of the cell.
   */
  get source(): string {
    return this._source;
  }
  set source(value: string) {
    if (this._source === value) {
      return;
    }
    this._source = value;
    this.contentChanged.emit('source');
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._metadata === null;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    for (let cursor of this._cursors) {
      cursor.dispose();
    }
    this._cursors = null;
    this._metadata = null;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): IBaseCell {
    return {
      cell_type: this.type,
      source: this.source,
      metadata: utils.copy(this._metadata)
    };
  }

  /**
   * Get a metadata cursor for the cell.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the cell.
   */
  getMetadata(name: string): IMetadataCursor {
    let cursor = new MetadataCursor(
      name,
      () => {
        return this._metadata[name];
      },
      (value: string) => {
        this.setCursorData(name, value);
      }
    );
    this._cursors.push(cursor);
    return cursor;
  }

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): string[] {
    return Object.keys(this._metadata);
  }

  /**
   * Set the cursor data for a given field.
   */
  protected setCursorData(name: string, value: any): void {
    if (this._metadata[name] === value) {
      return;
    }
    this._metadata[name] = value;
    this.contentChanged.emit(`metadata.${name}`);
  }

  /**
   * The type of cell.
   */
  type: CellType;

  private _metadata: { [key: string]: any } = Object.create(null);
  private _cursors: MetadataCursor[] = [];
  private _source = '';
}


/**
 * An implementation of a raw cell model.
 */
export
class RawCellModel extends CellModel {
  type: CellType = 'raw';
}


/**
 * An implementation of a markdown cell model.
 */
export
class MarkdownCellModel extends CellModel {
  type: CellType = 'markdown';
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends CellModel implements ICodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  constructor(cell?: IBaseCell) {
    super(cell);
    this._outputs = new ObservableOutputs();
    if (cell && cell.cell_type === 'code') {
      this.executionCount = (cell as ICodeCell).execution_count;
      this._outputs.assign((cell as ICodeCell).outputs);
    }
    this._outputs.changed.connect(() => {
      this.contentChanged.emit('outputs');
    });
  }

  /**
   * The execution count of the cell.
   */
  get executionCount(): number {
    return this._executionCount;
  }
  set executionCount(value: number) {
    if (value === this._executionCount) {
      return;
    }
    this._executionCount = value;
    this.contentChanged.emit('executionCount');
  }

  /**
   * The cell outputs.
   *
   * #### Notes
   * This is a read-only property.
   */
  get outputs(): ObservableOutputs {
    return this._outputs;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._outputs.clear(false);
    this._outputs = null;
    super.dispose();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): ICodeCell {
    let cell = super.toJSON() as ICodeCell;
    cell.execution_count = this.executionCount;
    let outputs = this.outputs;
    cell.outputs = [];
    for (let i = 0; i < outputs.length; i++) {
      cell.outputs.push(outputs.get(i));
    }
    return cell;
  }

  type: CellType = 'code';

  private _outputs: ObservableOutputs = null;
  private _executionCount: number = null;
}


/**
 * A namespace for cell private data.
 */
namespace Private {
  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const contentChangedSignal = new Signal<ICellModel, string>();
}
