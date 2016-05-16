// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

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
  ICellModel,
  ICodeCellModel,
  IMarkdownCellModel,
  IRawCellModel, MetadataCursor, IMetadataCursor,
} from '../cells/model';

import {
  IKernelspecMetadata, ILanguageInfoMetadata
} from './nbformat';


/**
 * The interactivity modes for the notebook.
 */
export
type NotebookMode = 'command' | 'edit';


/**
 * The default notebook kernelspec metadata.
 */
const DEFAULT_KERNELSPEC = {
  name: 'unknown',
  display_name: 'No Kernel!'
};

/**
 * The default notebook languageinfo metadata.
 */
const DEFAULT_LANG_INFO = {
  name: 'unknown'
};


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends IDocumentModel {
  /**
   * A signal emitted when a metadata state changes.
   */
  metadataChanged: ISignal<INotebookModel, string>;

  /**
   * The kernelspec metadata associated with the notebook.
   *
   * #### Notes
   * This is a read-only property.
   */
  kernelspec: IKernelspecMetadata;

  /**
   * The language info metadata associated with the notebook.
   *
   * #### Notes
   * This is a read-only property.
   */
  languageInfo: ILanguageInfoMetadata;

  /**
   * The original nbformat associated with the notebook (if applicable).
   *
   * #### Notes
   * This is a read-only property.  This value is assigned by the server
   * when it converts a notebook prior to serving the file.
   */
  origNbformat: number;

  /**
   * The list of cells in the notebook.
   *
   * #### Notes
   * This is a read-only property.
   */
  cells: IObservableList<ICellModel>;

  /**
   * Get a metadata cursor for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
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
   */
  get contentChanged(): ISignal<INotebookModel, void> {
    return NotebookModelPrivate.contentChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the model dirty state changes.
   */
  get dirtyChanged(): ISignal<IDocumentModel, boolean> {
    return NotebookModelPrivate.dirtyChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a metadata state changes.
   *
   * #### Notes
   * The signal argument is the name of the metadata that changed.
   */
  get metadataChanged(): ISignal<INotebookModel, string> {
    return NotebookModelPrivate.metadataChangedSignal.bind(this);
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
   * The language info metadata for the notebook.
   */
  get languageInfo(): ILanguageInfoMetadata {
    return JSON.parse(this._langInfo);
  }
  set languageInfo(value: ILanguageInfoMetadata) {
    let data = JSON.stringify(value);
    if (data === this._langInfo) {
      return;
    }
    this._langInfo = data;
    this.metadataChanged.emit('languageInfo');
  }

  /**
   * The kernelspec metadata associated with the notebook.
   */
  get kernelspec(): IKernelspecMetadata {
    return JSON.parse(this._kernelspec);
  }
  set kernelspec(value: IKernelspecMetadata) {
    let data = JSON.stringify(value);
    if (data === this._kernelspec) {
      return;
    }
    this._kernelspec = data;
    this.metadataChanged.emit('kernelspec');
  }

  /**
   * The original nbformat associated with the notebook (if applicable).
   *
   * #### Notes
   * This is a read-only property.  This value is assigned by the server
   * when it converts a notebook prior to serving the file.
   */
  get origNbformat(): number {
    return this._origNbformat;
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
    return this.kernelspec ? this.kernelspec.name : '';
  }

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelLanguage(): string {
    return this.languageInfo ? this.languageInfo.name : '';
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
  toJSON(): any {
    // TODO
    return void 0;
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: any): void {
    // TODO
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
    let invalid = ['kernelspec', 'languageInfo', 'origNbformat'];
    if (invalid.indexOf(name) !== -1) {
      let key = invalid[invalid.indexOf(name)];
      throw Error(`Use model attribute for ${key} directly`);
    }
    return new MetadataCursor(
      name,
      this._metadata,
      this._cursorCallback.bind(this)
    );
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
   * Handle a change in the cells list.
   */
  protected onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    let cell: ICellModel;
    switch (change.type) {
    case ListChangeType.Add:
      cell = change.newValue as ICellModel;
      cell.stateChanged.connect(this.onCellChanged, this);
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
        cell.stateChanged.connect(this.onCellChanged, this);
      }
      break;
    }
    this.dirty = true;
  }

  /**
   * Handle a change to a cell state.
   */
  protected onCellChanged(cell: ICellModel, change: any): void {
    this.contentChanged.emit(void 0);
  }

  /**
   * The singleton callback for cursor change events.
   */
  private _cursorCallback(name: string): void {
    this.metadataChanged.emit(name);
  }

  private _cells: IObservableList<ICellModel> = null;
  private _metadata: { [key: string]: string } = Object.create(null);
  private _kernelspec = JSON.stringify(DEFAULT_KERNELSPEC);
  private _langInfo = JSON.stringify(DEFAULT_LANG_INFO);
  private _origNbformat: number = null;
  private _dirty = false;
  private _readOnly = false;
}


/**
 * A private namespace for notebook model data.
 */
namespace NotebookModelPrivate {
  /**
   * A signal emitted when the content of the model changes.
   */
  export
  const contentChangedSignal = new Signal<INotebookModel, void>();

  /**
   * A signal emitted when the dirty state of the model changes.
   */
  export
  const dirtyChangedSignal = new Signal<INotebookModel, boolean>();

  /**
   * A signal emitted when a user metadata state changes.
   */
  export
  const metadataChangedSignal = new Signal<INotebookModel, string>();
}
