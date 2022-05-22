// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import {
  CodeCellModel,
  ICellModel,
  ICodeCellModel,
  IMarkdownCellModel,
  IRawCellModel,
  MarkdownCellModel,
  RawCellModel
} from '@jupyterlab/cells';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as nbformat from '@jupyterlab/nbformat';
import {
  ISharedDoc,
  ISharedMap,
  ISharedType,
  SharedDoc,
  SharedList
} from '@jupyterlab/shared-models';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { JSONObject, JSONValue, UUID } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { CellList, ICellList } from './celllist';

/**
 * The definition of a model object for a notebook widget.
 */
export interface INotebookModel extends DocumentRegistry.IModel {
  /**
   * The list of cells in the notebook.
   */
  readonly cells: ICellList;

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
  readonly metadata: ISharedMap<JSONValue>;

  /**
   * The array of deleted cells since the notebook was last run.
   */
  readonly deletedCells: string[];

  /**
   * If the model is initialized or not.
   */
  isInitialized: boolean;
}

/**
 * An implementation of a notebook Model.
 */
export class NotebookModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    if (options.sharedDoc) {
      this._sharedDoc = options.sharedDoc;
    } else {
      this._sharedDoc = new SharedDoc();
    }

    this._isInitialized = options.isInitialized === false ? false : true;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
    this._defaultLang = options.languagePreference || '';
    this._deletedCells = [];

    if (options.contentFactory) {
      this.contentFactory = options.contentFactory.clone(this._sharedDoc);
    } else {
      this.contentFactory = new NotebookModel.ContentFactory({
        sharedDoc: this._sharedDoc
      });
    }

    const sharedList = this._sharedDoc.createList<ISharedMap<ISharedType>>(
      'cells'
    ) as SharedList<any>;
    sharedList.undoManager = SharedDoc.createUndoManager(
      sharedList.underlyingModel,
      []
    );
    this._cells = new CellList(this.contentFactory, sharedList);
    this._cells.changed.connect(this._onCellsChanged, this);

    this._metadata = this._sharedDoc.createMap<JSONObject>('metadata');
    this._metadata.changed.connect(this._onMetadataChanged, this);

    this._state = this._sharedDoc.createMap<JSONValue>('state');
    this._state.changed.connect(this._onStateChanged, this);
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
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
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * Get the observable list of notebook cells.
   */
  get cells(): ICellList {
    return this._cells;
  }

  /**
   * The metadata associated with the notebook.
   */
  get metadata(): ISharedMap<JSONValue> {
    return this._metadata;
  }

  /**
   * The major version number of the nbformat.
   */
  get nbformat(): number {
    return (this._state.get('nbformat') as number) || nbformat.MAJOR_VERSION;
  }

  /**
   * The minor version number of the nbformat.
   */
  get nbformatMinor(): number {
    return (
      (this._state.get('nbformat_minor') as number) || nbformat.MINOR_VERSION
    );
  }

  /**
   * The default kernel name of the document.
   */
  get defaultKernelName(): string {
    const spec = this._metadata.get(
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
   * If the model is initialized or not.
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * The default kernel language of the document.
   */
  get defaultKernelLanguage(): string {
    const info = this._metadata.get(
      'language_info'
    ) as nbformat.ILanguageInfoMetadata;
    return info ? info.name : this._defaultLang;
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
    this._metadata.dispose();
    this._state.dispose();
    this._sharedDoc.dispose();
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
   * Serialize the model to JSON.any
   */
  toJSON(): nbformat.INotebookContent {
    const cells: nbformat.ICell[] = [];
    for (let i = 0; i < (this.cells?.length ?? 0); i++) {
      const cell = this.cells.get(i).toJSON();
      if (this.nbformat === 4 && this.nbformatMinor <= 4) {
        // strip cell ids if we have notebook format 4.0-4.4
        delete cell.id;
      }
      cells.push(cell);
    }
    this._ensureMetadata();
    const metadata: JSONObject = {};
    for (const key of this._metadata.keys()) {
      metadata[key] = JSON.parse(JSON.stringify(this._metadata.get(key)));
    }
    return {
      metadata,
      nbformat_minor: this.nbformatMinor,
      nbformat: this.nbformat,
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
    const cells: ICellModel[] = [];
    const factory = this.contentFactory;
    const useId = value.nbformat === 4 && value.nbformat_minor >= 5;

    for (const cell of value.cells) {
      const id = useId ? (cell as any).id : UUID.uuid4();
      const type = cell.cell_type as nbformat.CellType;
      cells.push(factory.createCell(type, id, cell));
    }

    this.cells.transact(() => {
      this.cells.clear();
      this.cells.pushAll(cells);
    });

    const nbformatMajor =
      value.nbformat !== undefined ? value.nbformat : nbformat.MAJOR_VERSION;
    const nbformatMinor =
      value.nbformat_minor > nbformat.MINOR_VERSION
        ? value.nbformat_minor
        : nbformat.MINOR_VERSION;
    this._state.set('nbformat', nbformatMajor);
    this._state.set('nbformat_minor', nbformatMinor);
    const origNbformat = value.metadata.orig_nbformat;

    // Alert the user if the format changes.
    if (origNbformat !== undefined && nbformatMajor !== origNbformat) {
      const newer = nbformatMajor > origNbformat;
      let msg: string;

      if (newer) {
        msg = this._trans.__(
          `This notebook has been converted from an older notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (v%2) will be used.
'Older versions of Jupyter may not be able to read the new format.' To preserve the original format version,
close the notebook without saving it.`,
          origNbformat,
          nbformatMajor
        );
      } else {
        msg = this._trans.__(
          `This notebook has been converted from an newer notebook format (v%1)
to the current notebook format (v%2).
The next time you save this notebook, the current notebook format (v%2) will be used.
Some features of the original notebook may not be available.' To preserve the original format version,
close the notebook without saving it.`,
          origNbformat,
          nbformatMajor
        );
      }
      void showDialog({
        title: this._trans.__('Notebook converted'),
        body: msg,
        buttons: [Dialog.okButton({ label: this._trans.__('Ok') })]
      });
    }

    // Update the metadata.
    this._metadata.clear();
    const metadata = value.metadata;
    for (const key in metadata) {
      // orig_nbformat is not intended to be stored per spec.
      if (key === 'orig_nbformat') {
        continue;
      }
      this._metadata.set(key, metadata[key] as JSONValue);
    }
    this._ensureMetadata();
  }

  /**
   * Initialize the model with its current state.
   *
   * #### Notes
   * Adds an empty code cell if the model is empty
   * and clears undo state.
   */
  initialize(): void {
    if (!this.cells.length) {
      const factory = this.contentFactory;
      this.cells.push(factory.createCodeCell());
    }
    this._isInitialized = true;
    this.cells.clearUndo();
    this._ensureMetadata();
    this._state.set('dirty', false);
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
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: ICellList, args: ICellList.IChangedArgs): void {
    args.added.forEach(cell => {
      cell.contentChanged.connect(this.triggerContentChange, this);
    });
    this.triggerContentChange();
  }

  /**
   * Handle a change in notebook's state.
   */
  private _onStateChanged(
    sender: ISharedMap<JSONValue>,
    args: ISharedMap.IChangedArgs<JSONValue>
  ): void {
    args.forEach(arg => {
      if (arg.key === 'dirty' && this._dirty !== arg.newValue) {
        this._dirty = arg.newValue as boolean;
      }
      this.triggerStateChange({
        name: arg.key,
        newValue: arg.newValue,
        oldValue: arg.oldValue
      });
    });
  }

  /**
   * Handle a change in notebook's metadata.
   */
  private _onMetadataChanged(
    sender: ISharedMap<JSONValue>,
    args: ISharedMap.IChangedArgs<JSONValue>
  ): void {
    this.triggerContentChange();
  }

  /**
   * Make sure we have the required metadata fields.
   */
  private _ensureMetadata(): void {
    if (!this._metadata.has('language_info')) {
      this._metadata.set('language_info', { name: this._defaultLang });
    }
    if (!this._metadata.has('kernelspec')) {
      this._metadata.set('kernelspec', { name: '', display_name: '' });
    }
  }

  private _dirty = false;
  private _readOnly = false;
  private _isDisposed = false;
  private _isInitialized: boolean;
  private _trans: TranslationBundle;

  private _defaultLang: string;

  private _cells: ICellList;
  private _deletedCells: string[];
  private _sharedDoc: ISharedDoc;
  private _metadata: ISharedMap<JSONValue>;
  private _state: ISharedMap<JSONValue>;

  private _contentChanged = new Signal<this, void>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);
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
     * The underlying `ISharedDoc` instance where model's data is stored.
     *
     * #### Notes
     * Making direct edits to the values stored in the`ISharedDoc`
     * is not recommended, and may produce unpredictable results.
     */
    sharedDoc?: ISharedDoc;

    /**
     * Language translator.
     */
    translator?: ITranslator;

    /**
     * If the model is initialized or not.
     */
    isInitialized?: boolean;

    /**
     * Defines if the document can be undo/redo.
     */
    disableDocumentWideUndoRedo?: boolean;
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
     * The ISharedDoc in which to put data for the notebook model.
     */
    readonly sharedDoc: ISharedDoc | undefined;

    /**
     * Create a new cell by cell type.
     *
     * @param type:  the type of the cell to create.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     *
     * #### Notes
     * This method is intended to be a convenience method to programmatically
     * call the other cell creation methods in the factory.
     */
    createCell(
      type: nbformat.CellType,
      id?: string,
      cell?: nbformat.ICell
    ): ICellModel;

    /**
     * Create a new cell from a shared model.
     *
     * @param sharedModel:  shared model with the data already initialized.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     *
     * #### Notes
     * This method is useful to create a cell when receiving the data from
     * another client.
     * This method is intended to be a convenience method to programmatically
     * call the other cell creation methods in the factory.
     */
    createCellFromSharedModel(sharedModel: ISharedMap<ISharedType>): ICellModel;

    /**
     * Create a new code cell.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @param contentFactory: optional factory for creating code cell model content.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createCodeCell(
      id?: string,
      cell?: nbformat.ICodeCell,
      contentFactory?: CodeCellModel.IContentFactory
    ): ICodeCellModel;

    /**
     * Create a new markdown cell.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createMarkdownCell(
      id?: string,
      cell?: nbformat.IMarkdownCell
    ): IMarkdownCellModel;

    /**
     * Create a new raw cell.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(id?: string, cell?: nbformat.IRawCell): IRawCellModel;

    /**
     * Clone the content factory with a new ISharedDoc.
     *
     * @param sharedDoc: the new ISharedDoc for the factory.
     */
    clone(sharedDoc: ISharedDoc): IContentFactory;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export class ContentFactory implements IContentFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: ContentFactory.IOptions) {
      this.sharedDoc = options.sharedDoc;
      this.codeCellContentFactory =
        options.codeCellContentFactory || CodeCellModel.defaultContentFactory;
    }

    /**
     * The ISharedDoc in which to put the notebook data.
     */
    readonly sharedDoc: ISharedDoc;

    /**
     * The factory for code cell content.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * Create a new cell by cell type.
     *
     * @param type:  the type of the cell to create.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     *
     * #### Notes
     * This method is intended to be a convenience method to programmatically
     * call the other cell creation methods in the factory.
     */
    createCell(
      type: nbformat.CellType,
      id?: string,
      cell?: nbformat.ICell
    ): ICellModel {
      switch (type) {
        case 'code':
          return this.createCodeCell(id, cell as nbformat.ICodeCell);
        case 'markdown':
          return this.createMarkdownCell(id, cell as nbformat.IMarkdownCell);
        case 'raw':
        default:
          return this.createRawCell(id, cell as nbformat.IRawCell);
      }
    }

    /**
     * Create a new cell from a shared model.
     *
     * @param sharedModel:  shared model with the data already initialized.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     *
     * #### Notes
     * This method is useful to create a cell when receiving the data from
     * another client.
     * This method is intended to be a convenience method to programmatically
     * call the other cell creation methods in the factory.
     */
    createCellFromSharedModel(
      sharedModel: ISharedMap<ISharedType>
    ): ICellModel {
      const id = sharedModel.get('id') as string;
      let codeCell;
      switch (sharedModel.get('cell_type')) {
        case 'code':
          codeCell = new CodeCellModel({
            id,
            sharedDoc: this.sharedDoc,
            sharedModel,
            contentFactory: this.codeCellContentFactory
          });
          break;
        case 'markdown':
          codeCell = new MarkdownCellModel({
            id,
            sharedDoc: this.sharedDoc,
            sharedModel
          });
          break;
        case 'raw':
        default:
          codeCell = new RawCellModel({
            id,
            sharedDoc: this.sharedDoc,
            sharedModel
          });
          break;
      }
      codeCell.initialize();
      return codeCell;
    }

    /**
     * Create a new code cell.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @param contentFactory: optional factory for creating code cell model content.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     *   If the contentFactory is not provided, the instance
     *   `codeCellContentFactory` will be used.
     */
    createCodeCell(
      id?: string,
      cell?: nbformat.ICodeCell,
      contentFactory?: CodeCellModel.IContentFactory
    ): ICodeCellModel {
      id = id || cell?.id || UUID.uuid4();
      contentFactory = contentFactory || this.codeCellContentFactory;
      const sharedModel = CodeCellModel.createSharedModel(
        id,
        false,
        this.sharedDoc,
        cell
      );
      return new CodeCellModel({
        id,
        sharedDoc: this.sharedDoc,
        sharedModel,
        contentFactory
      });
    }

    /**
     * Create a new markdown cell.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createMarkdownCell(
      id?: string,
      cell?: nbformat.IMarkdownCell
    ): IMarkdownCellModel {
      id = id || cell?.id || UUID.uuid4();
      const sharedModel = MarkdownCellModel.createSharedModel(
        id,
        false,
        this.sharedDoc,
        cell
      );
      const cellModel = new MarkdownCellModel({
        id,
        sharedDoc: this.sharedDoc,
        sharedModel
      });
      return cellModel;
    }

    /**
     * Create a new raw cell.
     *
     * @param id: optional unique identifier. If not provided, it will be generated randomly.
     *
     * @param cell: optional cell data.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(id?: string, cell?: nbformat.IRawCell): IRawCellModel {
      id = id || cell?.id || UUID.uuid4();
      const sharedModel = RawCellModel.createSharedModel(
        id,
        false,
        this.sharedDoc,
        cell
      );
      return new RawCellModel({ id, sharedDoc: this.sharedDoc, sharedModel });
    }

    /**
     * Clone the content factory with a new ISharedDoc.
     *
     * @param sharedDoc: the new ISharedDoc for the factory.
     */
    clone(sharedDoc: ISharedDoc): ContentFactory {
      return new ContentFactory({
        sharedDoc,
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
       * The underlying `ISharedDoc` instance where model's data is stored.
       *
       * #### Notes
       * Making direct edits to the values stored in the`ISharedDoc`
       * is not recommended, and may produce unpredictable results.
       */
      sharedDoc: ISharedDoc;

      /**
       * The factory for code cell model content.
       */
      codeCellContentFactory?: CodeCellModel.IContentFactory;
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory({
    sharedDoc: new SharedDoc()
  });
}
