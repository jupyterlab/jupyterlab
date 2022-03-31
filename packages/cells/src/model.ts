/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JSONExt, JSONObject, JSONValue } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import { AttachmentsModel, IAttachmentsModel } from '@jupyterlab/attachments';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IChangedArgs } from '@jupyterlab/coreutils';

import * as nbformat from '@jupyterlab/nbformat';

import { UUID } from '@lumino/coreutils';

import { ObservableValue } from '@jupyterlab/observables';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';
import {
  ISharedDoc,
  ISharedList,
  ISharedMap,
  ISharedString,
  ISharedType,
  SharedDoc,
  SharedList,
  SharedMap,
  SharedString
} from '@jupyterlab/shared-models';
import { each } from '@lumino/algorithm';

/**
 * The definition of a model object for a cell.
 */
export interface ICellModel extends CodeEditor.IModel {
  /**
   * The type of the cell.
   */
  readonly type: nbformat.CellType;

  /**
   * A unique identifier for the cell.
   */
  readonly id: string;

  /**
   * The metadata associated with the cell.
   */
  readonly metadata: ISharedMap<JSONValue>;

  /**
   * The underlying model where data is stored.
   *
   * #### Notes
   * Making direct edits to the values stored in the`ISharedMap`
   * is not recommended, and may produce unpredictable results.
   */
  //readonly sharedModel: ISharedMap<ISharedType>;

  /**
   * A signal emitted when the content of the model changes.
   */
  readonly contentChanged: ISignal<ICellModel, void>;

  /**
   * A signal emitted when a model state changes.
   */
  readonly stateChanged: ISignal<ICellModel, IChangedArgs<any>>;

  /**
   * Whether the cell is trusted.
   */
  trusted: boolean;

  /**
   * Initialize the model.
   *
   * TODO: documentation
   */
  initialize(): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell;
}

/**
 * The definition of a model cell object for a cell with attachments.
 */
export interface IAttachmentsCellModel extends ICellModel {
  /**
   * The cell attachments
   */
  readonly attachments: IAttachmentsModel;
}

/**
 * The definition of a code cell.
 */
export interface ICodeCellModel extends ICellModel {
  /**
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  readonly type: nbformat.CellType;

  /**
   * Whether the code cell has been edited since the last run.
   */
  readonly isDirty: boolean;

  /**
   * The cell outputs.
   */
  readonly outputs: IOutputAreaModel;

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  executionCount: nbformat.ExecutionCount;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell;

  /**
   * Clear execution, outputs, and related metadata
   */
  clearExecution(): void;
}

/**
 * The definition of a markdown cell.
 */
export interface IMarkdownCellModel extends IAttachmentsCellModel {
  /**
   * The type of the cell.
   */
  readonly type: nbformat.CellType;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMarkdownCell;
}

/**
 * The definition of a raw cell.
 */
export interface IRawCellModel extends IAttachmentsCellModel {
  /**
   * The type of the cell.
   */
  readonly type: nbformat.CellType;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IRawCell;
}

export function isCodeCellModel(model: ICellModel): model is ICodeCellModel {
  return model.type === 'code';
}

export function isMarkdownCellModel(
  model: ICellModel
): model is IMarkdownCellModel {
  return model.type === 'markdown';
}

export function isRawCellModel(model: ICellModel): model is IRawCellModel {
  return model.type === 'raw';
}

/**
 * An implementation of the cell model.
 */
export class CellModel extends CodeEditor.Model implements ICellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  constructor(options: CellModel.IOptions) {
    super({ isDocument: false, sharedDoc: options.sharedDoc });
    this.id = options.id;
    this._sharedModel = options.sharedModel as SharedMap<ISharedType>;
  }

  /**
   * A unique identifier for the cell.
   */
  readonly id: string;

  /**
   * A signal emitted when the state of the model changes.
   */
  readonly contentChanged = new Signal<this, void>(this);

  /**
   * A signal emitted when a model state changes.
   */
  readonly stateChanged = new Signal<this, IChangedArgs<any>>(this);

  /**
   * The type of cell.
   */
  get type(): nbformat.CellType {
    // This getter really should be abstract, but our current constructor
    // depends on .type working
    return 'raw';
  }

  /**
   * The underlying model where the data is stored.
   *
   * #### Notes
   * Making direct edits to the values stored in the`ISharedMap`
   * is not recommended, and may produce unpredictable results.
   */
  get sharedModel(): ISharedMap<ISharedType> {
    return this._sharedModel;
  }

  /**
   * The metadata associated with the cell.
   */
  get metadata(): ISharedMap<JSONValue> {
    if (!this.isReady) {
      throw Error('The model is not ready');
    }
    return this._metadata;
  }

  /**
   * Get the trusted state of the model.
   */
  get trusted(): boolean {
    return this._trusted;
  }

  /**
   * Set the trusted state of the model.
   */
  set trusted(newValue: boolean) {
    const oldValue = this._trusted;
    if (oldValue === newValue) {
      return;
    }
    this._trusted = newValue;
    this._onTrustedChanged({ oldValue, newValue });
  }

  /**
   * Initialize the model.
   *
   * TODO: documentation
   */
  initialize(ready: boolean = true): void {
    if (this.isReady) return;
    this._sharedModel.initialize();
    this._sharedModel.changed.connect(this._onSharedModelChanged, this);

    this._value = this._sharedModel.get('source') as SharedString;
    this._value.initialize();
    this._value.changed.connect(this._onValueChanged, this);

    this._metadata = this._sharedModel.get('metadata') as SharedMap<JSONValue>;
    this._metadata.initialize();
    this._metadata.changed.connect(this.onGenericChange, this);

    // TODO: check the initialization of trusted
    this.trusted = !!this._metadata.get('trusted');

    if (ready) this._triggerModelReady();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell {
    const metadata: nbformat.IBaseCellMetadata = Object.create(null);
    for (const key of this.metadata.keys()) {
      const value = JSON.parse(JSON.stringify(this.metadata.get(key)));
      metadata[key] = value as JSONValue;
    }
    if (this.trusted) {
      metadata['trusted'] = true;
    }
    return {
      cell_type: this.type,
      source: this.value.text,
      metadata
    } as nbformat.ICell;
  }

  /**
   * Handle a change to the trusted state.
   *
   * The default implementation is a no-op.
   */
  protected _onTrustedChanged(args: ObservableValue.IChangedArgs): void {
    /* no-op */
  }

  /**
   * Handle a change to the code cell value.
   */
  protected _onValueChanged(
    sender: ISharedString,
    args: ISharedString.IChangedArgs
  ): void {
    super._onValueChanged(sender, args);
    this.onGenericChange();
  }

  /**
   * Handle a change to the observable value.
   */
  protected onGenericChange(): void {
    this.contentChanged.emit(void 0);
  }

  /**
   * Handle a change in the shared model.
   */
  protected _onSharedModelChanged(
    sender: ISharedMap<ISharedType>,
    args: ISharedMap.IChangedArgs<ISharedType>
  ): void {
    // TODO: not sure yet
  }

  /**
   * Creates the model.
   *
   * TODO: documentation
   */
  static createSharedModel(
    id: string,
    isDocument: boolean,
    sharedDoc: ISharedDoc,
    cell?: nbformat.IBaseCell
  ): ISharedMap<ISharedType> {
    let sharedModel;
    if (isDocument) {
      sharedModel = sharedDoc.createMap('model');
    } else {
      sharedModel = new SharedMap({
        sharedDoc: sharedDoc as SharedDoc,
        initialize: false
      });
    }

    sharedModel.set('id', id);
    // this.prototype.type not great
    sharedModel.set('cell_type', this.prototype.type);
    const value = new SharedString({
      sharedDoc: sharedDoc as SharedDoc,
      initialize: false
    });
    sharedModel.set('source', value);
    const metadata = new SharedMap({
      sharedDoc: sharedDoc as SharedDoc,
      initialize: false
    });
    sharedModel.set('metadata', metadata);

    if (cell) {
      // TODO: how to initialize trusted?
      //const trusted = !!cell.metadata['trusted'];
      //delete cell.metadata['trusted'];

      // Set the text value, normalizing line endings to \n
      if (Array.isArray(cell.source)) {
        value.text = cell.source
          .map(s => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
          .join('');
      } else {
        value.text = cell.source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      }

      const meta = JSONExt.deepCopy(cell.metadata);
      if (this.prototype.type !== 'raw') {
        delete meta['format'];
      }
      if (this.prototype.type !== 'code') {
        delete meta['collapsed'];
        delete meta['scrolled'];
      }

      for (const key in meta) {
        metadata.set(key, meta[key] as JSONValue);
      }
    }

    return sharedModel;
  }

  /**
   * Creates a standalone the model.
   *
   * TODO: documentation
   */
  static createStandaloneModel(
    id?: string,
    cell?: nbformat.IBaseCell
  ): CellModel {
    const cellId = id || UUID.uuid4();
    const sharedDoc = new SharedDoc({ path: cellId });
    const sharedModel = CellModel.createSharedModel(
      cellId,
      true,
      sharedDoc,
      cell
    );
    const model = new CellModel({ id: cellId, sharedDoc, sharedModel });
    model.initialize();
    return model;
  }

  /**
   * Underlying shared model.
   *
   * TODO: documentation
   */
  protected _sharedModel: SharedMap<ISharedType>;

  /**
   * Metadata.
   *
   * TODO: documentation
   */
  protected _metadata: SharedMap<JSONValue>;

  private _trusted: boolean = false;
}

/**
 * The namespace for `CellModel` statics.
 */
export namespace CellModel {
  /**
   * The options used to initialize a `CellModel`.
   */
  export interface IOptions {
    /**
     * A unique identifier for the cell.
     */
    id: string;

    /**
     * An ISharedDoc to store cell's data.
     */
    sharedDoc: ISharedDoc;

    /**
     * An ISharedMap to store cell's data.
     */
    sharedModel: ISharedMap<ISharedType>;
  }
}

/**
 * A base implementation for cell models with attachments.
 */
export class AttachmentsCellModel extends CellModel {
  /**
   * Construct a new cell with optional attachments.
   */
  constructor(options: AttachmentsCellModel.IOptions) {
    super(options);
    this._contentFactory =
      options.contentFactory || AttachmentsCellModel.defaultContentFactory;
  }

  /**
   * Get the attachments of the model.
   */
  get attachments(): IAttachmentsModel {
    if (!this.isReady) {
      throw Error('The model is not ready');
    }
    return this._attachments;
  }

  /**
   * Initialize the model.
   *
   * TODO: documentation
   */
  initialize(ready: boolean = true): void {
    if (this.isReady) return;
    super.initialize(false);
    // TODO: initialize the attachments, and change the model
    this._attachments = this._contentFactory.createAttachmentsModel({
      sharedMap: this._sharedModel.get('attachments') as ISharedMap<JSONObject>
    });
    this._attachments.stateChanged.connect(this.onGenericChange, this);

    if (ready) this._triggerModelReady();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IRawCell | nbformat.IMarkdownCell {
    const cell = super.toJSON() as nbformat.IRawCell | nbformat.IMarkdownCell;
    if (this.attachments.length) {
      cell.attachments = this.attachments.toJSON();
    }
    return cell;
  }

  /**
   * Creates the shared model.
   *
   * TODO: documentation
   */
  static createSharedModel(
    id: string,
    isDocument: boolean,
    sharedDoc: ISharedDoc,
    cell?: nbformat.IRawCell | nbformat.IMarkdownCell
  ): ISharedMap<ISharedType> {
    const sharedModel = super.createSharedModel(
      id,
      isDocument,
      sharedDoc,
      cell
    );
    // TODO: initialize the attachments, and change the model
    const attachments = new SharedMap<JSONValue>({
      sharedDoc: sharedDoc as SharedDoc,
      initialize: false
    });
    sharedModel.set('attachments', attachments);

    if (
      cell &&
      (cell.cell_type === 'raw' || cell.cell_type === 'markdown') &&
      cell.attachments
    ) {
      const values = cell.attachments;
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined) {
          attachments.set(key, values[key] as JSONValue);
        }
      });
    }

    return sharedModel;
  }

  /**
   * Creates a standalone model.
   *
   * TODO: documentation
   */
  static createStandaloneModel(
    id?: string,
    cell?: nbformat.IRawCell | nbformat.IMarkdownCell,
    contentFactory?: AttachmentsCellModel.IContentFactory
  ): AttachmentsCellModel {
    const cellId = id || UUID.uuid4();
    const sharedDoc = new SharedDoc({ path: cellId });
    const sharedModel = AttachmentsCellModel.createSharedModel(
      cellId,
      true,
      sharedDoc,
      cell
    );
    const model = new AttachmentsCellModel({
      id: cellId,
      sharedDoc,
      sharedModel,
      contentFactory
    });
    model.initialize();
    return model;
  }

  private _attachments: IAttachmentsModel;
  private _contentFactory: AttachmentsCellModel.ContentFactory;
}

/**
 * The namespace for `AttachmentsCellModel` statics.
 */
export namespace AttachmentsCellModel {
  /**
   * The options used to initialize a `AttachmentsCellModel`.
   */
  export interface IOptions extends CellModel.IOptions {
    /**
     * The factory for attachment model creation.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A factory for creating code cell model content.
   */
  export interface IContentFactory {
    /**
     * Create an output area.
     */
    createAttachmentsModel(
      options: IAttachmentsModel.IOptions
    ): IAttachmentsModel;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export class ContentFactory implements IContentFactory {
    /**
     * Create an attachments model.
     */
    createAttachmentsModel(
      options: IAttachmentsModel.IOptions
    ): IAttachmentsModel {
      return new AttachmentsModel(options);
    }
  }

  /**
   * The shared `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory();
}

/**
 * An implementation of a raw cell model.
 */
export class RawCellModel extends AttachmentsCellModel {
  /**
   * The type of the cell.
   */
  get type(): 'raw' {
    return 'raw';
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IRawCell {
    const cell = super.toJSON() as nbformat.IRawCell;
    cell.id = this.id;
    return cell;
  }

  /**
   * Creates the shared model.
   *
   * TODO: documentation
   */
  static createSharedModel(
    id: string,
    isDocument: boolean,
    sharedDoc: ISharedDoc,
    cell?: nbformat.IRawCell
  ): ISharedMap<ISharedType> {
    return super.createSharedModel(id, isDocument, sharedDoc, cell);
  }

  /**
   * Creates a standalone model.
   *
   * TODO: documentation
   */
  static createStandaloneModel(
    id?: string,
    cell?: nbformat.IRawCell,
    contentFactory?: AttachmentsCellModel.IContentFactory
  ): RawCellModel {
    const cellId = id || UUID.uuid4();
    const sharedDoc = new SharedDoc({ path: cellId });
    const sharedModel = RawCellModel.createSharedModel(
      cellId,
      true,
      sharedDoc,
      cell
    );
    const model = new RawCellModel({
      id: cellId,
      sharedDoc,
      sharedModel,
      contentFactory
    });
    model.initialize();
    return model;
  }
}

/**
 * An implementation of a markdown cell model.
 */
export class MarkdownCellModel extends AttachmentsCellModel {
  /**
   * Construct a markdown cell model from optional cell content.
   */
  constructor(options: CellModel.IOptions) {
    super(options);
    // Use the Github-flavored markdown mode.
    this.mimeType = 'text/x-ipythongfm';
  }

  /**
   * The type of the cell.
   */
  get type(): 'markdown' {
    return 'markdown';
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMarkdownCell {
    const cell = super.toJSON() as nbformat.IMarkdownCell;
    cell.id = this.id;
    return cell;
  }

  /**
   * Creates the shared model.
   *
   * TODO: documentation
   */
  static createSharedModel(
    id: string,
    isDocument: boolean,
    sharedDoc: ISharedDoc,
    cell?: nbformat.IMarkdownCell
  ): ISharedMap<ISharedType> {
    return super.createSharedModel(id, isDocument, sharedDoc, cell);
  }

  /**
   * Creates an standalone model.
   *
   * TODO: documentation
   */
  static createStandaloneModel(
    id?: string,
    cell?: nbformat.IMarkdownCell
  ): MarkdownCellModel {
    const cellId = id || UUID.uuid4();
    const sharedDoc = new SharedDoc({ path: cellId });
    const sharedModel = MarkdownCellModel.createSharedModel(
      cellId,
      true,
      sharedDoc,
      cell
    );
    const model = new MarkdownCellModel({ id: cellId, sharedDoc, sharedModel });
    model.initialize();
    return model;
  }
}

/**
 * An implementation of a code cell Model.
 */
export class CodeCellModel extends CellModel implements ICodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  constructor(options: CodeCellModel.IOptions) {
    super(options);
    this._contentFactory =
      options.contentFactory || CodeCellModel.defaultContentFactory;
  }

  get type(): 'code' {
    return 'code';
  }

  /**
   * The execution count of the cell.
   */
  get executionCount(): nbformat.ExecutionCount {
    return this.sharedModel.has('execution_count')
      ? (this.sharedModel.get('execution_count') as nbformat.ExecutionCount)
      : null;
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    const oldValue = this.executionCount;
    if (newValue === oldValue) {
      return;
    }
    this.sharedModel.set('execution_count', newValue || null);
  }

  /**
   * Whether the cell is dirty or not.
   *
   * A cell is dirty if it is output is not empty and does not
   * result of the input code execution.
   */
  get isDirty(): boolean {
    // Test could be done dynamically with this._executedCode
    // but for performance reason, the diff status is stored in a boolean.
    return this._isDirty;
  }

  /**
   * The cell outputs.
   */
  get outputs(): IOutputAreaModel {
    if (!this.isReady) {
      throw Error('The model is not ready');
    }
    return this._outputs;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._outputs.dispose();
    this._outputs = null!;
    super.dispose();
  }

  /**
   * Initialize model.
   *
   * TODO: documentation
   */
  initialize(ready: boolean = true): void {
    if (this.isReady) return;
    super.initialize(false);

    this._outputs = this._contentFactory.createOutputArea({
      trusted: this.trusted,
      sharedList: this._sharedModel.get('outputs') as ISharedList<JSONObject>
    });

    this._outputs.changed.connect(this.onGenericChange, this);

    // If execution count is not null presume the input code was the latest executed
    // TODO load from the notebook file when the dirty state is stored in it
    if (this._sharedModel.get('execution_count') !== null) {
      // True if execution_count is null or undefined
      this._executedCode = this._value.text.trim();
    }

    const metadata = this._sharedModel.get('metadata') as ISharedMap<JSONValue>;
    // Sync `collapsed` and `jupyter.outputs_hidden` for the first time, giving
    // preference to `collapsed`.
    if (metadata.has('collapsed')) {
      const collapsed = metadata.get('collapsed') as boolean | undefined;
      Private.collapseChanged(metadata, [
        {
          type: 'change',
          key: 'collapsed',
          oldValue: collapsed,
          newValue: collapsed
        }
      ]);
    } else if (metadata.has('jupyter')) {
      const jupyter = metadata.get('jupyter') as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        Private.collapseChanged(metadata, [
          {
            type: 'change',
            key: 'jupyter',
            oldValue: jupyter,
            newValue: jupyter
          }
        ]);
      }
    }

    // We keep `collapsed` and `jupyter.outputs_hidden` metadata in sync, since
    // they are redundant in nbformat 4.4. See
    // https://github.com/jupyter/nbformat/issues/137
    this._metadata.changed.connect(Private.collapseChanged, this);
    if (ready) this._triggerModelReady();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    const cell = super.toJSON() as nbformat.ICodeCell;
    cell.execution_count = this.executionCount || null;
    cell.outputs = this.outputs.toJSON();
    cell.id = this.id;
    return cell;
  }

  /**
   * Clear the outputs and execution count.
   */
  clearExecution(): void {
    this.outputs.clear();
    this.executionCount = null;
    this._setDirty(false);
    this.metadata.delete('execution');
  }

  /**
   * Handle a change to the trusted state.
   */
  protected _onTrustedChanged(args: ObservableValue.IChangedArgs): void {
    if (this._outputs) {
      this._outputs.trusted = args.newValue as boolean;
    }
    this.stateChanged.emit({
      name: 'trusted',
      oldValue: args.oldValue,
      newValue: args.newValue
    });
  }

  /**
   * Handle a change to the code cell value.
   */
  protected _onValueChanged(
    sender: ISharedString,
    args: ISharedString.IChangedArgs
  ): void {
    super._onValueChanged(sender, args);
    if (this.executionCount !== null) {
      this._setDirty(this._executedCode !== this.value.text.trim());
    }
  }

  /**
   * Handle a change to the output shared model and reflect it in modelDB.
   * We update the modeldb metadata when the nbcell changes.
   *
   * This method overrides the CellModel protected _onSharedModelChanged
   * so we first call super._onSharedModelChanged
   *
   * @override CellModel._onSharedModelChanged
   */
  protected _onSharedModelChanged(
    sender: ISharedMap<ISharedType>,
    args: ISharedMap.IChangedArgs<ISharedType>
  ): void {
    super._onSharedModelChanged(sender, args);
    args.forEach(arg => {
      if (arg.key === 'outputs') {
        // TODO: trigger signal?
        // We are listening for outputs change and triggering
        // this.onGenericChange in the constructor
      }
      if (arg.key === 'execution_count') {
        this.contentChanged.emit(void 0);
        this.stateChanged.emit({
          name: 'execution_count',
          oldValue: arg.oldValue,
          newValue: arg.newValue
        });
        if (arg.newValue && this.isDirty) {
          this._setDirty(false);
        }
      }
    });
  }

  /**
   * Set whether the cell is dirty or not.
   */
  private _setDirty(v: boolean) {
    if (v !== this._isDirty) {
      if (!v) {
        this._executedCode = this.value.text.trim();
      }
      this._isDirty = v;
      this.stateChanged.emit({
        name: 'isDirty',
        oldValue: !v,
        newValue: v
      });
    }
  }

  /**
   * Creates the shared model.
   *
   * TODO: documentation
   */
  static createSharedModel(
    id: string,
    isDocument: boolean,
    sharedDoc: ISharedDoc,
    cell?: nbformat.ICodeCell
  ): ISharedMap<ISharedType> {
    const sharedModel = super.createSharedModel(
      id,
      isDocument,
      sharedDoc,
      cell
    );

    sharedModel.set('execution_count', null);
    const outputs = new SharedList<JSONObject>({
      sharedDoc: sharedDoc as SharedDoc,
      initialize: false
    });
    sharedModel.set('outputs', outputs);

    if (cell && cell.cell_type === 'code') {
      sharedModel.set('execution_count', cell.execution_count || null);
      each(cell.outputs, value => {
        outputs.push(value as JSONObject);
      });
    }

    return sharedModel;
  }

  /**
   * Creates an standalone model.
   *
   * TODO: documentation
   */
  static createStandaloneModel(
    id?: string,
    cell?: nbformat.ICodeCell,
    contentFactory?: CodeCellModel.IContentFactory
  ): CodeCellModel {
    const cellId = id || UUID.uuid4();
    const sharedDoc = new SharedDoc({ path: cellId });
    const sharedModel = CodeCellModel.createSharedModel(
      cellId,
      true,
      sharedDoc,
      cell
    );
    const model = new CodeCellModel({
      id: cellId,
      sharedDoc,
      sharedModel,
      contentFactory
    });
    model.initialize();
    return model;
  }

  private _executedCode: string = '';
  private _isDirty = false;
  private _outputs: IOutputAreaModel;
  private _contentFactory: CodeCellModel.ContentFactory;
}

/**
 * The namespace for `CodeCellModel` statics.
 */
export namespace CodeCellModel {
  /**
   * The options used to initialize a `CodeCellModel`.
   */
  export interface IOptions extends CellModel.IOptions {
    /**
     * The factory for output area model creation.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A factory for creating code cell model content.
   */
  export interface IContentFactory {
    /**
     * Create an output area.
     */
    createOutputArea(options: IOutputAreaModel.IOptions): IOutputAreaModel;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export class ContentFactory implements IContentFactory {
    /**
     * Create an output area.
     */
    createOutputArea(options: IOutputAreaModel.IOptions): IOutputAreaModel {
      return new OutputAreaModel(options);
    }
  }

  /**
   * The shared `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory();
}

namespace Private {
  export function collapseChanged(
    metadata: ISharedMap<JSONValue>,
    args: ISharedMap.IChangedArgs<JSONValue>
  ): void {
    args.forEach(arg => {
      if (arg.key === 'collapsed') {
        const jupyter = (metadata.get('jupyter') || {}) as JSONObject;
        const { outputs_hidden, ...newJupyter } = jupyter;

        if (outputs_hidden !== arg.newValue) {
          if (arg.newValue !== undefined) {
            newJupyter['outputs_hidden'] = arg.newValue;
          }
          if (Object.keys(newJupyter).length === 0) {
            metadata.delete('jupyter');
          } else {
            metadata.set('jupyter', newJupyter);
          }
        }
      } else if (arg.key === 'jupyter') {
        const jupyter = (arg.newValue || {}) as JSONObject;
        if (jupyter.hasOwnProperty('outputs_hidden')) {
          metadata.set('collapsed', jupyter.outputs_hidden);
        } else {
          metadata.delete('collapsed');
        }
      }
    });
  }
}
