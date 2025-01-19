/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ISignal, Signal } from '@lumino/signaling';

import { AttachmentsModel, IAttachmentsModel } from '@jupyterlab/attachments';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IChangedArgs } from '@jupyterlab/coreutils';

import * as nbformat from '@jupyterlab/nbformat';

import { IObservableString, ObservableValue } from '@jupyterlab/observables';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';

import {
  CellChange,
  createMutex,
  createStandaloneCell,
  IExecutionState,
  IMapChange,
  ISharedAttachmentsCell,
  ISharedCell,
  ISharedCodeCell,
  ISharedMarkdownCell,
  ISharedRawCell,
  YCodeCell
} from '@jupyter/ydoc';

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
   *
   * ### Notes
   * This is a copy of the metadata. Changing a part of it
   * won't affect the model.
   * As this returns a copy of all metadata, it is advised to
   * use `getMetadata` to speed up the process of getting a single key.
   */
  readonly metadata: Omit<nbformat.IBaseCellMetadata, 'trusted'>;

  /**
   * Signal emitted when cell metadata changes.
   */
  readonly metadataChanged: ISignal<ICellModel, IMapChange>;

  /**
   * The cell shared model.
   */
  readonly sharedModel: ISharedCell;

  /**
   * Delete a metadata.
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
   * The code cell's state.
   */
  executionState: IExecutionState;

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
  readonly sharedModel: ISharedCodeCell;
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
export abstract class CellModel extends CodeEditor.Model implements ICellModel {
  constructor(options: CellModel.IOptions<ISharedCell> = {}) {
    const { cell_type, sharedModel, ...others } = options;
    super({
      sharedModel:
        sharedModel ??
        createStandaloneCell({
          cell_type: cell_type ?? 'raw',
          id: options.id
        }),
      ...others
    });
    this.standaloneModel = typeof options.sharedModel === 'undefined';
    this.trusted = !!this.getMetadata('trusted') || !!options.trusted;

    this.sharedModel.changed.connect(this.onGenericChange, this);
    this.sharedModel.metadataChanged.connect(this._onMetadataChanged, this);
  }

  readonly sharedModel: ISharedCell;

  /**
   * The type of cell.
   */
  abstract get type(): nbformat.CellType;

  /**
   * A signal emitted when the state of the model changes.
   */
  readonly contentChanged = new Signal<this, void>(this);

  /**
   * Signal emitted when cell metadata changes.
   */
  get metadataChanged(): ISignal<ICellModel, IMapChange> {
    return this._metadataChanged;
  }

  /**
   * A signal emitted when a model state changes.
   */
  readonly stateChanged = new Signal<
    this,
    IChangedArgs<
      any,
      any,
      'isDirty' | 'trusted' | 'executionCount' | 'executionState'
    >
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
  get metadata(): Omit<nbformat.IBaseCellMetadata, 'trusted'> {
    return this.sharedModel.metadata;
  }

  /**
   * The trusted state of the model.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(newValue: boolean) {
    const oldValue = this.trusted;
    if (oldValue !== newValue) {
      this._trusted = newValue;
      this.onTrustedChanged(this, { newValue, oldValue });
    }
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.sharedModel.changed.disconnect(this.onGenericChange, this);
    this.sharedModel.metadataChanged.disconnect(this._onMetadataChanged, this);
    super.dispose();
  }

  /**
   * Handle a change to the trusted state.
   *
   * The default implementation is a no-op.
   */
  onTrustedChanged(
    trusted: CellModel,
    args: ObservableValue.IChangedArgs
  ): void {
    /* no-op */
  }

  /**
   * Delete a metadata
   *
   * @param key Metadata key
   */
  deleteMetadata(key: string): any {
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

  private _onMetadataChanged(sender: ISharedCell, change: IMapChange) {
    this._metadataChanged.emit(change);
  }

  private _metadataChanged = new Signal<this, IMapChange>(this);
  private _trusted = false;
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
     * The cell type
     */
    cell_type?: string;

    /**
     * Whether the cell is trusted or not.
     */
    trusted?: boolean;
  }
}

/**
 * A base implementation for cell models with attachments.
 */
export abstract class AttachmentsCellModel extends CellModel {
  /**
   * Construct a new cell with optional attachments.
   */
  constructor(options: AttachmentsCellModel.IOptions<ISharedCell>) {
    super(options);
    const factory =
      options.contentFactory ?? AttachmentsCellModel.defaultContentFactory;
    const values = (
      this.sharedModel as ISharedAttachmentsCell
    ).getAttachments();
    this._attachments = factory.createAttachmentsModel({ values });
    this._attachments.stateChanged.connect(this.onGenericChange, this);
    this._attachments.changed.connect(this._onAttachmentsChange, this);

    this.sharedModel.changed.connect(this._onSharedModelChanged, this);
  }

  /**
   * Get the attachments of the model.
   */
  get attachments(): IAttachmentsModel {
    return this._attachments;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._attachments.stateChanged.disconnect(this.onGenericChange, this);
    this._attachments.changed.disconnect(this._onAttachmentsChange, this);
    this._attachments.dispose();
    this.sharedModel.changed.disconnect(this._onSharedModelChanged, this);
    super.dispose();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IRawCell | nbformat.IMarkdownCell {
    return super.toJSON() as nbformat.IRawCell | nbformat.IMarkdownCell;
  }

  /**
   * Handle a change to the cell outputs modelDB and reflect it in the shared model.
   */
  private _onAttachmentsChange(
    sender: IAttachmentsModel,
    event: IAttachmentsModel.ChangedArgs
  ): void {
    const cell = this.sharedModel as ISharedAttachmentsCell;
    globalModelDBMutex(() => cell.setAttachments(sender.toJSON()));
  }

  /**
   * Handle a change to the code cell value.
   */
  private _onSharedModelChanged(
    slot: ISharedAttachmentsCell,
    change: CellChange
  ): void {
    if (change.attachmentsChange) {
      const cell = this.sharedModel as ISharedAttachmentsCell;
      globalModelDBMutex(() =>
        this._attachments.fromJSON(cell.getAttachments() ?? {})
      );
    }
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
   * Construct a raw cell model from optional shared model.
   */
  constructor(
    options: Omit<
      AttachmentsCellModel.IOptions<ISharedRawCell>,
      'cell_type'
    > = {}
  ) {
    super({
      cell_type: 'raw',
      ...options
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
    options: Omit<
      AttachmentsCellModel.IOptions<ISharedMarkdownCell>,
      'cell_type'
    > = {}
  ) {
    super({
      cell_type: 'markdown',
      ...options
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
      cell_type: 'code',
      ...options
    });

    const factory =
      options?.contentFactory ?? CodeCellModel.defaultContentFactory;
    const trusted = this.trusted;
    const outputs = this.sharedModel.getOutputs();
    this._outputs = factory.createOutputArea({ trusted, values: outputs });

    this.sharedModel.changed.connect(this._onSharedModelChanged, this);
    this._outputs.changed.connect(this.onGenericChange, this);
    this._outputs.changed.connect(this.onOutputsChange, this);
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
   * The execution state of the cell.
   */
  get executionState(): IExecutionState {
    return this.sharedModel.executionState;
  }
  set executionState(newValue: IExecutionState) {
    this.sharedModel.executionState = newValue;
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
   * Public Set whether the cell is dirty or not.
   */
  set isDirty(dirty: boolean) {
    this._setDirty(dirty);
  }

  /**
   * The cell outputs.
   */
  get outputs(): IOutputAreaModel {
    return this._outputs;
  }

  readonly sharedModel: ISharedCodeCell;

  clearExecution(): void {
    this.outputs.clear();
    this.executionCount = null;
    this.executionState = 'idle';
    this._setDirty(false);
    this.sharedModel.deleteMetadata('execution');
    // We trust this cell as it no longer has any outputs.
    this.trusted = true;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.sharedModel.changed.disconnect(this._onSharedModelChanged, this);
    this._outputs.changed.disconnect(this.onGenericChange, this);
    this._outputs.changed.disconnect(this.onOutputsChange, this);
    this._outputs.dispose();
    this._outputs = null!;
    super.dispose();
  }

  /**
   * Handle a change to the trusted state.
   */
  onTrustedChanged(
    trusted: CellModel,
    args: ObservableValue.IChangedArgs
  ): void {
    const newTrusted = args.newValue as boolean;
    if (this._outputs) {
      this._outputs.trusted = newTrusted;
    }
    if (newTrusted) {
      const codeCell = this.sharedModel as YCodeCell;
      const metadata = codeCell.getMetadata();
      metadata.trusted = true;
      codeCell.setMetadata(metadata);
    }
    this.stateChanged.emit({
      name: 'trusted',
      oldValue: args.oldValue as boolean,
      newValue: newTrusted
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
  protected onOutputsChange(
    sender: IOutputAreaModel,
    event: IOutputAreaModel.ChangedArgs
  ): void {
    const codeCell = this.sharedModel as YCodeCell;
    globalModelDBMutex(() => {
      switch (event.type) {
        case 'add': {
          for (const output of event.newValues) {
            if (output.type === 'stream') {
              output.streamText!.changed.connect(
                (
                  sender: IObservableString,
                  textEvent: IObservableString.IChangedArgs
                ) => {
                  if (
                    textEvent.options !== undefined &&
                    (textEvent.options as { [key: string]: any })['silent']
                  ) {
                    return;
                  }
                  const codeCell = this.sharedModel as YCodeCell;
                  if (textEvent.type === 'remove') {
                    codeCell.removeStreamOutput(
                      event.newIndex,
                      textEvent.start,
                      'silent-change'
                    );
                  } else {
                    codeCell.appendStreamOutput(
                      event.newIndex,
                      textEvent.value,
                      'silent-change'
                    );
                  }
                },
                this
              );
            }
          }
          const outputs = event.newValues.map(output => output.toJSON());
          codeCell.updateOutputs(
            event.newIndex,
            event.newIndex,
            outputs,
            'silent-change'
          );
          break;
        }
        case 'set': {
          const newValues = event.newValues.map(output => output.toJSON());
          codeCell.updateOutputs(
            event.oldIndex,
            event.oldIndex + newValues.length,
            newValues,
            'silent-change'
          );
          break;
        }
        case 'remove':
          codeCell.updateOutputs(
            event.oldIndex,
            event.oldValues.length,
            [],
            'silent-change'
          );
          break;
        default:
          throw new Error(`Invalid event type: ${event.type}`);
      }
    });
  }

  /**
   * Handle a change to the code cell value.
   */
  private _onSharedModelChanged(
    slot: ISharedCodeCell,
    change: CellChange
  ): void {
    if (change.streamOutputChange) {
      globalModelDBMutex(() => {
        for (const streamOutputChange of change.streamOutputChange!) {
          if ('delete' in streamOutputChange) {
            this._outputs.removeStreamOutput(streamOutputChange.delete!);
          }
          if ('insert' in streamOutputChange) {
            this._outputs.appendStreamOutput(
              streamOutputChange.insert!.toString()
            );
          }
        }
      });
    }

    if (change.outputsChange) {
      globalModelDBMutex(() => {
        let retain = 0;
        for (const outputsChange of change.outputsChange!) {
          if ('retain' in outputsChange) {
            retain += outputsChange.retain!;
          }
          if ('delete' in outputsChange) {
            for (let i = 0; i < outputsChange.delete!; i++) {
              this._outputs.remove(retain);
            }
          }
          if ('insert' in outputsChange) {
            // Inserting an output always results in appending it.
            for (const output of outputsChange.insert!) {
              // For compatibility with older ydoc where a plain object,
              // (rather than a Map instance) could be provided.
              // In a future major release the use of Map will be required.
              this._outputs.add('toJSON' in output ? output.toJSON() : output);
            }
          }
        }
      });
    }

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

    if (change.executionStateChange) {
      this.stateChanged.emit({
        name: 'executionState',
        oldValue: change.executionStateChange.oldValue,
        newValue: change.executionStateChange.newValue
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

  private _executedCode = '';
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
  export interface IOptions
    extends Omit<CellModel.IOptions<ISharedCodeCell>, 'cell_type'> {
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
