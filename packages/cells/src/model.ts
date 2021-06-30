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

import * as models from '@jupyterlab/shared-models';

import { UUID } from '@lumino/coreutils';

import {
  IModelDB,
  IObservableJSON,
  IObservableMap,
  IObservableValue,
  ObservableValue
} from '@jupyterlab/observables';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';

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
  readonly metadata: IObservableJSON;

  readonly sharedModel: models.ISharedCell & models.ISharedText;

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
      id: options.id || (options.cell?.id as string) || UUID.uuid4()
    });

    this.value.changed.connect(this.onGenericChange, this);

    const cellType = this.modelDB.createValue('type');
    cellType.set(this.type);

    const observableMetadata = this.modelDB.createMap('metadata');
    observableMetadata.changed.connect(this.onModelDBMetadataChange, this);
    observableMetadata.changed.connect(this.onGenericChange, this);

    const cell = options.cell;
    const trusted = this.modelDB.createValue('trusted');
    trusted.changed.connect(this.onTrustedChanged, this);

    if (!cell) {
      trusted.set(false);
      return;
    }
    trusted.set(!!cell.metadata['trusted']);
    delete cell.metadata['trusted'];

    if (Array.isArray(cell.source)) {
      this.value.text = (cell.source as string[]).join('');
    } else {
      this.value.text = cell.source as string;
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
      observableMetadata.set(key, metadata[key]);
    }
  }

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
   * Handle a change to the cell metadata modelDB and reflect it in the shared model.
   */
  protected onModelDBMetadataChange(
    sender: IObservableJSON,
    event: IObservableJSON.IChangedArgs
  ): void {
    const metadata = this.sharedModel.getMetadata();
    this._modelDBMutex(() => {
      switch (event.type) {
        case 'add':
          this._changeCellMetadata(metadata, event);
          break;
        case 'change':
          this._changeCellMetadata(metadata, event);
          break;
        case 'remove':
          delete metadata[event.key];
          break;
        default:
          throw new Error(`Invalid event type: ${event.type}`);
      }
      this.sharedModel.setMetadata(metadata);
    });
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

  /**
   * Handle a change to the cell shared model and reflect it in modelDB.
   * We update the modeldb metadata when the shared model changes.
   *
   * This method overrides the CodeEditor protected _onSharedModelChanged
   * so we first call super._onSharedModelChanged
   *
   * @override CodeEditor._onSharedModelChanged
   */
  protected _onSharedModelChanged(
    sender: models.ISharedCodeCell,
    change: models.CellChange<models.ISharedBaseCellMetadata>
  ): void {
    super._onSharedModelChanged(sender, change);
    this._modelDBMutex(() => {
      if (change.metadataChange) {
        const newValue = change.metadataChange
          ?.newValue as models.ISharedBaseCellMetadata;
        if (newValue) {
          Object.keys(newValue).map(key => {
            switch (key) {
              case 'collapsed':
                this.metadata.set('collapsed', newValue.jupyter);
                break;
              case 'jupyter':
                this.metadata.set('jupyter', newValue.jupyter);
                break;
              case 'name':
                this.metadata.set('name', newValue.name);
                break;
              case 'scrolled':
                this.metadata.set('scrolled', newValue.scrolled);
                break;
              case 'tags':
                this.metadata.set('tags', newValue.tags);
                break;
              case 'trusted':
                this.metadata.set('trusted', newValue.trusted);
                break;
              default:
                // The default is applied for custom metadata that are not
                // defined in the official nbformat but which are defined
                // by the user.
                this.metadata.set(key, newValue[key]);
            }
          });
        }
      }
    });
  }

  /**
   * Handle a change to the observable value.
   */
  protected onGenericChange(): void {
    this.contentChanged.emit(void 0);
  }

  /**
   * A mutex to update the shared model.
   */
  protected readonly _modelDBMutex = models.createMutex();
  sharedModel: models.ISharedCell;
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
    const executionCount = this.modelDB.createValue('executionCount');
    if (!executionCount.get()) {
      if (cell && cell.cell_type === 'code') {
        executionCount.set(cell.execution_count || null);
        outputs = cell.outputs ?? [];
        // If output is not empty presume it results of the input code execution
        // TODO load from the notebook file when the dirty state is stored in it
        if (outputs.length > 0) {
          this._executedCode = this.value.text.trim();
        }
      } else {
        executionCount.set(null);
      }
    }
    executionCount.changed.connect(this._onExecutionCountChanged, this);

    this._modelDBMutex(() => {
      const sharedCell = this.sharedModel as models.ISharedCodeCell;
      sharedCell.setOutputs(outputs);
    });
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

  public switchSharedModel(
    sharedModel: models.ISharedCodeCell,
    reinitialize?: boolean
  ): void {
    if (reinitialize) {
      this.clearExecution();
      sharedModel.getOutputs().forEach(output => this._outputs.add(output));
    }
    super.switchSharedModel(sharedModel, reinitialize);
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
    return this.modelDB.has('executionCount')
      ? (this.modelDB.getValue('executionCount') as nbformat.ExecutionCount)
      : null;
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    const oldValue = this.executionCount;
    if (newValue === oldValue) {
      return;
    }
    this.modelDB.setValue('executionCount', newValue || null);
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
    const codeCell = this.sharedModel as models.YCodeCell;
    this._modelDBMutex(() => {
      switch (event.type) {
        case 'add': {
          const outputs = event.newValues.map(output => output.toJSON());
          codeCell.updateOutputs(
            event.newIndex,
            event.newIndex + outputs.length,
            outputs
          );
          break;
        }
        case 'set': {
          const newValues = event.newValues.map(output => output.toJSON());
          codeCell.updateOutputs(
            event.oldIndex,
            event.oldValues.length,
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
   * Handle a change to the observable value.
   */
  protected onGenericChange(): void {
    if (this.executionCount !== null) {
      this._setDirty(this._executedCode !== this.value.text.trim());
    }
    this.contentChanged.emit(void 0);
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
    sender: models.ISharedCodeCell,
    change: models.CellChange<models.ISharedBaseCellMetadata>
  ): void {
    super._onSharedModelChanged(sender, change);
    this._modelDBMutex(() => {
      if (change.outputsChange) {
        this.clearExecution();
        sender.getOutputs().forEach(output => this._outputs.add(output));
      }

      if (change.executionCountChange) {
        this.executionCount = change.executionCountChange.newValue
          ? change.executionCountChange.newValue
          : null;
      }
    });
  }

  /**
   * Handle a change to the execution count.
   */
  private _onExecutionCountChanged(
    count: IObservableValue,
    args: ObservableValue.IChangedArgs
  ): void {
    const codeCell = this.sharedModel as models.YCodeCell;
    this._modelDBMutex(() => {
      codeCell.execution_count = args.newValue
        ? (args.newValue as number)
        : null;
    });
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
    metadata: IObservableJSON,
    args: IObservableMap.IChangedArgs<JSONValue>
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
