// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as utils
 from 'jupyter-js-utils';

import {
  IObservableList, ListChangeType, IListChangedArgs
} from 'phosphor-observablelist';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  DocumentModel, IDocumentModel
} from '../../docregistry';

import {
  ICellModel, CodeCellModel, RawCellModel, MarkdownCellModel
} from '../cells/model';

import {
  deepEqual
} from '../common/json';

import {
  IMetadataCursor, MetadataCursor
} from '../common/metadata';

import {
  ObservableUndoableList
} from '../common/undo';

import {
  nbformat
} from './nbformat';


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends IDocumentModel {
  /**
   * A signal emitted when a model state changes.
   */
  stateChanged: ISignal<IDocumentModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a metadata field changes.
   */
  metadataChanged: ISignal<IDocumentModel, IChangedArgs<any>>;

  /**
   * The list of cells in the notebook.
   *
   * #### Notes
   * This is a read-only property.
   */
  cells: ObservableUndoableList<ICellModel>;

  /**
   * The major version number of the nbformat.
   *
   * #### Notes
   * This is a read-only property.
   */
  nbformat: number;

  /**
   * The minor version number of the nbformat.
   *
   * #### Notes
   * This is a read-only property.
   */
  nbformatMinor: number;

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
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): string[];

  /**
   * A factory for creating a new code cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new code cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createCodeCell(source?: nbformat.IBaseCell): CodeCellModel;

  /**
   * A factory for creating a new Markdown cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new markdown cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createMarkdownCell(source?: nbformat.IBaseCell): MarkdownCellModel;

  /**
   * A factory for creating a new raw cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new raw cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createRawCell(source?: nbformat.IBaseCell): RawCellModel;
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
    this._codeFactory = options.codeCellFactory || Private.createCodeCell;
    this._mdFactory = options.markdownCellFactory || Private.createMarkdownCell;
    this._rawFactory = options.rawCellFactory || Private.createRawCell;
    let codeFactory = this._codeFactory;
    this._cells = new ObservableUndoableList<ICellModel>((data: nbformat.IBaseCell) => {
      switch (data.cell_type) {
        case 'code':
          return codeFactory(data);
        case 'markdown':
          let markdownFactory = this._mdFactory;
          return markdownFactory(data);
        default:
          let rawFactory = this._rawFactory;
          return rawFactory(data);
      }
    });
    // Add an initial code cell by default.
    let cell = codeFactory();
    this._cells.add(cell);
    this._cells.changed.connect(this._onCellsChanged, this);
    if (options.languagePreference) {
      this._metadata['language_info'] = { name: options.languagePreference };
    }
  }

  /**
   * A signal emitted when a metadata field changes.
   */
  get metadataChanged(): ISignal<IDocumentModel, IChangedArgs<any>> {
    return Private.metadataChangedSignal.bind(this);
  }

  /**
   * Get the observable list of notebook cells.
   *
   * #### Notes
   * This is a read-only property.
   */
  get cells(): ObservableUndoableList<ICellModel> {
    return this._cells;
  }

  /**
   * The major version number of the nbformat.
   *
   * #### Notes
   * This is a read-only property.
   */
  get nbformat(): number {
    return this._nbformat;
  }

  /**
   * The minor version number of the nbformat.
   *
   * #### Notes
   * This is a read-only property.
   */
  get nbformatMinor(): number {
    return this._nbformatMinor;
  }

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelName(): string {
    let spec = this._metadata['kernelspec'];
    return spec ? spec.name : '';
  }

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
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
      let cell = cells.get(i);
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
      let cell = this.cells.get(i);
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
    this.cells.assign(cells);
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
   * Initialize the model state.
   */
  initialize(): void {
    this._cells.clearUndo();
    this.dirty = false;
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
  listMetadata(): string[] {
    return Object.keys(this._metadata);
  }

  /**
   * A factory for creating a new code cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new code cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createCodeCell(source?: nbformat.IBaseCell): CodeCellModel {
    let factory = this._codeFactory;
    return factory(source);
  }

  /**
   * A factory for creating a new Markdown cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new markdown cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createMarkdownCell(source?: nbformat.IBaseCell): MarkdownCellModel {
    let factory = this._mdFactory;
    return factory(source);
  }

  /**
   * A factory for creating a new raw cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new raw cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createRawCell(source?: nbformat.IBaseCell): RawCellModel {
    let factory = this._rawFactory;
    return factory(source);
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
  private _onCellsChanged(list: IObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    let cell: ICellModel;
    switch (change.type) {
    case ListChangeType.Add:
      cell = change.newValue as ICellModel;
      cell.contentChanged.connect(this._onCellChanged, this);
      break;
    case ListChangeType.Remove:
      (change.oldValue as ICellModel).dispose();
      break;
    case ListChangeType.Replace:
      let newValues = change.newValue as ICellModel[];
      for (cell of newValues) {
        cell.contentChanged.connect(this._onCellChanged, this);
      }
      let oldValues = change.oldValue as ICellModel[];
      for (cell of oldValues) {
        cell.dispose();
      }
      break;
    case ListChangeType.Set:
      cell = change.newValue as ICellModel;
      cell.contentChanged.connect(this._onCellChanged, this);
      if (change.oldValue) {
        (change.oldValue as ICellModel).dispose();
      }
      break;
    default:
      return;
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

  private _cells: ObservableUndoableList<ICellModel> = null;
  private _metadata: { [key: string]: any } = Private.createMetadata();
  private _cursors: { [key: string]: MetadataCursor } = Object.create(null);
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
  private _codeFactory: (source?: nbformat.IBaseCell) => CodeCellModel = null;
  private _rawFactory: (source?: nbformat.IBaseCell) => RawCellModel = null;
  private _mdFactory: (source?: nbformat.IBaseCell) => MarkdownCellModel = null;
}


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
     * A factory for creating code cell models.
     */
    codeCellFactory?: (source?: nbformat.IBaseCell) => CodeCellModel;

    /**
     * A factory for creating markdown cell models.
     */
    markdownCellFactory?: (source?: nbformat.IBaseCell) => MarkdownCellModel;

    /**
     * A factory for creating raw cell models.
     */
    rawCellFactory?: (source?: nbformat.IBaseCell) => RawCellModel;
  }
}


/**
 * A private namespace for notebook model data.
 */
namespace Private {
  /**
   * A signal emitted when a metadata field changes.
   */
  export
  const metadataChangedSignal = new Signal<IDocumentModel, IChangedArgs<any>>();

  /**
   * A factory for creating a new code cell.
   */
  export
  function createCodeCell(source?: nbformat.IBaseCell): CodeCellModel {
    return new CodeCellModel(source);
  }

  /**
   * A factory for creating a new Markdown cell.
   */
  export
  function createMarkdownCell(source?: nbformat.IBaseCell): MarkdownCellModel {
    return new MarkdownCellModel(source);
  }

  /**
   * A factory for creating a new raw cell.
   */
  export
  function createRawCell(source?: nbformat.IBaseCell): RawCellModel {
    return new RawCellModel(source);
  }

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
