// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  each, iter, toArray
} from '@phosphor/algorithm';

import {
  IObservableVector, ObservableVector
} from '../common/observablevector';

import {
  IObservableMap
} from '../common/observablemap';

import {
  DocumentModel, DocumentRegistry
} from '../docregistry';

import {
  ICellModel, ICodeCellModel, IRawCellModel, IMarkdownCellModel,
  CodeCellModel, RawCellModel, MarkdownCellModel, CellModel
} from '../cells/model';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  IObservableJSON, ObservableJSON
} from '../common/observablejson';

import {
  IObservableUndoableVector, ObservableUndoableVector
} from '../common/undoablevector';

import {
  IRealtimeHandler, IRealtimeModel, Synchronizable,
  IRealtimeConverter
} from '../common/realtime';


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends DocumentRegistry.IModel, IRealtimeModel {
  /**
   * The list of cells in the notebook.
   */
  readonly cells: IObservableUndoableVector<ICellModel>;

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
   * Describe the model to an existing RealtimeHandler.
   */
  registerCollaborative( realtimeHandler : IRealtimeHandler ): Promise<void>;
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
    let factory = (
      options.contentFactory || NotebookModel.defaultContentFactory
    );
    this.contentFactory = factory;
    let fromJSONFactory = (cell: nbformat.IBaseCell): ICellModel=>{
      switch (cell.cell_type) {
        case 'code':
          return factory.createCodeCell({ cell });
        case 'markdown':
          return factory.createMarkdownCell({ cell });
        default:
          return factory.createRawCell({ cell });
      }
    };
    let realtimeConverter = new NotebookModel.RealtimeCellConverter(factory);
    this._cells = new ObservableUndoableVector<ICellModel>(
      fromJSONFactory, realtimeConverter);


    // Add an initial code cell by default.
    this._cells.pushBack(factory.createCodeCell({}));
    this._cells.changed.connect(this._onCellsChanged, this);

    // Handle initial metadata.
    let name = options.languagePreference || '';
    this._metadata.set('language_info', { name });
    this._ensureMetadata();
    this._metadata.changed.connect(this.triggerContentChange, this);
  }

  /**
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * The metadata associated with the notebook.
   */
  get metadata(): IObservableJSON {
    return this._metadata;
  }

  /**
   * Get the observable list of notebook cells.
   */
  get cells(): IObservableUndoableVector<ICellModel> {
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
    let spec = this._metadata.get('kernelspec') as nbformat.IKernelspecMetadata;
    return spec ? spec.name : '';
  }

  /**
   * The default kernel language of the document.
   */
  get defaultKernelLanguage(): string {
    let info = this._metadata.get('language_info') as nbformat.ILanguageInfoMetadata;
    return info ? info.name : '';
  }

  /**
   * The realtime handler associated with the notebook.
   */
  get realtimeHandler(): IRealtimeHandler {
   return this._realtimeHandler;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this._cells === null) {
      return;
    }
    let cells = this._cells;
    this._cells = null;
    this._metadata.dispose();
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.at(i);
      cell.dispose();
    }
    cells.dispose();
    if(this._realtimeHandler) {
      this._realtimeHandler.dispose();
    }
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
    this._metadata.clear();
    let metadata = value.metadata;
    for (let key in metadata) {
      // orig_nbformat is not intended to be stored per spec.
      if (key === 'orig_nbformat') {
        continue;
      }
      this._metadata.set(key, metadata[key]);
    }
    this._ensureMetadata();
    this.dirty = true;
  }

  /**
   * Describe the model to an existing RealtimeHandler.
   */
  registerCollaborative( realtimeHandler : IRealtimeHandler ) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._realtimeHandler = realtimeHandler;
      let cellPromise = realtimeHandler.linkVector(this._cells, 'notebook:cells');

      realtimeHandler.collaborators.changed.connect((collaborators, change)=>{
        //If there are selections corresponding to non-collaborators,
        //they are stale and should be removed. Also update the styling
        //of the collaborators that are present.
        for(let i=0; i<this.cells.length; i++) {
          let cell = this.cells.at(i);
          for(let key of cell.selections.keys()) {
            if(!collaborators.has(key)) {
              cell.selections.delete(key);
            }
          }
        }
      });
      cellPromise.then(()=>{
        resolve();
      });
    });
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: IObservableVector<ICellModel>, change: ObservableVector.IChangedArgs<ICellModel>): void {
    switch (change.type) {
    case 'add':
      each(change.newValues, cell => {
        cell.contentChanged.connect(this.triggerContentChange, this);
      });
      break;
    case 'remove':
      each(change.oldValues, cell => {
        cell.dispose();
      });
      break;
    case 'set':
      each(change.newValues, cell => {
        cell.contentChanged.connect(this.triggerContentChange, this);
      });
      each(change.oldValues, cell => {
        cell.dispose();
      });
      break;
    default:
      return;
    }
    let factory = this.contentFactory;
    // Add code cell if there are no cells remaining.
    if (!this._cells.length) {
      // Add the cell in a new context to avoid triggering another
      // cell changed event during the handling of this signal.
      requestAnimationFrame(() => {
        if (!this.isDisposed && !this._cells.length) {
          this._cells.pushBack(factory.createCodeCell({}));
        }
      });
    }
    this.triggerContentChange();
  }

  /**
   * Make sure we have the required metadata fields.
   */
  private _ensureMetadata(): void {
    let metadata = this._metadata;
    if (!metadata.has('language_info')) {
      metadata.set('language_info', { name: '' });
    }
    if (!metadata.has('kernelspec')) {
      metadata.set('kernelspec', { name: '', display_name: '' });
    }
  }

  private _cells: IObservableUndoableVector<ICellModel> = null;
  private _nbformat = nbformat.MAJOR_VERSION;
  private _nbformatMinor = nbformat.MINOR_VERSION;
  private _metadata = new ObservableJSON();
  private _realtimeHandler: IRealtimeHandler = null;
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
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: IContentFactoryOptions) {
      this.codeCellContentFactory = (options.codeCellContentFactory ||
        CodeCellModel.defaultContentFactory
      );
    }

    /**
     * The factory for code cell content.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

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
     return new RawCellModel(options);
    }
  }

  /**
   * The options used to initialize a `ContentFactory`.
   */
  export
  interface IContentFactoryOptions {
    /**
     * The factory for code cell model content.
     */
    codeCellContentFactory?: CodeCellModel.IContentFactory;
  }

  /**
   * The default `ContentFactory` instance.
   */
  export
  const defaultContentFactory = new ContentFactory({});

  export
  class RealtimeCellConverter implements IRealtimeConverter<ICellModel> {
    constructor(contentFactory: IContentFactory) {
      this._factory = contentFactory;
    }

    to(value: ICellModel): Synchronizable {
      return (value as any).synchronizedItems;
    }

    from(value: Synchronizable): ICellModel {
      let map: any = value as IObservableMap<any>;
      let cell: any = {
        cell_type: map.get('cell_type'),
        source: (map.get('value') as any).text,
        metadata: map.get('metadata') || {}
      }
      if(cell.cell_type === 'code') {
        cell.outputs = toArray(map.get('outputs'));
        cell.execution_count = map.get('executionCount') || null;
      }
      switch (cell.cell_type) {
        case 'code':
          return this._factory.createCodeCell({ cell });
        case 'markdown':
          return this._factory.createMarkdownCell({ cell });
        default:
          return this._factory.createRawCell({ cell });
      }
    }

    private _factory: IContentFactory = null;
  }
}
