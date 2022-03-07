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

import {
  IModelDB,
  IObservableValue,
  ObservableValue
} from '@jupyterlab/observables';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';
import {
  createMutex,
  ISharedDoc,
  ISharedMap,
  ISharedString,
  ISharedType,
  SharedDoc,
  SharedMap,
  SharedString
} from '@jupyterlab/shared-models';

const globalModelDBMutex = createMutex();

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
   * The metadata associated with the cell.
   */
  readonly metadata: ISharedMap<JSONValue>;

  readonly sharedModel: ISharedMap<ISharedType>;

  readonly sharedDoc: ISharedDoc;

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
  readonly type: 'code';

  /**
   * Whether the code cell has been edited since the last run.
   */
  readonly isDirty: boolean;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell;

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  executionCount: nbformat.ExecutionCount;

  /**
   * The cell outputs.
   */
  readonly outputs: IOutputAreaModel;

  /**
   * Clear execution, outputs, and related metadata
   */
  clearExecution(): void;

  /**
   * The code cell shared model
   */
  sharedModel: models.ISharedCodeCell;
}

/**
 * The definition of a markdown cell.
 */
export interface IMarkdownCellModel extends IAttachmentsCellModel {
  /**
   * The type of the cell.
   */
  readonly type: 'markdown';

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
  readonly type: 'raw';

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
    super({
      modelDB: options.modelDB,
      sharedDoc: options.sharedDoc
    });
    this.id = options.id || (options.cell?.id as string) || UUID.uuid4();

    if (options.sharedDoc) {
      // If options include the shared doc,
      // the cell belongs to a notebook

      if (options.sharedModel) {
        // If options include the shared model,
        // the cell was initialized by another client
        this.sharedModel = options.sharedModel;
        this.sharedModel.set('id', this.id);
        this.sharedModel.set('type', this.type);
        const value = this.sharedModel.get('value') as ISharedString;
        this._value = value;
        const metadata = this.sharedModel.get('metadata') as ISharedMap<
          JSONValue
        >;
        this.metadata = metadata;
      } else {
        // If options doesn't include the shared model,
        // this client has to initialize it
        this.sharedModel = new SharedMap<ISharedType>({
          doc: options.sharedDoc as SharedDoc,
          initialize: false
        });
        this.sharedModel.set('id', this.id);
        this.sharedModel.set('type', this.type);
        // Overwrite the value in the base class.
        // Now it comes from the shared model instead of the shared doc
        this._value = new SharedString({
          doc: options.sharedDoc as SharedDoc,
          initialize: false
        });
        this.sharedModel.set('value', this._value);
        this.metadata = new SharedMap<JSONValue>({
          doc: options.sharedDoc as SharedDoc,
          initialize: false
        });
        this.sharedModel.set('metadata', this.metadata);
      }
    } else {
      // If options doesn't include the shared doc,
      // this is a standalone cell
      this.sharedModel = this.sharedDoc.createMap<ISharedType>('model');
      this.sharedModel.set('id', this.id);
      this.sharedModel.set('type', this.type);
      // the "value" is initialized by the base class
      this.metadata = new SharedMap<JSONValue>({
        doc: this.sharedDoc as SharedDoc,
        initialize: false
      });
      this.sharedModel.set('metadata', this.metadata);
    }

    this.value.changed.connect(this._onValueChanged, this);
    this.metadata.changed.connect(this.onGenericChange, this);
    this.sharedModel.changed.connect(this._onSharedModelChanged, this);

    const cell = options.cell;
    const trusted = this.modelDB.createValue('trusted');
    trusted.changed.connect(this.onTrustedChanged, this);

    if (!cell) {
      trusted.set(false);
      return;
    }
    trusted.set(!!cell.metadata['trusted']);
    delete cell.metadata['trusted'];

    // Set the text value, normalizing line endings to \n
    if (Array.isArray(cell.source)) {
      this.value.text = cell.source
        .map(s => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
        .join('');
    } else {
      this.value.text = cell.source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
    const metadata = JSONExt.deepCopy(cell.metadata);
    if (this.type !== 'raw') {
      delete metadata['format'];
    }
    if (this.type !== 'code') {
      delete metadata['collapsed'];
      delete metadata['scrolled'];
    }

    for (const key in metadata) {
      this.metadata.set(key, metadata[key] as JSONValue);
    }
  }

  readonly id: string;

  readonly sharedModel: ISharedMap<ISharedType>;

  /**
   * The type of cell.
   */
  get type(): nbformat.CellType {
    // This getter really should be abstract, but our current constructor
    // depends on .type working
    return 'raw';
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  readonly contentChanged = new Signal<this, void>(this);

  /**
   * A signal emitted when a model state changes.
   */
  readonly stateChanged = new Signal<this, IChangedArgs<any>>(this);

  /**
   * The metadata associated with the cell.
   */
  readonly metadata: ISharedMap<JSONValue>;

  /**
   * Get the trusted state of the model.
   */
  get trusted(): boolean {
    return this.modelDB.getValue('trusted') as boolean;
  }

  /**
   * Set the trusted state of the model.
   */
  set trusted(newValue: boolean) {
    const oldValue = this.trusted;
    if (oldValue === newValue) {
      return;
    }
    this.modelDB.setValue('trusted', newValue);
  }

  initialize(): void {
    (this.sharedModel as SharedMap<ISharedType>).initialize();
    (this.value as SharedString).initialize();
    (this.metadata as SharedMap<JSONValue>).initialize();
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
  onTrustedChanged(
    trusted: IObservableValue,
    args: ObservableValue.IChangedArgs
  ): void {
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

  protected _onSharedModelChanged(
    sender: ISharedMap<ISharedType>,
    args: ISharedMap.IChangedArgs<ISharedType>
  ): void {
    // TODO: not sure yet
  }
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
     * The source cell data.
     */
    cell?: nbformat.IBaseCell;

    /**
     * An IModelDB in which to store cell data.
     */
    modelDB?: IModelDB;

    /**
     * A unique identifier for this cell.
     */
    id?: string;

    sharedDoc?: ISharedDoc;

    sharedModel?: ISharedMap<ISharedType>;
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
    const factory =
      options.contentFactory || AttachmentsCellModel.defaultContentFactory;
    let attachments: nbformat.IAttachments | undefined;
    const cell = options.cell;
    if (cell && (cell.cell_type === 'raw' || cell.cell_type === 'markdown')) {
      attachments = (cell as nbformat.IRawCell | nbformat.IMarkdownCell)
        .attachments;
    }

    this._attachments = factory.createAttachmentsModel({
      values: attachments,
      modelDB: this.modelDB
    });
    this._attachments.stateChanged.connect(this.onGenericChange, this);
  }

  /**
   * Get the attachments of the model.
   */
  get attachments(): IAttachmentsModel {
    return this._attachments;
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

  private _attachments: IAttachmentsModel;
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
    const factory =
      options.contentFactory || CodeCellModel.defaultContentFactory;
    const trusted = this.trusted;
    const cell = options.cell as nbformat.ICodeCell;
    let outputs: nbformat.IOutput[] = [];
    console.debug('CodeCellModel:', cell);

    if (cell && cell.cell_type === 'code') {
      // If options contains cell, this client initializes
      // the shared model
      this.sharedModel.set('executionCount', cell.execution_count || null);
      outputs = cell.outputs ?? [];
      globalModelDBMutex(() => {
        this.sharedModel.set('outputs', outputs as JSONValue);
      });

      // If execution count is not null presume the input code was the latest executed
      // TODO load from the notebook file when the dirty state is stored in it
      if (cell.execution_count !== null) {
        // True if execution_count is null or undefined
        this._executedCode = this.value.text.trim();
      }
    } else {
      // If options doesn't contains cell, get values from
      // the shared model
      outputs = this.sharedModel.get('outputs') as nbformat.IOutput[];
    }

    // TODO: Deduplicate outputs data
    this._outputs = factory.createOutputArea({ trusted, values: outputs });
    this._outputs.changed.connect(this.onGenericChange, this);
    this._outputs.changed.connect(this.onModelDBOutputsChange, this);

    // We keep `collapsed` and `jupyter.outputs_hidden` metadata in sync, since
    // they are redundant in nbformat 4.4. See
    // https://github.com/jupyter/nbformat/issues/137
    this.metadata.changed.connect(Private.collapseChanged, this);

    // Sync `collapsed` and `jupyter.outputs_hidden` for the first time, giving
    // preference to `collapsed`.
    if (this.metadata.has('collapsed')) {
      const collapsed = this.metadata.get('collapsed') as boolean | undefined;
      Private.collapseChanged(this.metadata, {
        type: 'change',
        key: 'collapsed',
        oldValue: collapsed,
        newValue: collapsed
      });
    } else if (this.metadata.has('jupyter')) {
      const jupyter = this.metadata.get('jupyter') as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        Private.collapseChanged(this.metadata, {
          type: 'change',
          key: 'jupyter',
          oldValue: jupyter,
          newValue: jupyter
        });
      }
    }
  }

  /**
   * The type of the cell.
   */
  get type(): 'code' {
    return 'code';
  }

  /**
   * The execution count of the cell.
   */
  get executionCount(): nbformat.ExecutionCount {
    return this.sharedModel.has('executionCount')
      ? (this.sharedModel.get('executionCount') as nbformat.ExecutionCount)
      : null;
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    const oldValue = this.executionCount;
    if (newValue === oldValue) {
      return;
    }
    this.sharedModel.set('executionCount', newValue || null);
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

  clearExecution(): void {
    this.outputs.clear();
    this.executionCount = null;
    this._setDirty(false);
    this.metadata.delete('execution');
  }

  /**
   * The cell outputs.
   */
  get outputs(): IOutputAreaModel {
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
   * Handle a change to the trusted state.
   */
  onTrustedChanged(
    trusted: IObservableValue,
    args: ObservableValue.IChangedArgs
  ): void {
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
   * Handle a change to the cell outputs modelDB and reflect it in the shared model.
   */
  protected onModelDBOutputsChange(
    sender: IOutputAreaModel,
    event: IOutputAreaModel.ChangedArgs
  ): void {
    globalModelDBMutex(() => {
      this.sharedModel.set('outputs', this._outputs.toJSON() as JSONValue);
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
    if (args.key === 'outputs') {
      globalModelDBMutex(() => {
        this.clearExecution();
        const outputs = args.newValue as nbformat.IOutput[];
        outputs.forEach(output => this._outputs.add(output));
      });
    }
    if (args.key === 'executionCount') {
      this.contentChanged.emit(void 0);
      this.stateChanged.emit({
        name: 'executionCount',
        oldValue: args.oldValue,
        newValue: args.newValue
      });
      if (args.newValue && this.isDirty) {
        this._setDirty(false);
      }
    }
  }

  sharedModel: models.ISharedCodeCell;

  private _executedCode: string = '';
  private _isDirty = false;
  private _outputs: IOutputAreaModel;
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
    if (args.key === 'collapsed') {
      const jupyter = (metadata.get('jupyter') || {}) as JSONObject;
      const { outputs_hidden, ...newJupyter } = jupyter;

      if (outputs_hidden !== args.newValue) {
        if (args.newValue !== undefined) {
          newJupyter['outputs_hidden'] = args.newValue;
        }
        if (Object.keys(newJupyter).length === 0) {
          metadata.delete('jupyter');
        } else {
          metadata.set('jupyter', newJupyter);
        }
      }
    } else if (args.key === 'jupyter') {
      const jupyter = (args.newValue || {}) as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        metadata.set('collapsed', jupyter.outputs_hidden);
      } else {
        metadata.delete('collapsed');
      }
    }
  }
}
