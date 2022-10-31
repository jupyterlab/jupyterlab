// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ICellModel } from '@jupyterlab/cells';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as nbformat from '@jupyterlab/nbformat';
import {
  IObservableJSON,
  IObservableList,
  IObservableMap,
  ObservableJSON
} from '@jupyterlab/observables';
import * as sharedModels from '@jupyterlab/shared-models';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { JSONObject, ReadonlyPartialJSONValue } from '@lumino/coreutils';
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
   */
  readonly metadata: IObservableJSON;

  /**
   * The array of deleted cells since the notebook was last run.
   */
  readonly deletedCells: string[];
  /**
   * Shared model
   */
  readonly sharedModel: sharedModels.ISharedNotebook;
}

/**
 * An implementation of a notebook Model.
 */
export class NotebookModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    this.sharedModel = sharedModels.YNotebook.create({
      disableDocumentWideUndoRedo: options.disableDocumentWideUndoRedo ?? false
    }) as sharedModels.ISharedNotebook;
    this._cells = new CellList(this.sharedModel);
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
    this._cells.changed.connect(this._onCellsChanged, this);

    // Handle initial metadata.
    this._metadata = new ObservableJSON();
    if (!this._metadata.has('language_info')) {
      const name = options.languagePreference || '';
      this._metadata.set('language_info', { name });
    }
    this._ensureMetadata();
    this._metadata.changed.connect(this._onMetadataChanged, this);
    this._deletedCells = [];

    this.sharedModel.changed.connect(this._onStateChanged, this);
  }
  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
  }

  /**
   * A signal emitted when the document state changes.
   */
  get stateChanged(): ISignal<this, IChangedArgs<any>> {
    return this._stateChanged;
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
   */
  get metadata(): IObservableJSON {
    return this._metadata;
  }

  /**
   * Get the observable list of notebook cells.
   */
  get cells(): CellList {
    return this._cells;
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
    const spec = this.metadata.get(
      'kernelspec'
    ) as nbformat.IKernelspecMetadata;
    return spec ? spec.name : '';
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
    const info = this.metadata.get(
      'language_info'
    ) as nbformat.ILanguageInfoMetadata;
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
    const cells = this.cells;
    this._cells = null!;
    cells.dispose();
    this.sharedModel.dispose();
    this._isDisposed = true;
    Signal.clearData(this);
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
    const cells: nbformat.ICell[] = [];
    for (let i = 0; i < (this.cells?.length ?? 0); i++) {
      const cell = this.cells.get(i).toJSON();
      if (this._nbformat === 4 && this._nbformatMinor <= 4) {
        // strip cell ids if we have notebook format 4.0-4.4
        delete cell.id;
      }
      cells.push(cell);
    }
    this._ensureMetadata();
    const metadata = this.sharedModel.getMetadata();
    for (const key of this.metadata.keys()) {
      metadata[key] = JSON.parse(JSON.stringify(this.metadata.get(key)));
    }
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

    (this.sharedModel as sharedModels.YNotebook).nbformat_minor =
      nbformat.MINOR_VERSION;
    (this.sharedModel as sharedModels.YNotebook).nbformat =
      nbformat.MAJOR_VERSION;
    const origNbformat = value.metadata.orig_nbformat;

    if (value.nbformat !== this._nbformat) {
      (this.sharedModel as sharedModels.YNotebook).nbformat = value.nbformat;
    }
    if (value.nbformat_minor > this._nbformatMinor) {
      (this.sharedModel as sharedModels.YNotebook).nbformat_minor =
        value.nbformat_minor;
    }

    // Alert the user if the format changes.
    if (origNbformat !== undefined && this._nbformat !== origNbformat) {
      const newer = this._nbformat > origNbformat;
      let msg: string;

      if (newer) {
        msg = this._trans.__(
          `This notebook has been converted from an older notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (v%2) will be used.
'Older versions of Jupyter may not be able to read the new format.' To preserve the original format version,
close the notebook without saving it.`,
          origNbformat,
          this._nbformat
        );
      } else {
        msg = this._trans.__(
          `This notebook has been converted from an newer notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (v%2) will be used.
Some features of the original notebook may not be available.' To preserve the original format version,
close the notebook without saving it.`,
          origNbformat,
          this._nbformat
        );
      }
      void showDialog({
        title: this._trans.__('Notebook converted'),
        body: msg,
        buttons: [Dialog.okButton({ label: this._trans.__('Ok') })]
      });
    }

    // Update the metadata.
    this.metadata.clear();
    const metadata = value.metadata;
    for (const key in metadata) {
      // orig_nbformat is not intended to be stored per spec.
      if (key === 'orig_nbformat') {
        continue;
      }
      this.metadata.set(key, metadata[key]);
    }
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

  private _onStateChanged(
    sender: sharedModels.ISharedNotebook,
    changes: sharedModels.NotebookChange
  ): void {
    if (changes.stateChange) {
      changes.stateChange.forEach(value => {
        if (value.oldValue !== value.newValue) {
          if (value.name === 'dirty') {
            // Setting `dirty` will trigger the state change.
            this.dirty = value.newValue;
          } else {
            this.triggerStateChange({
              newValue: undefined,
              oldValue: undefined,
              ...value
            });
          }
        }
      });
    }

    if (changes.nbformatChanged) {
      const change = changes.nbformatChanged;
      if (change.key === 'nbformat' && change.newValue !== undefined) {
        this._nbformat = change.newValue;
      }
      if (change.key === 'nbformat_minor' && change.newValue !== undefined) {
        this._nbformatMinor = change.newValue;
      }
    }

    if (changes.metadataChange) {
      const metadata = changes.metadataChange.newValue as JSONObject;
      this._modelDBMutex(() => {
        Object.entries(metadata).forEach(([key, value]) => {
          this.metadata.set(key, value);
        });
      });
    }
  }

  private _onMetadataChanged(
    metadata: IObservableJSON,
    change: IObservableMap.IChangedArgs<ReadonlyPartialJSONValue | undefined>
  ): void {
    this._modelDBMutex(() => {
      this.sharedModel.updateMetadata(metadata.toJSON());
    });
    this.triggerContentChange();
  }

  /**
   * Make sure we have the required metadata fields.
   */
  private _ensureMetadata(): void {
    const metadata = this.metadata;
    if (!metadata.has('language_info')) {
      metadata.set('language_info', { name: '' });
    }
    if (!metadata.has('kernelspec')) {
      metadata.set('kernelspec', { name: '', display_name: '' });
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
  readonly sharedModel: sharedModels.ISharedNotebook;

  /**
   * A mutex to update the shared model.
   */
  protected readonly _modelDBMutex = sharedModels.createMutex();

  private _dirty = false;
  private _readOnly = false;
  private _contentChanged = new Signal<this, void>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);

  private _trans: TranslationBundle;
  private _cells: CellList;
  private _metadata: IObservableJSON;
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
  private _deletedCells: string[];
  private _isDisposed = false;
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
