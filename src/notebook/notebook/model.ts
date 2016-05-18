// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as utils
 from 'jupyter-js-utils';

import {
  IDocumentModel
} from 'jupyter-js-ui/lib/docmanager';

import {
  IObservableList, ObservableList, ListChangeType, IListChangedArgs
} from 'phosphor-observablelist';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  ICellModel, MetadataCursor, IMetadataCursor,
  CodeCellModel, RawCellModel, MarkdownCellModel
} from '../cells/model';

import {
  INotebookContent, ICell, INotebookMetadata, MAJOR_VERSION,
  MINOR_VERSION
} from './nbformat';


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends IDocumentModel {
  /**
   * The list of cells in the notebook.
   *
   * #### Notes
   * This is a read-only property.
   */
  cells: IObservableList<ICellModel>;

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
   * Whether the model can redo changes.
   *
   * #### Notes
   * This is a read-only property.
   */
  canRedo: boolean;

  /**
   * Whether the model can undo changes.
   *
   * #### Notes
   * This is a read-only property.
   */
  canUndo: boolean;

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
   * Begin a compound operation.
   */
  beginCompoundOperation(isUndoAble?: boolean): void;

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void;

  /**
   * Undo an operation.
   */
  undo(): void;

  /**
   * Redo an operation.
   */
  redo(): void;
}


/**
 * An implementation of a notebook Model.
 */
export
class NotebookModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor() {
    this._cells = new ObservableList<ICellModel>();
    this._cells.changed.connect(this.onCellsChanged, this);
  }

  /**
   * A signal emitted when the document content changes.
   *
   * #### Notes
   * The argument is the type of change.
   */
  get contentChanged(): ISignal<INotebookModel, string> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the model dirty state changes.
   */
  get dirtyChanged(): ISignal<IDocumentModel, boolean> {
    return Private.dirtyChangedSignal.bind(this);
  }

  /**
   * Get the observable list of notebook cells.
   *
   * #### Notes
   * This is a read-only property.
   */
  get cells(): IObservableList<ICellModel> {
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
  set dirty(value: boolean) {
    if (value === this._dirty) {
      return;
    }
    this._dirty = value;
    this.dirtyChanged.emit(value);
  }

  /**
   * The read-only state of the model.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    if (value === this._readOnly) {
      return;
    }
    this._readOnly = value;
  }

  /**
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelName(): string {
    let spec = JSON.parse(this._metadata['kernelspec']);
    return spec ? spec.name : '';
  }

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelLanguage(): string {
    let info = JSON.parse(this._metadata['language_info']);
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
    clearSignalData(this);
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      cell.dispose();
    }
    cells.clear();
    this._cells = null;
    for (let cursor of this._cursors) {
      cursor.dispose();
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
  toJSON(): INotebookContent {
    let cells: ICell[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      let cell = this.cells.get(i);
      cells.push(cell.toJSON());
    }
    let metadata = utils.copy(this._metadata) as INotebookMetadata;
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
  fromJSON(value: INotebookContent): void {
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
    this._nbformat = value.nbformat;
    this._nbformatMinor = value.nbformat_minor;
    this._metadata = utils.copy(value.metadata);
    this.contentChanged.emit('metadata');
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
   */
  listMetadata(): string[] {
    return Object.keys(this._metadata);
  }

  /**
   * Handle a change in the cells list.
   */
  protected onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
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
      let oldValues = change.oldValue as ICellModel[];
      for (cell of oldValues) {
        cell.dispose();
      }
      let newValues = change.newValue as ICellModel[];
      for (cell of newValues) {
        cell.contentChanged.connect(this.onCellChanged, this);
      }
      break;
    case ListChangeType.Set:
      (change.oldValue as ICellModel).dispose();
      cell = change.newValue as ICellModel;
      cell.contentChanged.connect(this.onCellChanged, this);
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
    this.contentChanged.emit('cells');
  }

  /**
   * Set the cursor data for a given field.
   */
  protected setCursorData(name: string, value: string): void {
    if (this._metadata[name] === value) {
      return;
    }
    this._metadata[name] = value;
    this.contentChanged.emit(`metadata.${name}`);
  }

  private _cells: IObservableList<ICellModel> = null;
  private _metadata: { [key: string]: string } = Object.create(null);
  private _dirty = false;
  private _readOnly = false;
  private _cursors: MetadataCursor[] = [];
  private _nbformat = MAJOR_VERSION;
  private _nbformatMinor = MINOR_VERSION;
}


/**
 * A private namespace for notebook model data.
 */
namespace Private {
  /**
   * A signal emitted when the content of the model changes.
   */
  export
  const contentChangedSignal = new Signal<INotebookModel, string>();

  /**
   * A signal emitted when the dirty state of the model changes.
   */
  export
  const dirtyChangedSignal = new Signal<INotebookModel, boolean>();
}
