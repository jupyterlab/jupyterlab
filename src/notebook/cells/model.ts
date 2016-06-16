// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as utils
 from 'jupyter-js-utils';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  nbformat
} from '../notebook/nbformat';

import {
  deepEqual
} from '../common/json';

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
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  type: nbformat.CellType;

  /**
   * A signal emitted when the content of the model changes.
   */
  contentChanged: ISignal<ICellModel, void>;

  /**
   * A signal emitted when a model state changes.
   */
  stateChanged: ISignal<ICellModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a metadata field changes.
   */
  metadataChanged: ISignal<ICellModel, IChangedArgs<any>>;

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
 * The definition of a markdown cell.
 */
export
interface IMarkdownCellModel extends ICellModel { }


/**
 * The definition of a raw cell.
 */
export
interface IRawCellModel extends ICellModel { }


/**
 * An implementation of the cell model.
 */
export
class CellModel implements ICellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  constructor(cell?: nbformat.IBaseCell) {
    if (!cell) {
      return;
    }
    if (Array.isArray(cell.source)) {
      this.source = (cell.source as string[]).join('\n');
    } else {
      this.source = cell.source as string;
    }
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
  get contentChanged(): ISignal<ICellModel, void> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a model state changes.
   */
  get stateChanged(): ISignal<ICellModel, IChangedArgs<any>> {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a metadata field changes.
   */
  get metadataChanged(): ISignal<ICellModel, IChangedArgs<any>> {
    return Private.metadataChangedSignal.bind(this);
  }

  /**
   * The input content of the cell.
   */
  get source(): string {
    return this._source;
  }
  set source(newValue: string) {
    if (this._source === newValue) {
      return;
    }
    let oldValue = this._source;
    this._source = newValue;
    this.contentChanged.emit(void 0);
    this.stateChanged.emit({ name: 'source', oldValue, newValue });
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
    for (let key in this._cursors) {
      this._cursors[key].dispose();
    }
    this._cursors = null;
    this._metadata = null;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IBaseCell {
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
    if (name in this._cursors) {
      return this._cursors[name];
    }
    let cursor = new MetadataCursor(
      name,
      () => {
        return this._metadata[name];
      },
      (value: string) => {
        this.setCursorData(name, value);
      }
    );
    this._cursors[name] = cursor;
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
  protected setCursorData(name: string, newValue: any): void {
    let oldValue = this._metadata[name];
    if (deepEqual(oldValue, newValue)) {
      return;
    }
    this._metadata[name] = newValue;
    this.contentChanged.emit(void 0);
    this.metadataChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The type of cell.
   */
  type: nbformat.CellType;

  private _metadata: { [key: string]: any } = Object.create(null);
  private _cursors: { [key: string]: MetadataCursor } = Object.create(null);
  private _source = '';
}


/**
 * An implementation of a raw cell model.
 */
export
class RawCellModel extends CellModel {
  /**
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  get type(): 'raw' {
    return 'raw';
  }
}


/**
 * An implementation of a markdown cell model.
 */
export
class MarkdownCellModel extends CellModel {
  /**
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  get type(): 'markdown' {
    return 'markdown';
  }
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends CellModel implements ICodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  constructor(cell?: nbformat.IBaseCell) {
    super(cell);
    this._outputs = new ObservableOutputs();
    if (cell && cell.cell_type === 'code') {
      this.executionCount = (cell as nbformat.ICodeCell).execution_count;
      this._outputs.assign((cell as nbformat.ICodeCell).outputs);
    }
    this._outputs.changed.connect(() => {
      this.contentChanged.emit(void 0);
    });
  }

  /**
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  get type(): 'code' {
    return 'code';
  }

  /**
   * The execution count of the cell.
   */
  get executionCount(): number {
    return this._executionCount;
  }
  set executionCount(newValue: number) {
    if (newValue === this._executionCount) {
      return;
    }
    let oldValue = this.executionCount;
    this._executionCount = newValue;
    this.contentChanged.emit(void 0);
    this.stateChanged.emit({ name: 'executionCount', oldValue, newValue });
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
  toJSON(): nbformat.ICodeCell {
    let cell = super.toJSON() as nbformat.ICodeCell;
    cell.execution_count = this.executionCount;
    let outputs = this.outputs;
    cell.outputs = [];
    for (let i = 0; i < outputs.length; i++) {
      cell.outputs.push(outputs.get(i));
    }
    return cell;
  }

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
  const contentChangedSignal = new Signal<ICellModel, void>();

  /**
   * A signal emitted when a model state changes.
   */
  export
  const stateChangedSignal = new Signal<ICellModel, IChangedArgs<any>>();

  /**
   * A signal emitted when a metadata field changes.
   */
  export
  const metadataChangedSignal = new Signal<ICellModel, IChangedArgs<any>>();
}
