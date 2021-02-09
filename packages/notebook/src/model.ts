// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Y from 'yjs';

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

import { Signal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import { showDialog, Dialog } from '@jupyterlab/apputils';
import {
  nullTranslator,
  ITranslator,
  TranslationBundle
} from '@jupyterlab/translation';

/**
 * The definition of a model object for a notebook widget.
 */
export interface INotebookModel extends DocumentRegistry.IModel {
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
   * The array of deleted cells since the notebook was last run.
   */
  readonly deletedCells: string[];
  readonly cellsChanged: Signal<INotebookModel, Y.YArrayEvent<Y.Map<any>>>;
  readonly cellInstances: Array<ICellModel>;
  readonly ycells: Y.Array<Y.Map<any>>;
  insertCell(index: number, cell: ICellModel): void;
  insertCells(index: number, cells: ICellModel[]): void;
  setCell(index: number, cell: ICellModel): void;
  getCell(index: number): ICellModel;
  deleteCell(index: number, length?: number): void;
  moveCell(from: number, to: number): void;

  readonly yUndoManager: Y.UndoManager;
  readonly yawareness: any;
  readonly ymeta: Y.Map<any>;
  isInitialized: boolean;
}

/**
 * An implementation of a notebook Model.
 */
export class NotebookModel extends DocumentModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    super(options.languagePreference, options.ymodel, options.yawareness);
    const factory =
      options.contentFactory || NotebookModel.defaultContentFactory;

    this.ycells = this.ymodel.getArray('cells');
    this.contentFactory = factory.clone(this.ycells);
    this.yUndoManager = new Y.UndoManager(this.ycells, {
      trackedOrigins: new Set([this])
    });

    this._trans = (options.translator || nullTranslator).load('jupyterlab');

    if (options.ymodel == null) {
      // only overwrite metadata if we create the model initially
      if (options.languagePreference) {
        this.ymeta.set('language_info', { name: options.languagePreference });
      }
    }
    this._deletedCells = [];
    this.triggerContentChange = this.triggerContentChange.bind(this);
    this.ycells.observeDeep(this.triggerContentChange);
    this._onCellsChanged = this._onCellsChanged.bind(this);
    this.ycells.observe(this._onCellsChanged);

    this.cellInstances = this.ycells.toArray().map(type => {
      if (!this.ytypeCellMapping.has(type)) {
        this.ytypeCellMapping.set(type, this._createCellFromType(type));
      }
      return this.ytypeCellMapping.get(type) as ICellModel;
    });
  }

  readonly yUndoManager: Y.UndoManager;

  readonly ytypeCellMapping: Map<Y.Map<any>, ICellModel> = new Map();

  readonly ycells: Y.Array<any>;
  /**
   * @todo listen to changes of ycells and create ICell instances
   */
  cellInstances: Array<ICellModel>;

  /**
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

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
    const spec = this.ymeta.get('kernelspec') as nbformat.IKernelspecMetadata;
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
    const info = this.ymeta.get(
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
    this.ycells.unobserveDeep(this.triggerContentChange);
    this.ycells.unobserve(this._onCellsChanged);
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
    const cells = this.cellInstances.map(cell => cell.toJSON());
    const metadata = Object.create(null) as nbformat.INotebookMetadata;
    for (const [key, value] of this.ymeta.entries()) {
      metadata[key] = JSON.parse(JSON.stringify(value));
    }
    // ensure that metadata is set correctly
    if (metadata['language_info'] == null) {
      metadata['language_info'] = { name: '' };
    }
    if (metadata['kernelspec'] == null) {
      metadata['kernelspec'] = { name: '', display_name: '' };
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
    // bundle all changes to the model to a single change
    this.ymodel.transact(() => {
      this.ycells.delete(0, this.ycells.length);
      // per spec clear the existing metadata
      Array.from(this.ymeta.keys()).forEach(key => {
        this.ymeta.delete(key);
      });
      const metadata = value.metadata;
      for (const key in metadata) {
        // orig_nbformat is not intended to be stored per spec.
        if (key === 'orig_nbformat') {
          continue;
        }
        this.ymeta.set(key, metadata[key]);
      }
      // @todo this should convert cell to type first
      this.insertCells(
        0,
        value.cells.map(cell => this._createCellFromJSON(cell))
      );
    }, 'json-parse');

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
      let msg: string;

      if (newer) {
        msg = this._trans.__(
          `This notebook has been converted from an older notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (vthis._nbformat) will be used.
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
    this.dirty = true;
  }

  insertCell(index: number, cell: ICellModel) {
    this.insertCells(index, [cell]);
  }

  insertCells(index: number, cells: Array<ICellModel>) {
    cells.forEach(cell => {
      this.ytypeCellMapping.set(cell.ymodel, cell);
      cell.yawareness = this.yawareness;
      cell.yUndoManager = this.yUndoManager;
    });
    this.ymodel.transact(() => {
      this.ycells.insert(
        index,
        cells.map(cell => cell.ymodel)
      );
    }, this);
  }

  setCell(index: number, cell: ICellModel) {
    this.ymodel.transact(() => {
      this.ycells.delete(index);
      this.insertCell(index, cell);
    }, this);
  }

  getCell(index: number): ICellModel {
    return this.cellInstances[index];
  }

  deleteCell(index: number, length: number = 1): void {
    this.ymodel.transact(() => {
      this.ycells.delete(index, length);
    }, this);
  }

  moveCell(from: number, to: number): void {
    this.ymodel.transact(() => {
      const fromCell = this._createCellFromJSON(this.getCell(from).toJSON());
      this.deleteCell(from);
      this.insertCell(to, fromCell);
    }, this);
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
    if (!this.ycells.length) {
      // this will trigger an event on ycells
      const yawareness = this.yawareness;
      const yUndoManager = this.yUndoManager;
      this.insertCell(
        0,
        this.contentFactory.createCell('code', {
          yawareness,
          yUndoManager
        })
      );
    }
    this.yUndoManager.clear();
    this.isInitialized = true;
  }

  private _createCellFromType(type: Y.Map<any>): ICellModel {
    const yawareness = this.yawareness;
    const factory = this.contentFactory;
    const yUndoManager = this.yUndoManager;
    switch (type.get('cell_type')) {
      case 'code':
        return factory.createCodeCell({
          ymodel: type,
          yawareness,
          yUndoManager
        });
      case 'markdown':
        return factory.createMarkdownCell({
          ymodel: type,
          yawareness,
          yUndoManager
        });
      case 'raw':
        return factory.createRawCell({
          ymodel: type,
          yawareness,
          yUndoManager
        });
      default:
        throw new Error('Found unknown cell type');
    }
  }

  private _createCellFromJSON(cell: any): ICellModel {
    const yawareness = this.yawareness;
    const factory = this.contentFactory;
    const yUndoManager = this.yUndoManager;
    switch (cell['cell_type']) {
      case 'code':
        return factory.createCodeCell({ cell, yawareness, yUndoManager });
      case 'markdown':
        return factory.createMarkdownCell({ cell, yawareness, yUndoManager });
      case 'raw':
        return factory.createRawCell({ cell, yawareness, yUndoManager });
      default:
        throw new Error('Found unknown cell type');
    }
  }

  private _onCellsChanged = (event: Y.YArrayEvent<Y.Map<any>>) => {
    // update the type⇔cell mapping by iterating through the addded/removed types
    event.changes.added.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      if (!this.ytypeCellMapping.has(type)) {
        this.ytypeCellMapping.set(type, this._createCellFromType(type));
      }
    });
    event.changes.deleted.forEach(item => {
      const type = (item.content as Y.ContentType).type as Y.Map<any>;
      const model = this.ytypeCellMapping.get(type);
      if (model) {
        model.dispose();
        this.ytypeCellMapping.delete(type);
      }
    });
    this.cellInstances = this.ycells
      .toArray()
      .map(type => this.ytypeCellMapping.get(type))
      .filter(x => x != null) as Array<ICellModel>;
    this.cellsChanged.emit(event);
  };

  readonly cellsChanged = new Signal<any, Y.YArrayEvent<Y.Map<any>>>(this);
  private _trans: TranslationBundle;
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
  private _deletedCells: string[];
  isInitialized: boolean = false;
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
    ymodel?: Y.Doc;

    yawareness?: any;

    /**
     * Language translator.
     */
    translator?: ITranslator;
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
    ymodel?: Y.Doc;

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
    clone(modelDB: Y.Array<any>): IContentFactory;
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
    }

    /**
     * The factory for code cell content.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

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
    createCell(
      cell_type: nbformat.CellType,
      opts: CellModel.IOptions
    ): ICellModel {
      opts.cell = Object.assign({}, opts.cell, { cell_type });
      switch (cell_type) {
        case 'code':
          return this.createCodeCell(opts);
        case 'markdown':
          return this.createMarkdownCell(opts);
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
      return new RawCellModel(options);
    }

    /**
     * Clone the content factory with a new IModelDB.
     */
    clone(): ContentFactory {
      return new ContentFactory({
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
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory({});
}
