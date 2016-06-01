// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as utils
 from 'jupyter-js-utils';

import {
  IDocumentModel
} from 'jupyter-js-ui/lib/docmanager';

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
  ICellModel, CodeCellModel, RawCellModel, MarkdownCellModel
} from '../cells/model';

import {
  IMetadataCursor, MetadataCursor
} from '../common/metadata';

import {
  OberservableUndoableList
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
  cells: OberservableUndoableList<ICellModel>;

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
   *
   * #### Notes
   * If the source argument does not give an input mimetype, the code cell
   * defaults to the notebook [[defaultMimetype]].
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
class NotebookModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(languagePreference?: string) {
    this._cells = new OberservableUndoableList<ICellModel>((data: nbformat.IBaseCell) => {
      switch (data.cell_type) {
        case 'code':
          return this.createCodeCell(data);
        case 'markdown':
          return this.createMarkdownCell(data);
        default:
          return this.createRawCell(data);
      }
    });
    this._cells.changed.connect(this.onCellsChanged, this);
    if (languagePreference) {
      this._metadata['language_info'] = `{"name":"${languagePreference}"}`;
    }
  }

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<INotebookModel, void> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a model state changes.
   */
  get stateChanged(): ISignal<IDocumentModel, IChangedArgs<any>> {
    return Private.stateChangedSignal.bind(this);
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
  get cells(): OberservableUndoableList<ICellModel> {
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
   * The dirty state of the model.
   *
   * #### Notes
   * This should be cleared when the document is loaded from
   * or saved to disk.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(newValue: boolean) {
    if (newValue === this._dirty) {
      return;
    }
    let oldValue = this._dirty;
    this._dirty = newValue;
    this.stateChanged.emit({ name: 'dirty', oldValue, newValue });
  }

  /**
   * The read-only state of the model.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(newValue: boolean) {
    if (newValue === this._readOnly) {
      return;
    }
    let oldValue = this._readOnly;
    this._readOnly = newValue;
    this.stateChanged.emit({ name: 'readOnly', oldValue, newValue });
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
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._cells === null;
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
        this.setCursorData(key, null);
        delete this._metadata[key];
        if (this._cursors[key]) {
          this._cursors[key].dispose();
          delete this._cursors[key];
        }
      }
    }
    for (let key in metadata) {
      this.setCursorData(key, (metadata as any)[key]);
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
   * A factory for creating a new code cell.
   *
   * @param source - The data to use for the original source data.
   *
   * @returns A new code cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   *
   * #### Notes
   * If the source argument does not give an input mimetype, the code cell
   * defaults to the notebook [[defaultMimetype]].
   */
  createCodeCell(source?: nbformat.IBaseCell): CodeCellModel {
    return new CodeCellModel(source);
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
    return new MarkdownCellModel(source);
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
    return new RawCellModel(source);
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
        this.setCursorData(name, value);
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
   * Handle a change in the cells list.
   */
  protected onCellsChanged(list: IObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    let cell: ICellModel;
    switch (change.type) {
    case ListChangeType.Add:
      cell = change.newValue as ICellModel;
      cell.contentChanged.connect(this.onCellChanged, this);
      break;
    case ListChangeType.Remove:
      (change.oldValue as ICellModel).dispose();
      break;
    case ListChangeType.Replace:
      let newValues = change.newValue as ICellModel[];
      for (cell of newValues) {
        cell.contentChanged.connect(this.onCellChanged, this);
      }
      let oldValues = change.oldValue as ICellModel[];
      for (cell of oldValues) {
        cell.dispose();
      }
      break;
    case ListChangeType.Set:
      cell = change.newValue as ICellModel;
      cell.contentChanged.connect(this.onCellChanged, this);
      if (change.oldValue) {
        (change.oldValue as ICellModel).dispose();
      }
      break;
    default:
      return;
    }
    this.dirty = true;
  }

  /**
   * Handle a change to a cell state.
   */
  protected onCellChanged(cell: ICellModel, change: any): void {
    this.dirty = true;
    this.contentChanged.emit(void 0);
  }

  /**
   * Set the cursor data for a given field.
   */
  protected setCursorData(name: string, newValue: any): void {
    let oldValue = this._metadata[name];
    if (oldValue === newValue) {
      return;
    }
    this._metadata[name] = newValue;
    this.dirty = true;
    this.contentChanged.emit(void 0);
    this.metadataChanged.emit({ name, oldValue, newValue });
  }

  private _cells: OberservableUndoableList<ICellModel> = null;
  private _metadata: { [key: string]: any } = Private.createMetadata();
  private _dirty = false;
  private _readOnly = false;
  private _cursors: { [key: string]: MetadataCursor } = Object.create(null);
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
}


/**
 * A private namespace for notebook model data.
 */
namespace Private {
  /**
   * A signal emitted when the content of the model changes.
   */
  export
  const contentChangedSignal = new Signal<INotebookModel, void>();

  /**
   * A signal emitted when a model state changes.
   */
  export
  const stateChangedSignal = new Signal<IDocumentModel, IChangedArgs<any>>();

  /**
   * A signal emitted when a metadata field changes.
   */
  export
  const metadataChangedSignal = new Signal<IDocumentModel, IChangedArgs<any>>();

  /**
   * Create the default metadata for the notebook.
   */
  export
  function createMetadata(): nbformat.INotebookMetadata {
    return {
      kernelspec: { name: 'unknown', display_name: 'Unknown' },
      language_info: { name: 'unknown' },
      orig_nbformat: -1
    };
  }
}
