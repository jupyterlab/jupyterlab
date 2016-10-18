// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  deepEqual, JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  IIterator, iter
} from 'phosphor/lib/algorithm/iteration';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  IObservableVector, ObservableVector
} from '../../common/observablevector';

import {
  DocumentModel, DocumentRegistry
} from '../../docregistry';

import {
  ICellModel, ICodeCellModel, IRawCellModel, IMarkdownCellModel,
  CodeCellModel, RawCellModel, MarkdownCellModel
} from '../cells/model';

import {
  IChangedArgs
} from '../../common/interfaces';

import {
  IMetadataCursor, MetadataCursor
} from '../common/metadata';

import {
  IObservableUndoableVector, ObservableUndoableVector
} from '../common/undo';

import {
  nbformat
} from './nbformat';


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends DocumentRegistry.IModel {
  /**
   * A signal emitted when a metadata field changes.
   */
  metadataChanged: ISignal<DocumentRegistry.IModel, IChangedArgs<JSONValue>>;

  /**
   * The list of cells in the notebook.
   */
  readonly cells: IObservableUndoableVector<ICellModel>;

  /**
   * The cell model factory for the notebook.
   */
  readonly factory: ICellModelFactory;

  /**
   * The major version number of the nbformat.
   */
  readonly nbformat: number;

  /**
   * The minor version number of the nbformat.
   */
  readonly nbformatMinor: number;

  /**
   * Get a metadata cursor for the notebook.
   *
   * #### Notes
   * This method is used to interact with a namespaced
   * set of metadata on the notebook.
   */
  getMetadata(namespace: string): IMetadataCursor;

  /**
   * List the metadata namespace keys for the notebook.
   */
  listMetadata(): IIterator<string>;
}


/**
 * A factory for creating cell models.
 */
export
interface ICellModelFactory {
  /**
   * Create a new code cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new code cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createCodeCell(source?: nbformat.IBaseCell): ICodeCellModel;

  /**
   * Create a new markdown cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new markdown cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createMarkdownCell(source?: nbformat.IBaseCell): IMarkdownCellModel;

  /**
   * Create a new raw cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new raw cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createRawCell(source?: nbformat.IBaseCell): IRawCellModel;
}


/**
 * An implementation of a notebook Model.
 */
export
class NotebookModel extends DocumentModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    super(options.languagePreference);
    this._factory = options.factory || NotebookModel.defaultFactory;
    this._cells = new ObservableUndoableVector<ICellModel>((data: nbformat.IBaseCell) => {
      switch (data.cell_type) {
        case 'code':
          return this._factory.createCodeCell(data);
        case 'markdown':
          return this._factory.createMarkdownCell(data);
        default:
          return this._factory.createRawCell(data);
      }
    });
    // Add an initial code cell by default.
    this._cells.pushBack(this._factory.createCodeCell());
    this._cells.changed.connect(this._onCellsChanged, this);
    if (options.languagePreference) {
      this._metadata['language_info'] = { name: options.languagePreference };
    }
  }

  /**
   * A signal emitted when a metadata field changes.
   */
  metadataChanged: ISignal<this, IChangedArgs<JSONValue>>;

  /**
   * Get the observable list of notebook cells.
   */
  get cells(): IObservableUndoableVector<ICellModel> {
    return this._cells;
  }

  /**
   * The cell model factory for the notebook.
   */
  get factory(): ICellModelFactory {
    return this._factory;
  }

  /**
   * The major version number of the nbformat.
   */
  get nbformat(): number {
    return this._nbformat;
  }

  /**
   * The minor version number of the nbformat.
   */
  get nbformatMinor(): number {
    return this._nbformatMinor;
  }

  /**
   * The default kernel name of the document.
   */
  get defaultKernelName(): string {
    let spec = this._metadata['kernelspec'];
    return spec ? spec.name : '';
  }

  /**
   * The default kernel language of the document.
   */
  get defaultKernelLanguage(): string {
    let info = this._metadata['language_info'];
    return info ? info.name : '';
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    let cells = this._cells;
    cells.dispose();
    clearSignalData(this);
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.at(i);
      cell.dispose();
    }
    cells.clear();
    this._cells = null;
    for (let key in this._cursors) {
      this._cursors[key].dispose();
    }
    this._cursors = null;
    this._metadata = null;
    super.dispose();
  }

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    this.fromJSON(JSON.parse(value));
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.INotebookContent {
    let cells: nbformat.ICell[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      let cell = this.cells.at(i);
      cells.push(cell.toJSON());
    }
    let metadata = utils.copy(this._metadata) as nbformat.INotebookMetadata;
    return {
      metadata,
      nbformat_minor: this._nbformatMinor,
      nbformat: this._nbformat,
      cells
    };
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: nbformat.INotebookContent): void {
    let cells: ICellModel[] = [];
    for (let data of value.cells) {
      switch (data.cell_type) {
      case 'code':
        cells.push(new CodeCellModel(data));
        break;
      case 'markdown':
        cells.push(new MarkdownCellModel(data));
        break;
      case 'raw':
        cells.push(new RawCellModel(data));
        break;
      default:
        continue;
      }
    }
    this.cells.beginCompoundOperation();
    this.cells.clear();
    this.cells.pushAll(cells);
    this.cells.endCompoundOperation();

    let oldValue = 0;
    let newValue = 0;
    if (value.nbformat !== this._nbformat) {
      oldValue = this._nbformat;
      this._nbformat = newValue = value.nbformat;
      this.stateChanged.emit({ name: 'nbformat', oldValue, newValue });
    }
    if (value.nbformat_minor !== this._nbformatMinor) {
      oldValue = this._nbformat;
      this._nbformatMinor = newValue = value.nbformat_minor;
      this.stateChanged.emit({ name: 'nbformatMinor', oldValue, newValue });
    }
    // Update the metadata.
    let metadata = value.metadata;
    let builtins = ['kernelspec', 'language_info', 'orig_nbformat'];
    for (let key in this._metadata) {
      if (builtins.indexOf(key) !== -1) {
        continue;
      }
      if (!(key in metadata)) {
        this._setCursorData(key, null);
        delete this._metadata[key];
        if (this._cursors[key]) {
          this._cursors[key].dispose();
          delete this._cursors[key];
        }
      }
    }
    for (let key in metadata) {
      this._setCursorData(key, (metadata as any)[key]);
    }
    this.dirty = true;
  }

  /**
   * Get a metadata cursor for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the notebook.
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
        this._setCursorData(name, value);
      }
    );
    this._cursors[name] = cursor;
    return cursor;
  }

  /**
   * List the metadata namespace keys for the notebook.
   */
  listMetadata(): IIterator<string> {
    return iter(Object.keys(this._metadata));
  }

  /**
   * Set the cursor data for a given field.
   */
  private _setCursorData(name: string, newValue: any): void {
    let oldValue = this._metadata[name];
    if (deepEqual(oldValue, newValue)) {
      return;
    }
    this._metadata[name] = newValue;
    this.dirty = true;
    this.contentChanged.emit(void 0);
    this.metadataChanged.emit({ name, oldValue, newValue });
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: IObservableVector<ICellModel>, change: ObservableVector.IChangedArgs<ICellModel>): void {
    switch (change.type) {
    case 'add':
      each(change.newValues, cell => {
        cell.contentChanged.connect(this._onCellChanged, this);
      });
      break;
    case 'remove':
      each(change.oldValues, cell => {
        cell.dispose();
      });
      break;
    case 'set':
      each(change.newValues, cell => {
        cell.contentChanged.connect(this._onCellChanged, this);
      });
      each(change.oldValues, cell => {
        cell.dispose();
      });
      break;
    default:
      return;
    }
    // Add code cell if there are no cells remaining.
    if (!this._cells.length) {
      // Add the cell in a new context to avoid triggering another
      // cell changed event during the handling of this signal.
      requestAnimationFrame(() => {
        if (!this.isDisposed && !this._cells.length) {
          this._cells.pushBack(this._factory.createCodeCell());
        }
      });
    }
    this.contentChanged.emit(void 0);
    this.dirty = true;
  }

  /**
   * Handle a change to a cell state.
   */
  private _onCellChanged(cell: ICellModel, change: any): void {
    this.dirty = true;
    this.contentChanged.emit(void 0);
  }

  private _cells: IObservableUndoableVector<ICellModel> = null;
  private _factory: ICellModelFactory = null;
  private _metadata: { [key: string]: any } = Private.createMetadata();
  private _cursors: { [key: string]: MetadataCursor } = Object.create(null);
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
}


// Define the signals for the `NotebookModel` class.
defineSignal(NotebookModel.prototype, 'metadataChanged');


/**
 * The namespace for the `NotebookModel` class statics.
 */
export
namespace NotebookModel {
  /**
   * An options object for initializing a notebook model.
   */
  export
  interface IOptions {
    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * A factory for creating cell models.
     *
     * The default is a shared factory instance.
     */
    factory?: ICellModelFactory;
  }

  /**
   * The default implementation of an `ICellModelFactory`.
   */
  export
  class Factory {
    /**
     * Create a new code cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createCodeCell(source?: nbformat.ICell): ICodeCellModel {
      return new CodeCellModel(source);
    }

    /**
     * Create a new markdown cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createMarkdownCell(source?: nbformat.IBaseCell): IMarkdownCellModel {
      return new MarkdownCellModel(source);
    }

    /**
     * Create a new raw cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createRawCell(source?: nbformat.IBaseCell): IRawCellModel {
     return new RawCellModel(source);
    }
  }

  /**
   * The default `Factory` instance.
   */
  export
  const defaultFactory = new Factory();
}


/**
 * A private namespace for notebook model data.
 */
namespace Private {
  /**
   * Create the default metadata for the notebook.
   */
  export
  function createMetadata(): nbformat.INotebookMetadata {
    return {
      kernelspec: { name: '', display_name: '' },
      language_info: { name: '' },
      orig_nbformat: 1
    };
  }
}
