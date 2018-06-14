// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DocumentModel, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ICellModel, ICodeCellModel, IRawCellModel, IMarkdownCellModel,
  CodeCellModel, RawCellModel, MarkdownCellModel, CellModel
} from '@jupyterlab/cells';

import {
  nbformat, uuid
} from '@jupyterlab/coreutils';

import {
  IObservableJSON, IObservableUndoableList,
  IObservableList, IModelDB
} from '@jupyterlab/observables';

import {
  CellList
} from './celllist';


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends DocumentRegistry.IModel {
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
    super(options.languagePreference, options.modelDB);
    let factory = (
      options.contentFactory || NotebookModel.defaultContentFactory
    );
    this.contentFactory = factory.clone(this.modelDB.view('cells'));
    this._cells = new CellList(this.modelDB, this.contentFactory);
    // Add an initial code cell by default.
    if (!this._cells.length) {
      this._cells.push(factory.createCodeCell({}));
    }
    this._cells.changed.connect(this._onCellsChanged, this);

    // Handle initial metadata.
    let metadata = this.modelDB.createMap('metadata');
    if (!metadata.has('language_info')) {
      let name = options.languagePreference || '';
      metadata.set('language_info', { name });
    }
    this._ensureMetadata();
    metadata.changed.connect(this.triggerContentChange, this);
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
   * The default kernel language of the document.
   */
  get defaultKernelLanguage(): string {
    let info = this.metadata.get('language_info') as nbformat.ILanguageInfoMetadata;
    return info ? info.name : '';
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.cells === null) {
      return;
    }
    let cells = this.cells;
    this._cells = null;
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
    for (let i = 0; i < this.cells.length; i++) {
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
   */
  initialize(): void {
    super.initialize();
    this.cells.clearUndo();
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: IObservableList<ICellModel>, change: IObservableList.IChangedArgs<ICellModel>): void {
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
    let factory = this.contentFactory;
    // Add code cell if there are no cells remaining.
    if (!this.cells.length) {
      // Add the cell in a new context to avoid triggering another
      // cell changed event during the handling of this signal.
      requestAnimationFrame(() => {
        if (!this.isDisposed && !this.cells.length) {
          this.cells.push(factory.createCodeCell({}));
        }
      });
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
  export
  interface IContentFactory {
    /**
     * The factory for output area models.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * The IModelDB in which to put data for the notebook model.
     */
    modelDB: IModelDB;

    /**
     * Create a new code cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel;

    /**
     * Create a new markdown cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createMarkdownCell(options: CellModel.IOptions): IMarkdownCellModel;

    /**
     * Create a new raw cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
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
  export
  class ContentFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: ContentFactory.IOptions) {
      this.codeCellContentFactory = (options.codeCellContentFactory ||
        CodeCellModel.defaultContentFactory
      );
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
     * Create a new code cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     *   If the contentFactory is not provided, the instance
     *   `codeCellContentFactory` will be used.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel {
      if (options.contentFactory) {
        options.contentFactory = this.codeCellContentFactory;
      }
      if (this.modelDB) {
        if (!options.id) {
          options.id = uuid();
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
     *   new cell will be intialized with the data from the source.
     */
    createMarkdownCell(options: CellModel.IOptions): IMarkdownCellModel {
      if (this.modelDB) {
        if (!options.id) {
          options.id = uuid();
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
     *   new cell will be intialized with the data from the source.
     */
    createRawCell(options: CellModel.IOptions): IRawCellModel {
      if (this.modelDB) {
        if (!options.id) {
          options.id = uuid();
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
  export
  namespace ContentFactory {
    /**
     * The options used to initialize a `ContentFactory`.
     */
    export
    interface IOptions {
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
  export
  const defaultContentFactory = new ContentFactory({});
}
