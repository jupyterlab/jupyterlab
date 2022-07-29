/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISignal, Signal } from '@lumino/signaling';

import { AttachmentsModel, IAttachmentsModel } from '@jupyterlab/attachments';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IChangedArgs } from '@jupyterlab/coreutils';

import * as nbformat from '@jupyterlab/nbformat';

import * as models from '@jupyterlab/shared-models';

import { JSONExt } from '@lumino/coreutils';

import {
  IObservableJSON,
  IObservableValue,
  ObservableValue
} from '@jupyterlab/observables';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';
import {
  createStandaloneCell,
  ISharedCell,
  ISharedCodeCell,
  ISharedMarkdownCell,
  ISharedRawCell
} from '@jupyterlab/shared-models';
const globalModelDBMutex = models.createMutex();

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
  readonly stateChanged: ISignal<
    ICellModel,
    IChangedArgs<boolean, boolean, any>
  >;

  /**
   * Whether the cell is trusted.
   */
  trusted: boolean;

  /**
   * The metadata associated with the cell.
   */
  readonly metadata: IObservableJSON;

  /**
   * The cell shared model.
   */
  readonly sharedModel: models.ISharedCell;

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
  readonly sharedModel: models.ISharedCodeCell;
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
  constructor(options: CellModel.IOptions<ISharedCell> = {}) {
    super(options);

    this.sharedModel.changed.connect(this.onGenericChange, this);
    this.sharedModel.changed.connect(this.onSharedModelChanged, this);

    const observableMetadata = this.modelDB.createMap('metadata');
    const metadata = JSONExt.deepCopy(this.sharedModel.getMetadata());
    const trusted = this.modelDB.createValue('trusted');
    const cellType = this.modelDB.createValue('type');
    cellType.set(this.type);
    for (const key in metadata) {
      observableMetadata.set(key, metadata[key]);
    }
    observableMetadata.changed.connect(this.onModelDBMetadataChange, this);
    trusted.changed.connect(this.onTrustedChanged, this);
    trusted.set(!!metadata.trusted || !!options.trusted);
  }

  readonly sharedModel: models.ISharedCell;

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
  readonly stateChanged = new Signal<
    this,
    IChangedArgs<any, any, 'isDirty' | 'trusted' | 'executionCount'>
  >(this);

  /**
   * The id for the cell.
   */
  get id(): string {
    return this.sharedModel.getId();
  }

  /**
   * The metadata associated with the cell.
   */
  get metadata(): IObservableJSON {
    return this.modelDB.get('metadata') as IObservableJSON;
  }

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
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell {
    return this.sharedModel.toJSON();
  }

  /**
   * Handle a change to the observable value.
   */
  protected onGenericChange(): void {
    this.contentChanged.emit(void 0);
  }

  /**
   * Handle a change to the cell metadata modelDB and reflect it in the shared model.
   */
  protected onModelDBMetadataChange(
    sender: IObservableJSON,
    event: IObservableJSON.IChangedArgs
  ): void {
    const metadata = this.sharedModel.getMetadata();
    switch (event.type) {
      case 'add':
        this._changeCellMetadata(metadata, event);
        break;
      case 'change':
        this._changeCellMetadata(metadata, event);
        break;
      case 'remove':
        delete metadata[event.key];
        if (event.key === 'collapsed' && metadata.jupyter) {
          delete metadata.jupyter.outputs_hidden;
          if (Object.keys(metadata.jupyter).length === 0) {
            delete metadata.jupyter;
          }
        }
        if (event.key === 'jupyter') {
          delete metadata.collapsed;
        }
        break;
      default:
        throw new Error(`Invalid event type: ${event.type}`);
    }
    this.sharedModel.setMetadata(metadata);
  }

  protected onSharedModelChanged(
    sender: models.ISharedCell,
    change: models.CellChange<models.ISharedBaseCellMetadata>
  ) {
    if (change.metadataChange) {
      const newValue = change.metadataChange.newValue || {};
      const oldValue = change.metadataChange.oldValue || {};
      for (const key in newValue) {
        if (
          oldValue[key] === undefined ||
          !JSONExt.deepEqual(newValue[key], oldValue[key])
        ) {
          this.metadata.set(key, newValue[key]);
        }
      }
      this.metadata.keys().forEach(key => {
        if (newValue[key] === undefined) {
          this.metadata.delete(key);
        }
      });
    }
  }

  /**
   * Change the cell metadata for a given event.
   *
   * @param metadata The cell metadata.
   * @param event The event to handle.
   */
  private _changeCellMetadata(
    metadata: Partial<models.ISharedBaseCellMetadata>,
    event: IObservableJSON.IChangedArgs
  ): void {
    switch (event.key) {
      case 'jupyter':
        metadata.jupyter = event.newValue as any;
        if (metadata.jupyter?.outputs_hidden != null) {
          metadata.collapsed = metadata.jupyter.outputs_hidden;
        } else {
          delete metadata.collapsed;
        }
        break;
      case 'collapsed':
        metadata.collapsed = event.newValue as any;
        break;
      case 'name':
        metadata.name = event.newValue as any;
        break;
      case 'scrolled':
        metadata.scrolled = event.newValue as any;
        break;
      case 'tags':
        metadata.tags = event.newValue as any;
        break;
      case 'trusted':
        metadata.trusted = event.newValue as any;
        break;
      default:
        // The default is applied for custom metadata that are not
        // defined in the official nbformat but which are defined
        // by the user.
        metadata[event.key] = event.newValue as any;
    }
  }
}

/**
 * The namespace for `CellModel` statics.
 */
export namespace CellModel {
  /**
   * The options used to initialize a `CellModel`.
   */
  export interface IOptions<T extends ISharedCell> {
    /**
     * A unique identifier for the model.
     */
    id?: string;

    /**
     * The cell shared model.
     */
    sharedModel?: T;
    /**
     * Whether the cell is trusted or not.
     */
    trusted?: boolean;
  }
}

/**
 * A base implementation for cell models with attachments.
 */
export class AttachmentsCellModel extends CellModel {
  /**
   * Construct a new cell with optional attachments.
   */
  constructor(options: AttachmentsCellModel.IOptions<ISharedCell>) {
    super(options);
    const factory =
      options.contentFactory || AttachmentsCellModel.defaultContentFactory;
    this._attachments = factory.createAttachmentsModel({
      sharedModel: this.sharedModel as ISharedMarkdownCell | ISharedRawCell
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
    return super.toJSON() as nbformat.IRawCell | nbformat.IMarkdownCell;
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
  export interface IOptions<T extends ISharedCell>
    extends CellModel.IOptions<T> {
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
   * Construct a markdown cell model from optional shared model.
   */
  constructor(options: AttachmentsCellModel.IOptions<ISharedRawCell> = {}) {
    super({
      ...options,
      sharedModel:
        options?.sharedModel ||
        (createStandaloneCell({
          cell_type: 'raw',
          id: options.id
        }) as ISharedRawCell)
    });
  }

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
    return super.toJSON() as nbformat.IRawCell;
  }
}

/**
 * An implementation of a markdown cell model.
 */
export class MarkdownCellModel extends AttachmentsCellModel {
  /**
   * Construct a markdown cell model from optional shared model.
   */
  constructor(
    options: AttachmentsCellModel.IOptions<ISharedMarkdownCell> = {}
  ) {
    super({
      ...options,
      sharedModel:
        options?.sharedModel ||
        (createStandaloneCell({
          cell_type: 'markdown',
          id: options.id
        }) as ISharedMarkdownCell)
    });
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
    return super.toJSON() as nbformat.IMarkdownCell;
  }
}

/**
 * An implementation of a code cell Model.
 */
export class CodeCellModel extends CellModel implements ICodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  constructor(options: CodeCellModel.IOptions = {}) {
    super({
      ...options,
      sharedModel:
        options?.sharedModel ||
        createStandaloneCell({ cell_type: 'code', id: options.id })
    });
    const factory =
      options?.contentFactory || CodeCellModel.defaultContentFactory;
    const trusted = this.trusted;
    let outputs: nbformat.IOutput[] = this.sharedModel.getOutputs();
    this.sharedModel.changed.connect(this._onValueChanged, this);

    this._outputs = factory.createOutputArea({ trusted, values: outputs });
    this._outputs.changed.connect(this.onGenericChange, this);
    this._outputs.changed.connect(this.onModelDBOutputsChange, this);
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
    return this.sharedModel.execution_count || null;
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    this.sharedModel.execution_count = newValue || null;
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
    return this._outputs;
  }

  readonly sharedModel: models.ISharedCodeCell;

  clearExecution(): void {
    this.outputs.clear();
    this.executionCount = null;
    this._setDirty(false);
    const metadata = this.sharedModel.getMetadata();
    delete metadata.execution;
    this.sharedModel.setMetadata(metadata);
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
      oldValue: args.oldValue as boolean,
      newValue: args.newValue as boolean
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    return super.toJSON() as nbformat.ICodeCell;
  }

  /**
   * Handle a change to the cell outputs modelDB and reflect it in the shared model.
   */
  protected onModelDBOutputsChange(
    sender: IOutputAreaModel,
    event: IOutputAreaModel.ChangedArgs
  ): void {
    const codeCell = this.sharedModel as models.YCodeCell;
    globalModelDBMutex(() => {
      switch (event.type) {
        case 'add': {
          const outputs = event.newValues.map(output => output.toJSON());
          codeCell.updateOutputs(event.newIndex, event.newIndex, outputs);
          break;
        }
        case 'set': {
          const newValues = event.newValues.map(output => output.toJSON());
          codeCell.updateOutputs(
            event.oldIndex,
            event.oldIndex + newValues.length,
            newValues
          );
          break;
        }
        case 'remove':
          codeCell.updateOutputs(event.oldIndex, event.oldValues.length);
          break;
        default:
          throw new Error(`Invalid event type: ${event.type}`);
      }
    });
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
  protected onSharedModelChanged(
    sender: models.ISharedCodeCell,
    change: models.CellChange<models.ISharedBaseCellMetadata>
  ): void {
    super.onSharedModelChanged(sender, change);
    globalModelDBMutex(() => {
      if (change.outputsChange) {
        this.clearExecution();
        sender.getOutputs().forEach(output => this._outputs.add(output));
      }
    });
  }

  /**
   * Handle a change to the code cell value.
   */
  private _onValueChanged(
    slot: models.ISharedCodeCell,
    change: models.CellChange<models.ISharedBaseCellMetadata>
  ): void {
    if (change.executionCountChange) {
      if (
        change.executionCountChange.newValue &&
        (this.isDirty || !change.executionCountChange.oldValue)
      ) {
        this._setDirty(false);
      }
      this.stateChanged.emit({
        name: 'executionCount',
        oldValue: change.executionCountChange.oldValue,
        newValue: change.executionCountChange.newValue
      });
    }

    if (change.sourceChange && this.executionCount !== null) {
      this._setDirty(
        this._executedCode !== this.sharedModel.getSource().trim()
      );
    }
  }

  /**
   * Set whether the cell is dirty or not.
   */
  private _setDirty(v: boolean) {
    if (!v) {
      this._executedCode = this.sharedModel.getSource().trim();
    }
    if (v !== this._isDirty) {
      this._isDirty = v;
      this.stateChanged.emit({
        name: 'isDirty',
        oldValue: !v,
        newValue: v
      });
    }
  }

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
  export interface IOptions extends CellModel.IOptions<ISharedCodeCell> {
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
