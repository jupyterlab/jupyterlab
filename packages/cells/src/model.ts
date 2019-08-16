/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IAttachmentsModel, AttachmentsModel } from '@jupyterlab/attachments';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IChangedArgs, nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import {
  IObservableJSON,
  IModelDB,
  IObservableValue,
  ObservableValue,
  IObservableMap
} from '@jupyterlab/observables';

import { IOutputAreaModel, OutputAreaModel } from '@jupyterlab/outputarea';

import { IOutputModel } from '@jupyterlab/rendermime';

import {
  JSONExt,
  JSONObject,
  JSONValue,
  ReadonlyJSONValue,
  ReadonlyJSONObject,
  UUID
} from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  ListField,
  MapField,
  RegisterField,
  Schema
} from '@phosphor/datastore';

import { ISignal, Signal } from '@phosphor/signaling';

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
  readonly metadata: ReadonlyJSONObject;

  /**
   * The location the datastore in which this cell keeps its data.
   */
  readonly data: CellModel.DataLocation;

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
  readonly outputs: IOutputAreaModel.DataLocation;
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
    super(Private.createEditorOptions(options));

    this.id = options.id || UUID.uuid4();
    this.data = options.data;

    this.data.record.datastore.changed.connect(this.onGenericChange, this);

    // Get the intitial data for the model.
    const cell = options.cell;
    let trusted = false;
    let metadata: JSONObject = {};
    let text = '';
    if (cell) {
      metadata = JSONExt.deepCopy(cell.metadata);
      trusted = !!metadata['trusted'];
      delete metadata['trusted'];

      if (this.type !== 'raw') {
        delete metadata['format'];
      }
      if (this.type !== 'code') {
        delete metadata['collapsed'];
        delete metadata['scrolled'];
      }

      if (Array.isArray(cell.source)) {
        text = (cell.source as string[]).join('');
      } else {
        text = cell.source as string;
      }
    }
    // Set the intitial data for the model.
    DatastoreExt.withTransaction(this.record.datastore, () => {
      DatastoreExt.updateRecord(this.record, {
        type: this.type,
        metadata,
        trusted,
        text: { index: 0, remove: 0, text }
      });
    });
  }

  /**
   * The type of cell.
   */
  readonly type: nbformat.CellType;

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
  readonly id: string;

  /**
   * The data in the datastore in which this cell keeps its data.
   */
  readonly data: CellModel.DataLocation;

  /**
   * The metadata associated with the cell.
   */
  get metadata(): ReadonlyJSONObject {
    return DatastoreExt.getField({ ...this.data.record, field: 'metadata' });
  }

  /**
   * The trusted state of the model.
   */
  get trusted(): boolean {
    return DatastoreExt.getField({ ...this.data.record, field: 'trusted' });
  }
  set trusted(newValue: boolean) {
    let oldValue = this.trusted;
    if (oldValue === newValue) {
      return;
    }
    DatastoreExt.withTransaction(this.record.datastore, () => {
      DatastoreExt.updateField({ ...this.record, field: 'trusted' }, newValue);
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell {
    let metadata = DatastoreExt.getField({
      ...this.record,
      field: 'metadata'
    }) as nbformat.IBaseCellMetadata;
    if (this.trusted) {
      metadata['trusted'] = true;
    }
    return {
      cell_type: this.type,
      source: this.value,
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
   * Handle a change to the observable value.
   */
  protected onGenericChange(): void {
    this.contentChanged.emit(void 0);
  }
}

/**
 * The namespace for `CellModel` statics.
 */
export namespace CellModel {
  /**
   * A type for the common fields stored in the Cell schema.
   */
  export interface IBaseFields extends CodeEditor.IFields {
    /**
     * The type of the cell.
     */
    type: RegisterField<nbformat.CellType>;

    /**
     * Whether the cell is trusted.
     */
    trusted: RegisterField<boolean>;

    /**
     * The metadata for the cell.
     */
    metadata: MapField<ReadonlyJSONValue>;
  }

  /**
   * A union interface for all the fields stored in cell schemas
   * so that they may be stored in the same table.
   */
  export interface IFields
    extends IBaseFields,
      CodeCellModel.IFields,
      AttachmentsCellModel.IFields {}

  /**
   * An interface for a cell schema.
   */
  export interface ISchema extends Schema {
    /**
     * The id for the schema.
     */
    id: '@jupyterlab/cells:cellmodel.v1';

    /**
     * The union of cell fields.
     */
    fields: IFields;
  }

  /**
   * A concrete schema for a cell table, available at runtime.
   */
  export const SCHEMA: ISchema = {
    /**
     * The id for the schema.
     */
    id: '@jupyterlab/cells:cellmodel.v1',

    /**
     * The union of cell fields.
     */
    fields: {
      attachments: Fields.Map<nbformat.IMimeBundle>(),
      executionCount: Fields.Register<nbformat.ExecutionCount>({ value: null }),
      metadata: Fields.Map<ReadonlyJSONValue>(),
      mimeType: Fields.String(),
      outputs: Fields.List<string>(),
      selections: Fields.Map<CodeEditor.ITextSelection[]>(),
      text: Fields.Text(),
      trusted: Fields.Boolean(),
      type: Fields.Register<nbformat.CellType>({ value: 'code' })
    }
  };

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

    /**
     * A record location in an existing datastore in which to store the model.
     */
    data?: DataLocation;
  }

  /**
   * The location of cell data in a datastore.
   */
  export type DataLocation = {
    /**
     * The record for the cell data.
     */
    record: DatastoreExt.RecordLocation<ISchema>;

    /**
     * A table in which outputs are stored.
     */
    outputs: DatastoreExt.TableLocation<IOutputModel.ISchema>;
  };
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
    let factory =
      options.contentFactory || AttachmentsCellModel.defaultContentFactory;
    let attachments: nbformat.IAttachments | undefined;
    let cell = options.cell;
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
    let cell = super.toJSON() as nbformat.IRawCell | nbformat.IMarkdownCell;
    if (this.attachments.length) {
      cell.attachments = this.attachments.toJSON();
    }
    return cell;
  }

  private _attachments: IAttachmentsModel | null = null;
}

/**
 * The namespace for `AttachmentsCellModel` statics.
 */
export namespace AttachmentsCellModel {
  /**
   * An interface for cell schema fields that can store attachments.
   */
  export interface IFields
    extends CellModel.IBaseFields,
      IAttachmentsModel.IFields {}

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
    return super.toJSON() as nbformat.IRawCell;
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
  constructor(options: CodeCellModel.IOptions) {
    super(options);
    let cell = options.cell as nbformat.ICodeCell;
    let outputs: nbformat.IOutput[] = [];

    DatastoreExt.withTransaction(this.record.datastore, () => {
      DatastoreExt.updateField(
        { ...this.record, field: 'executionCount' },
        cell.execution_count || null
      );
    });

    if (cell && cell.cell_type === 'code') {
      outputs = cell.outputs;
    }
    DatastoreExt.listenField(
      { ...this.record, field: 'executionCount' },
      this._onExecutionCountChanged,
      this
    );

    OutputAreaModel.fromJSON(this.data, outputs);
    DatastoreExt.listenRecord(this.data.record, this.onGenericChange, this);

    // We keep `collapsed` and `jupyter.outputs_hidden` metadata in sync, since
    // they are redundant in nbformat 4.4. See
    // https://github.com/jupyter/nbformat/issues/137
    /* DatastoreExt.listenField(
      { ...this.record, field: 'metadata' },
      Private.collapseChanged,
      this
    );

    // Sync `collapsed` and `jupyter.outputs_hidden` for the first time, giving
    // preference to `collapsed`.
    const metadata = DatastoreExt.getField({
      ...this.record,
      field: 'metadata'
    });
    if (metadata['collapsed']) {
      let collapsed = metadata['collapsed'];
      Private.collapseChanged(this.metadata, {
        type: 'change',
        key: 'collapsed',
        oldValue: collapsed,
        newValue: collapsed
      });
    } else if (this.metadata.has('jupyter')) {
      let jupyter = this.metadata.get('jupyter') as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        Private.collapseChanged(this.metadata, {
          type: 'change',
          key: 'jupyter',
          oldValue: jupyter,
          newValue: jupyter
        });
      }
    }*/
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
    return DatastoreExt.getField({
      ...this.data.record,
      field: 'executionCount'
    });
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    let oldValue = this.executionCount;
    if (newValue === oldValue) {
      return;
    }
    DatastoreExt.withTransaction(this.record.datastore, () => {
      DatastoreExt.updateField(
        { ...this.record, field: 'executionCount' },
        newValue || null
      );
    });
  }

  /**
   * The cell outputs.
   */
  get outputs(): IOutputAreaModel.DataLocation {
    return this.data;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    let cell = super.toJSON() as nbformat.ICodeCell;
    cell.execution_count = this.executionCount || null;
    cell.outputs = OutputAreaModel.toJSON(this.data);
    return cell;
  }

  /**
   * Handle a change to the trusted state.
   */
  onTrustedChanged(
    trusted: IObservableValue,
    args: ObservableValue.IChangedArgs
  ): void {
    OutputAreaModel.setTrusted(this.data, args.newValue as boolean);
    this.stateChanged.emit({
      name: 'trusted',
      oldValue: args.oldValue,
      newValue: args.newValue
    });
  }

  /**
   * Handle a change to the execution count.
   */
  private _onExecutionCountChanged(
    sender: Datastore,
    args: RegisterField.Change<nbformat.ExecutionCount>
  ): void {
    this.contentChanged.emit(void 0);
    this.stateChanged.emit({
      name: 'executionCount',
      oldValue: args.previous,
      newValue: args.current
    });
  }
}

/**
 * The namespace for `CodeCellModel` statics.
 */
export namespace CodeCellModel {
  /**
   * The schema type for code cell models.
   */
  export interface IFields extends CellModel.IBaseFields {
    /**
     * Execution count for the cell.
     */
    executionCount: RegisterField<nbformat.ExecutionCount>;

    /**
     * A list of output ids for the cell.
     */
    outputs: ListField<string>;
  }

  /**
   * The options used to initialize a `CodeCellModel`.
   */
  export interface IOptions extends CellModel.IOptions {
    /**
     * The datastore for the cell model data. If not provided, the cell
     * will create its own in-memory store.
     */
    datastore?: Datastore;

    /**
     * The record in the datastore in which to store cell data.
     */
    record?: DatastoreExt.RecordLocation<CellModel.ISchema>;
  }
}

namespace Private {
  /**
   * Given CellModel.IOptions, create a CodeEditor.IOptions.
   */
  export function createEditorOptions(
    options: CellModel.IOptions
  ): CodeEditor.Model.IOptions {
    if (options.data) {
      // Try to get the schema from the datastore to check if it exists.
      options.data.record.datastore.get(options.data.record.schema);
      return { record: options.data.record };
    } else {
      const datastore = Datastore.create({
        id: 1,
        schemas: [CellModel.SCHEMA, IOutputModel.SCHEMA]
      });
      const record: DatastoreExt.RecordLocation<CellModel.ISchema> = {
        datastore,
        schema: CellModel.SCHEMA,
        record: 'data'
      };
      return { ...options, record };
    }
  }

  export function collapseChanged(
    metadata: IObservableJSON,
    args: IObservableMap.IChangedArgs<JSONValue>
  ) {
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
