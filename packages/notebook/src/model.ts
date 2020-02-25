// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentModel, DocumentRegistry } from '@jupyterlab/docregistry';

import {
  ICellModel,
  ICodeCellModel,
  IRawCellModel,
  IMarkdownCellModel,
  CodeCellModel,
  RawCellModel,
  MarkdownCellModel,
  CellModel
} from '@jupyterlab/cells';

import * as nbformat from '@jupyterlab/nbformat';

import { UUID } from '@lumino/coreutils';

import {
  IObservableJSON,
  IObservableUndoableList,
  IObservableList,
  IModelDB
} from '@jupyterlab/observables';

import { CellList } from './celllist';
import { showDialog, Dialog } from '@jupyterlab/apputils';

/**
 * The definition of a model object for a notebook widget.
 */
export interface INotebookModel extends DocumentRegistry.IModel {
  /**
   * The list of cells in the notebook.
   */
  readonly cells: IObservableUndoableList<ICellModel>;

  /**
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

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
}

/**
 * An implementation of a notebook Model.
 */
export class NotebookModel extends DocumentModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    super(options.languagePreference, options.modelDB);
    let factory = options.contentFactory || NotebookModel.defaultContentFactory;
    this.contentFactory = factory.clone(this.modelDB.view('cells'));
    this._cells = new CellList(this.modelDB, this.contentFactory);
    this._cells.changed.connect(this._onCellsChanged, this);

    // Handle initial metadata.
    let metadata = this.modelDB.createMap('metadata');
    if (!metadata.has('language_info')) {
      let name = options.languagePreference || '';
      metadata.set('language_info', { name });
    }
    this._ensureMetadata();
    metadata.changed.connect(this.triggerContentChange, this);
    this._deletedCells = [];
  }

  /**
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * The metadata associated with the notebook.
   */
  get metadata(): IObservableJSON {
    return this.modelDB.get('metadata') as IObservableJSON;
  }

  /**
   * Get the observable list of notebook cells.
   */
  get cells(): IObservableUndoableList<ICellModel> {
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
    let spec = this.metadata.get('kernelspec') as nbformat.IKernelspecMetadata;
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
    let info = this.metadata.get(
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
    let cells = this.cells;
    this._cells = null!;
    cells.dispose();
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
    for (let i = 0; i < (this.cells?.length || 0); i++) {
      let cell = this.cells.get(i);
      cells.push(cell.toJSON());
    }
    this._ensureMetadata();
    let metadata = Object.create(null) as nbformat.INotebookMetadata;
    for (let key of this.metadata.keys()) {
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
    let cells: ICellModel[] = [];
    let factory = this.contentFactory;
    for (let cell of value.cells) {
      switch (cell.cell_type) {
        case 'code':
          cells.push(factory.createCodeCell({ cell }));
          break;
        case 'markdown':
          cells.push(factory.createMarkdownCell({ cell }));
          break;
        case 'raw':
          cells.push(factory.createRawCell({ cell }));
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
    this._nbformatMinor = nbformat.MINOR_VERSION;
    this._nbformat = nbformat.MAJOR_VERSION;
    const origNbformat = value.metadata.orig_nbformat;

    if (value.nbformat !== this._nbformat) {
      oldValue = this._nbformat;
      this._nbformat = newValue = value.nbformat;
      this.triggerStateChange({ name: 'nbformat', oldValue, newValue });
    }
    if (value.nbformat_minor > this._nbformatMinor) {
      oldValue = this._nbformatMinor;
      this._nbformatMinor = newValue = value.nbformat_minor;
      this.triggerStateChange({ name: 'nbformatMinor', oldValue, newValue });
    }

    // Alert the user if the format changes.
    if (origNbformat !== undefined && this._nbformat !== origNbformat) {
      const newer = this._nbformat > origNbformat;
      const msg = `This notebook has been converted from ${
        newer ? 'an older' : 'a newer'
      } notebook format (v${origNbformat}) to the current notebook format (v${
        this._nbformat
      }). The next time you save this notebook, the current notebook format (v${
        this._nbformat
      }) will be used. ${
        newer
          ? 'Older versions of Jupyter may not be able to read the new format.'
          : 'Some features of the original notebook may not be available.'
      }  To preserve the original format version, close the notebook without saving it.`;
      void showDialog({
        title: 'Notebook converted',
        body: msg,
        buttons: [Dialog.okButton()]
      });
    }

    // Update the metadata.
    this.metadata.clear();
    let metadata = value.metadata;
    for (let key in metadata) {
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
   * Initialize the model with its current state.
   *
   * # Notes
   * Adds an empty code cell if the model is empty
   * and clears undo state.
   */
  initialize(): void {
    super.initialize();
    if (!this.cells.length) {
      let factory = this.contentFactory;
      this.cells.push(factory.createCodeCell({}));
    }
    this.cells.clearUndo();
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(
    list: IObservableList<ICellModel>,
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

  /**
   * Make sure we have the required metadata fields.
   */
  private _ensureMetadata(): void {
    let metadata = this.metadata;
    if (!metadata.has('language_info')) {
      metadata.set('language_info', { name: '' });
    }
    if (!metadata.has('kernelspec')) {
      metadata.set('kernelspec', { name: '', display_name: '' });
    }
  }

  private _cells: CellList;
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
  private _deletedCells: string[];
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
     * A factory for creating cell models.
     *
     * The default is a shared factory instance.
     */
    contentFactory?: IContentFactory;

    /**
     * A modelDB for storing notebook data.
     */
    modelDB?: IModelDB;
  }

  /**
   * A factory for creating notebook model content.
   */
  export interface IContentFactory {
    /**
     * The factory for output area models.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * The IModelDB in which to put data for the notebook model.
     */
    modelDB: IModelDB | undefined;

    /**
     * Create a new cell by cell type.
     *
     * @param type:  the type of the cell to create.
     *
     * @param options: the cell creation options.
     *
     * #### Notes
     * This method is intended to be a convenience method to programmaticaly
     * call the other cell creation methods in the factory.
     */
    createCell(type: nbformat.CellType, opts: CellModel.IOptions): ICellModel;

    /**
     * Create a new code cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel;

    /**
     * Create a new markdown cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createMarkdownCell(options: CellModel.IOptions): IMarkdownCellModel;

    /**
     * Create a new raw cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(options: CellModel.IOptions): IRawCellModel;

    /**
     * Clone the content factory with a new IModelDB.
     */
    clone(modelDB: IModelDB): IContentFactory;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export class ContentFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: ContentFactory.IOptions) {
      this.codeCellContentFactory =
        options.codeCellContentFactory || CodeCellModel.defaultContentFactory;
      this.modelDB = options.modelDB;
    }

    /**
     * The factory for code cell content.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * The IModelDB in which to put the notebook data.
     */
    readonly modelDB: IModelDB | undefined;

    /**
     * Create a new cell by cell type.
     *
     * @param type:  the type of the cell to create.
     *
     * @param options: the cell creation options.
     *
     * #### Notes
     * This method is intended to be a convenience method to programmaticaly
     * call the other cell creation methods in the factory.
     */
    createCell(type: nbformat.CellType, opts: CellModel.IOptions): ICellModel {
      switch (type) {
        case 'code':
          return this.createCodeCell(opts);
          break;
        case 'markdown':
          return this.createMarkdownCell(opts);
          break;
        case 'raw':
        default:
          return this.createRawCell(opts);
      }
    }

    /**
     * Create a new code cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     *   If the contentFactory is not provided, the instance
     *   `codeCellContentFactory` will be used.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel {
      if (options.contentFactory) {
        options.contentFactory = this.codeCellContentFactory;
      }
      if (this.modelDB) {
        if (!options.id) {
          options.id = UUID.uuid4();
        }
        options.modelDB = this.modelDB.view(options.id);
      }
      return new CodeCellModel(options);
    }

    /**
     * Create a new markdown cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createMarkdownCell(options: CellModel.IOptions): IMarkdownCellModel {
      if (this.modelDB) {
        if (!options.id) {
          options.id = UUID.uuid4();
        }
        options.modelDB = this.modelDB.view(options.id);
      }
      return new MarkdownCellModel(options);
    }

    /**
     * Create a new raw cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(options: CellModel.IOptions): IRawCellModel {
      if (this.modelDB) {
        if (!options.id) {
          options.id = UUID.uuid4();
        }
        options.modelDB = this.modelDB.view(options.id);
      }
      return new RawCellModel(options);
    }

    /**
     * Clone the content factory with a new IModelDB.
     */
    clone(modelDB: IModelDB): ContentFactory {
      return new ContentFactory({
        modelDB: modelDB,
        codeCellContentFactory: this.codeCellContentFactory
      });
    }
  }

  /**
   * A namespace for the notebook model content factory.
   */
  export namespace ContentFactory {
    /**
     * The options used to initialize a `ContentFactory`.
     */
    export interface IOptions {
      /**
       * The factory for code cell model content.
       */
      codeCellContentFactory?: CodeCellModel.IContentFactory;

      /**
       * The modelDB in which to place new content.
       */
      modelDB?: IModelDB;
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory({});
}
