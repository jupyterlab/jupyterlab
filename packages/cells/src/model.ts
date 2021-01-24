/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as Y from 'yjs';

import { JSONExt, JSONObject, JSONValue, UUID } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import { IAttachmentsModel, AttachmentsModel } from '@jupyterlab/attachments';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IChangedArgs } from '@jupyterlab/coreutils';

import * as nbformat from '@jupyterlab/nbformat';
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
   * A signal emitted when the metadata of the model changes.
   */
  readonly metadataChanged: ISignal<ICellModel, Y.YMapEvent<any>>;

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
  readonly ymeta: Y.Map<any>;
  readonly ytext: Y.Text;
  readonly ymodel: Y.Map<any>;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell;
  valueChanged: ISignal<ICellModel, Y.YTextEvent>;
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
export class CellModel implements ICellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  constructor(options: CellModel.IOptions) {
    if (options.cell && options.ymodel) {
      throw new Error(
        "You can set either an initialized ymodel or create a new cell using a `cell` property. You can't do both."
      );
    }
    const ymodel = options.ymodel || new Y.Map();
    this.ymodel = ymodel;
    this.yawareness = options.yawareness;
    if (options.ymodel) {
      this.ytext = ymodel.get('source');
      this.ymeta = ymodel.get('metadata');
      this.id = ymodel.get('id');
    } else {
      this.id = UUID.uuid4();
      ymodel.set('id', this.id);
      this.ytext = new Y.Text();
      ymodel.set('source', this.ytext);
      this.ymeta = new Y.Map();
      ymodel.set('metadata', this.ymeta);
      ymodel.set('cell_type', this.type);
      const cell = options.cell!;
      // @todo shouldn't this be join('\n') ?
      const source = Array.isArray(cell.source)
        ? cell.source.join('')
        : cell.source;
      if (source) {
        this.ytext.insert(0, source);
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
        this.ymeta.set(key, metadata[key]);
      }
    }
    this.ydoc = this.ymodel.doc!;
    this._onModelChanged = this._onModelChanged.bind(this);
    this.ymodel.observe(this._onModelChanged);
    this.ytext.observe(this._onValueChange);
    this._onMetadataChanged = this._onMetadataChanged.bind(this); // do this because we still want to use inheritance.
    this.ymeta.observe(this._onMetadataChanged);
  }

  readonly yawareness?: any;
  readonly ydoc: Y.Doc;
  readonly ymodel: Y.Map<any>;
  readonly ytext: Y.Text;
  readonly ymeta: Y.Map<any>;
  readonly id: string;
  private _isDisposed: boolean = false;
  private _mimeTypeChanged = new Signal<this, IChangedArgs<string>>(this);

  setValue(value: string): void {
    this.ytext.doc?.transact(() => {
      this.ytext.delete(0, this.ytext.length);
      this.ytext.insert(0, value);
    });
  }

  getValue(): string {
    return this.ytext.toString();
  }

  /**
   * A signal emitted when a mimetype changes.
   */
  get mimeTypeChanged(): ISignal<this, IChangedArgs<string>> {
    return this._mimeTypeChanged;
  }

  /**
   * A mime type of the model.
   */
  get mimeType(): string {
    return this.ymeta.get('mimeType') as string;
  }

  set mimeType(newValue: string) {
    const oldValue = this.mimeType;
    if (oldValue === newValue) {
      return;
    }
    this.ymeta.set('mimeType', newValue);
  }

  protected _onModelChanged(event: Y.YMapEvent<any>): void {
    // nop
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this.ymodel.unobserve(this._onModelChanged);
    this.ytext.unobserve(this._onValueChange);
    this.ymeta.unobserve(this._onMetadataChanged);
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
  readonly valueChanged = new Signal<this, Y.YTextEvent>(this);
  readonly metadataChanged = new Signal<this, Y.YMapEvent<any>>(this);

  /**
   * A signal emitted when a model state changes.
   */
  readonly stateChanged = new Signal<this, IChangedArgs<any>>(this);

  /**
   * Get the trusted state of the model.
   */
  get trusted(): boolean {
    return this.ymeta.get('trusted') || false;
  }

  /**
   * Set the trusted state of the model.
   */
  set trusted(newValue: boolean) {
    const oldValue = this.trusted;
    if (oldValue === newValue) {
      return;
    }
    this.ymeta.set('trusted', newValue);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell {
    const metadata: nbformat.IBaseCellMetadata = Object.create(null);
    for (const [key, value] of this.ymeta.entries()) {
      if (key !== 'trusted' || value === true) {
        // only set trusted as a property, if true
        metadata[key] = JSON.parse(JSON.stringify(value)) as JSONValue;
      }
    }
    return {
      cell_type: this.type,
      source: this.ytext.toString().split('\n'),
      metadata
    } as nbformat.ICell;
  }

  /**
   * Handle a change to the trusted state.
   *
   * The default implementation is a no-op.
   */
  onTrustedChanged(trusted: boolean): void {
    /* no-op */
  }

  protected _onMetadataChanged(event: Y.YMapEvent<any>): void {
    if (event.keysChanged.has('trusted')) {
      this.onTrustedChanged(this.ymeta.get('trusted'));
    }
    if (event.keysChanged.has('mimeType')) {
      this._mimeTypeChanged.emit({
        name: 'mimeType',
        oldValue: event.changes.keys.get('mimeType')?.oldValue as string,
        newValue: this.ymeta.get('mimeType') as string
      });
    }
    this.metadataChanged.emit(event);
    this.onGenericChange();
  }

  /**
   * Handle a change to the observable value.
   */
  private _onValueChange = (event: Y.YTextEvent): void => {
    this.valueChanged.emit(event);
    this.contentChanged.emit(void 0);
  };

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
   * The options used to initialize a `CellModel`.
   */
  export interface IOptions {
    /**
     * The source cell data.
     */
    cell?: nbformat.IBaseCell;
    ymodel?: Y.Map<any>;
    yawareness?: any;
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

    let yattachmentsModel;
    if (options.ymodel) {
      yattachmentsModel = options.ymodel.get('attachments');
    } else {
      yattachmentsModel = new Y.Map();
      this.ymodel.set('attachments', yattachmentsModel);
    }
    this._attachments = factory.createAttachmentsModel({
      values: attachments,
      ymodel: yattachmentsModel
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
    const factory =
      options.contentFactory || CodeCellModel.defaultContentFactory;
    const trusted = this.trusted;
    const cell = options.cell as nbformat.ICodeCell;
    let outputs: nbformat.IOutput[] = [];

    let youtputs;
    if (!options.ymodel) {
      if (cell && cell.cell_type === 'code') {
        this.ymodel.set('executionCount', cell.execution_count || null);
        if (cell.outputs) {
          outputs = cell.outputs;
        }
      } else {
        this.ymodel.set('executionCount', null);
      }
      youtputs = new Y.Array();
      this.ymodel.set('outputs', youtputs);
    } else {
      youtputs = this.ymodel.get('outputs');
    }

    this._outputs = factory.createOutputArea({
      trusted,
      values: outputs,
      ymodel: youtputs as Y.Array<any>
    });
    this._outputs.changed.connect(this.onGenericChange, this);

    // We keep `collapsed` and `jupyter.outputs_hidden` metadata in sync, since
    // they are redundant in nbformat 4.4. See
    // https://github.com/jupyter/nbformat/issues/137
    // @todo do we still need to fix this?
    /*
    // Sync `collapsed` and `jupyter.outputs_hidden` for the first time, giving
    // preference to `collapsed`.
    if (this.ymeta.has('collapsed')) {
      const collapsed = this.metadata.get('collapsed') as boolean | undefined;
      Private.collapseChanged(this.metadata, {
        type: 'change',
        key: 'collapsed',
        oldValue: collapsed,
        newValue: collapsed
      });
    } else if (this.ymeta.has('jupyter')) {
      const jupyter = this.ymeta.get('jupyter') as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        Private.collapseChanged(this.metadata, {
          type: 'change',
          key: 'jupyter',
          oldValue: jupyter,
          newValue: jupyter
        });
      }
    }
    */
  }

  protected _onMetadataChanged(event: Y.YMapEvent<any>): void {
    super._onMetadataChanged(event);
    Private.collapseChanged(this.ymeta, event);
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
    return (
      this.ymodel.get('executionCount') || (null as nbformat.ExecutionCount)
    );
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    const oldValue = this.executionCount;
    if (newValue === oldValue) {
      return;
    }
    this.ymodel.set('executionCount', newValue || null);
  }

  clearExecution(): void {
    this.outputs.clear();
    this.executionCount = null;
    this.ymeta.delete('execution');
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
    super.dispose();
    this._outputs.dispose();
    this._outputs = null!;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    const cell = super.toJSON() as nbformat.ICodeCell;
    cell.execution_count = this.executionCount || null;
    cell.outputs = this.outputs.toJSON();
    return cell;
  }

  /**
   * Handle a change to the trusted state.
   */
  onTrustedChanged(trusted: boolean): void {
    if (this._outputs) {
      this._outputs.trusted = trusted;
    }
    this.stateChanged.emit({
      name: 'trusted',
      oldValue: !trusted,
      newValue: trusted
    });
  }

  protected _onModelChanged(event: Y.YMapEvent<any>): void {
    super._onModelChanged(event);
    if (event.keysChanged.has('executionCount')) {
      this.contentChanged.emit(void 0);
      this.stateChanged.emit({
        name: 'executionCount',
        oldValue: event.changes.keys.get('executionCount')?.oldValue,
        newValue: this.ymodel.get('executionCount')
      });
    }
  }

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

/**
 * @todo Seems like every time `collapsed` is changed, every client will also change `outputs_hidden`.
 * While this is only a minor performance-drain, we should probably limit this event to local changes only,
 * or perform some kind of check only after a time.
 */
namespace Private {
  export function collapseChanged(
    ymeta: Y.Map<any>,
    event: Y.YMapEvent<any>
  ): void {
    if (event.keysChanged.has('collapsed')) {
      const jupyter = (ymeta.get('jupyter') || {}) as JSONObject;
      const { outputs_hidden, ...newJupyter } = JSON.parse(
        JSON.stringify(jupyter)
      );

      const newValue = ymeta.get('collapsed');
      if (outputs_hidden !== newValue) {
        if (newValue !== undefined) {
          newJupyter['outputs_hidden'] = newValue;
        }
        if (Object.keys(newJupyter).length === 0) {
          ymeta.delete('jupyter');
        } else {
          ymeta.set('jupyter', newJupyter);
        }
      }
    } else if (event.keysChanged.has('jupyter')) {
      const jupyter = (ymeta.get('jupyter') || {}) as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        ymeta.set('collapsed', jupyter.outputs_hidden);
      } else {
        ymeta.delete('collapsed');
      }
    }
  }
}
