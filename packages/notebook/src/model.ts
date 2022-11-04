// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ICellModel } from '@jupyterlab/cells';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as nbformat from '@jupyterlab/nbformat';
import { IObservableList } from '@jupyterlab/observables';
import {
  IMapChange,
  ISharedNotebook,
  NotebookChange,
  YNotebook
} from '@jupyter-notebook/ydoc';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { ISignal, Signal } from '@lumino/signaling';
import { CellList } from './celllist';

/**
 * The definition of a model object for a notebook widget.
 */
export interface INotebookModel extends DocumentRegistry.IModel {
  /**
   * The list of cells in the notebook.
   */
  readonly cells: CellList;

  /**
   * The major version number of the nbformat.
   */
  readonly nbformat: number;

  /**
   * The minor version number of the nbformat.
   */
  readonly nbformatMinor: number;

  /**
   * The metadata associated with the notebook.
   *
   * ### Notes
   * This is a copy of the metadata. Changing a part of it
   * won't affect the model.
   * As this returns a copy of all metadata, it is advised to
   * use `getMetadata` to speed up the process of getting a single key.
   */
  readonly metadata: nbformat.INotebookMetadata;

  /**
   * Signal emitted when notebook metadata changes.
   */
  readonly metadataChanged: ISignal<INotebookModel, IMapChange>;

  /**
   * The array of deleted cells since the notebook was last run.
   */
  readonly deletedCells: string[];

  /**
   * Shared model
   */
  readonly sharedModel: ISharedNotebook;

  /**
   * Delete a metadata
   *
   * @param key Metadata key
   */
  deleteMetadata(key: string): void;

  /**
   * Get a metadata
   *
   * ### Notes
   * This returns a copy of the key value.
   *
   * @param key Metadata key
   */
  getMetadata(key: string): any;

  /**
   * Set a metadata
   *
   * @param key Metadata key
   * @param value Metadata value
   */
  setMetadata(key: string, value: any): void;
}

/**
 * An implementation of a notebook Model.
 */
export class NotebookModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    this.sharedModel = new YNotebook({
      disableDocumentWideUndoRedo: options.disableDocumentWideUndoRedo ?? false
    });
    this._cells = new CellList(this.sharedModel);
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
    this._deletedCells = [];

    // Initialize the notebook
    // In collaboration mode, this will be overridden by the initialization coming
    // from the document provider.
    (this.sharedModel as YNotebook).nbformat_minor = nbformat.MINOR_VERSION;
    (this.sharedModel as YNotebook).nbformat = nbformat.MAJOR_VERSION;
    this._ensureMetadata(options.languagePreference ?? '');

    this.sharedModel.metadataChanged.connect(this._onMetadataChanged, this);
    this._cells.changed.connect(this._onCellsChanged, this);
    this.sharedModel.changed.connect(this._onStateChanged, this);
  }
  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
  }

  /**
   * Signal emitted when notebook metadata changes.
   */
  get metadataChanged(): ISignal<INotebookModel, IMapChange<any>> {
    return this._metadataChanged;
  }

  /**
   * A signal emitted when the document state changes.
   */
  get stateChanged(): ISignal<this, IChangedArgs<any>> {
    return this._stateChanged;
  }

  /**
   * Get the observable list of notebook cells.
   */
  get cells(): CellList {
    return this._cells;
  }

  /**
   * The dirty state of the document.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(newValue: boolean) {
    const oldValue = this._dirty;
    if (newValue === oldValue) {
      return;
    }
    this._dirty = newValue;
    this.triggerStateChange({
      name: 'dirty',
      oldValue,
      newValue
    });
  }

  /**
   * The read only state of the document.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(newValue: boolean) {
    if (newValue === this._readOnly) {
      return;
    }
    const oldValue = this._readOnly;
    this._readOnly = newValue;
    this.triggerStateChange({ name: 'readOnly', oldValue, newValue });
  }

  /**
   * The metadata associated with the notebook.
   *
   * ### Notes
   * This is a copy of the metadata. Changing a part of it
   * won't affect the model.
   * As this returns a copy of all metadata, it is advised to
   * use `getMetadata` to speed up the process of getting a single key.
   */
  get metadata(): nbformat.INotebookMetadata {
    return this.sharedModel.metadata;
  }

  /**
   * The major version number of the nbformat.
   */
  get nbformat(): number {
    return this.sharedModel.nbformat;
  }

  /**
   * The minor version number of the nbformat.
   */
  get nbformatMinor(): number {
    return this.sharedModel.nbformat_minor;
  }

  /**
   * The default kernel name of the document.
   */
  get defaultKernelName(): string {
    const spec = this.getMetadata('kernelspec');
    return spec?.name ?? '';
  }

  /**
   * A list of deleted cells for the notebook..
   */
  get deletedCells(): string[] {
    return this._deletedCells;
  }

  /**
   * The default kernel language of the document.
   */
  get defaultKernelLanguage(): string {
    const info = this.getMetadata('language_info');
    return info?.name ?? '';
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    const cells = this.cells;
    this._cells = null!;
    cells.dispose();
    this.sharedModel.dispose();
    Signal.clearData(this);
  }

  /**
   * Delete a metadata
   *
   * @param key Metadata key
   */
  deleteMetadata(key: string): void {
    return this.sharedModel.deleteMetadata(key);
  }

  /**
   * Get a metadata
   *
   * ### Notes
   * This returns a copy of the key value.
   *
   * @param key Metadata key
   */
  getMetadata(key: string): any {
    return this.sharedModel.getMetadata(key);
  }

  /**
   * Set a metadata
   *
   * @param key Metadata key
   * @param value Metadata value
   */
  setMetadata(key: string, value: any): void {
    if (typeof value === 'undefined') {
      this.sharedModel.deleteMetadata(key);
    } else {
      this.sharedModel.setMetadata(key, value);
    }
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
    this._ensureMetadata();
    return this.sharedModel.toJSON();
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: nbformat.INotebookContent): void {
    this.sharedModel.transact(() => {
      const useId = value.nbformat === 4 && value.nbformat_minor >= 5;
      const ycells = value.cells.map(cell => {
        if (!useId) {
          delete cell.id;
        }
        return cell;
      });
      if (!ycells.length) {
        // Create cell when notebook is empty
        // (non collaborative)
        ycells.push({ cell_type: 'code' } as nbformat.ICodeCell);
      }
      this.sharedModel.insertCells(this.sharedModel.cells.length, ycells);
      this.sharedModel.deleteCellRange(0, this.sharedModel.cells.length);
    });

    (this.sharedModel as YNotebook).nbformat_minor = nbformat.MINOR_VERSION;
    (this.sharedModel as YNotebook).nbformat = nbformat.MAJOR_VERSION;
    const origNbformat = value.metadata.orig_nbformat;

    if (value.nbformat !== this.sharedModel.nbformat) {
      (this.sharedModel as YNotebook).nbformat = value.nbformat;
    }
    if (
      value.nbformat_minor >
      ((this.sharedModel as YNotebook).nbformat_minor ?? -1)
    ) {
      (this.sharedModel as YNotebook).nbformat_minor = value.nbformat_minor;
    }

    // Alert the user if the format changes.
    if (origNbformat !== undefined && this.nbformat !== origNbformat) {
      const newer = this.nbformat > origNbformat;
      let msg: string;

      if (newer) {
        msg = this._trans.__(
          `This notebook has been converted from an older notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (v%2) will be used.
'Older versions of Jupyter may not be able to read the new format.' To preserve the original format version,
close the notebook without saving it.`,
          origNbformat,
          this.nbformat
        );
      } else {
        msg = this._trans.__(
          `This notebook has been converted from an newer notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (v%2) will be used.
Some features of the original notebook may not be available.' To preserve the original format version,
close the notebook without saving it.`,
          origNbformat,
          this.nbformat
        );
      }
      void showDialog({
        title: this._trans.__('Notebook converted'),
        body: msg,
        buttons: [Dialog.okButton({ label: this._trans.__('Ok') })]
      });
    }

    // Update the metadata.
    const metadata = value.metadata;
    for (const key in metadata) {
      // orig_nbformat is not intended to be stored per spec.
      if (key === 'orig_nbformat') {
        continue;
      }
    }
    this.sharedModel.metadata = metadata;
    this._ensureMetadata();
    this.dirty = true;
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(
    list: CellList,
    change: IObservableList.IChangedArgs<ICellModel>
  ): void {
    switch (change.type) {
      case 'add':
        change.newValues.forEach(cell => {
          cell.contentChanged.connect(this.triggerContentChange, this);
        });
        break;
      case 'remove':
        break;
      case 'set':
        change.newValues.forEach(cell => {
          cell.contentChanged.connect(this.triggerContentChange, this);
        });
        break;
      default:
        break;
    }
    this.triggerContentChange();
  }

  private _onMetadataChanged(
    sender: ISharedNotebook,
    changes: IMapChange
  ): void {
    this._metadataChanged.emit(changes);
    this.triggerContentChange();
  }

  private _onStateChanged(
    sender: ISharedNotebook,
    changes: NotebookChange
  ): void {
    if (changes.stateChange) {
      changes.stateChange.forEach(value => {
        if (value.name === 'dirty') {
          // Setting `dirty` will trigger the state change.
          // We always set `dirty` because the shared model state
          // and the local attribute are synchronized one way shared model -> _dirty
          this.dirty = value.newValue;
        } else if (value.oldValue !== value.newValue) {
          this.triggerStateChange({
            newValue: undefined,
            oldValue: undefined,
            ...value
          });
        }
      });
    }
  }

  /**
   * Make sure we have the required metadata fields.
   */
  private _ensureMetadata(languageName: string = ''): void {
    if (!this.getMetadata('language_info')) {
      this.sharedModel.setMetadata('language_info', { name: languageName });
    }
    if (!this.getMetadata('kernelspec')) {
      this.sharedModel.setMetadata('kernelspec', {
        name: '',
        display_name: ''
      });
    }
  }

  /**
   * Trigger a state change signal.
   */
  protected triggerStateChange(args: IChangedArgs<any>): void {
    this._stateChanged.emit(args);
  }

  /**
   * Trigger a content changed signal.
   */
  protected triggerContentChange(): void {
    this._contentChanged.emit(void 0);
    this.dirty = true;
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The shared notebook model.
   */
  readonly sharedModel: ISharedNotebook;

  private _dirty = false;
  private _readOnly = false;
  private _contentChanged = new Signal<this, void>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);

  private _trans: TranslationBundle;
  private _cells: CellList;
  private _deletedCells: string[];
  private _isDisposed = false;
  private _metadataChanged = new Signal<NotebookModel, IMapChange>(this);
}

/**
 * The namespace for the `NotebookModel` class statics.
 */
export namespace NotebookModel {
  /**
   * An options object for initializing a notebook model.
   */
  export interface IOptions {
    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * Default cell type.
     */
    defaultCell?: 'code' | 'markdown' | 'raw';

    /**
     * Language translator.
     */
    translator?: ITranslator;

    /**
     * Defines if the document can be undo/redo.
     */
    disableDocumentWideUndoRedo?: boolean;
  }
}
