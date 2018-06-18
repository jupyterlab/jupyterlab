/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONExt, JSONValue
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IAttachmentsModel, AttachmentsModel
} from '@jupyterlab/attachments';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  IChangedArgs, nbformat, uuid
} from '@jupyterlab/coreutils';

import {
  IObservableJSON, IModelDB, IObservableValue, ObservableValue
} from '@jupyterlab/observables';

import {
  IOutputAreaModel, OutputAreaModel
} from '@jupyterlab/outputarea';


/**
 * The definition of a model object for a cell.
 */
export
interface ICellModel extends CodeEditor.IModel {
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

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell;
}

/**
 * The definition of a model cell object for a cell with attachments.
 */
export
interface IAttachmentsCellModel extends ICellModel {
  /**
   * The cell attachments
   */
  readonly attachments: IAttachmentsModel;
}


/**
 * The definition of a code cell.
 */
export
interface ICodeCellModel extends ICellModel {
  /**
   * The type of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  readonly type: 'code';

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  executionCount: nbformat.ExecutionCount;

  /**
   * The cell outputs.
   */
  readonly outputs: IOutputAreaModel;
}


/**
 * The definition of a markdown cell.
 */
export
interface IMarkdownCellModel extends IAttachmentsCellModel {
  /**
   * The type of the cell.
   */
  readonly type: 'markdown';
 }


/**
 * The definition of a raw cell.
 */
export
interface IRawCellModel extends IAttachmentsCellModel {
  /**
   * The type of the cell.
   */
  readonly type: 'raw';
}


/**
 * An implementation of the cell model.
 */
export
class CellModel extends CodeEditor.Model implements ICellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  constructor(options: CellModel.IOptions) {
    super({modelDB: options.modelDB});

    this.id = options.id || uuid();

    this.value.changed.connect(this.onGenericChange, this);

    let cellType = this.modelDB.createValue('type');
    cellType.set(this.type);

    let observableMetadata = this.modelDB.createMap('metadata');
    observableMetadata.changed.connect(this.onGenericChange, this);

    let cell = options.cell;
    let trusted = this.modelDB.createValue('trusted');
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
    let metadata = JSONExt.deepCopy(cell.metadata);
    if (this.type !== 'raw') {
      delete metadata['format'];
    }
    if (this.type !== 'code') {
      delete metadata['collapsed'];
      delete metadata['scrolled'];
    }

    for (let key in metadata) {
      observableMetadata.set(key, metadata[key]);
    }
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
    let oldValue = this.trusted;
    if (oldValue === newValue) {
      return;
    }
    this.modelDB.setValue('trusted', newValue);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICell {
    let metadata: nbformat.IBaseCellMetadata = Object.create(null);
    for (let key of this.metadata.keys()) {
      let value = JSON.parse(JSON.stringify(this.metadata.get(key)));
      metadata[key] = value as JSONValue;
    }
    if (this.trusted) {
      metadata['trusted'] = true;
    }
    return {
      cell_type: this.type,
      source: this.value.text,
      metadata,
    } as nbformat.ICell;
  }

  /**
   * Handle a change to the trusted state.
   *
   * The default implementation is a no-op.
   */
  onTrustedChanged(trusted: IObservableValue, args: ObservableValue.IChangedArgs): void { /* no-op */ }

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
export
namespace CellModel {
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
export
class AttachmentsCellModel extends CellModel {

  /**
   * Construct a new cell with optional attachments.
   */
  constructor(options: AttachmentsCellModel.IOptions) {
    super(options);
    let factory = (options.contentFactory ||
      AttachmentsCellModel.defaultContentFactory
    );
    let attachments: nbformat.IAttachments | undefined;
    let cell = options.cell;
    if (cell && (cell.cell_type === 'raw' || cell.cell_type === 'markdown')) {
      attachments = (cell as (nbformat.IRawCell | nbformat.IMarkdownCell)).attachments;
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
    let cell = super.toJSON() as (nbformat.IRawCell | nbformat.IMarkdownCell);
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
export
namespace AttachmentsCellModel {
  /**
   * The options used to initialize a `AttachmentsCellModel`.
   */
  export
  interface IOptions extends CellModel.IOptions {
    /**
     * The factory for attachment model creation.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A factory for creating code cell model content.
   */
  export
  interface IContentFactory {
    /**
     * Create an output area.
     */
    createAttachmentsModel(options: IAttachmentsModel.IOptions): IAttachmentsModel;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create an attachments model.
     */
    createAttachmentsModel(options: IAttachmentsModel.IOptions): IAttachmentsModel {
      return new AttachmentsModel(options);
    }
  }

  /**
   * The shared `ContentFactory` instance.
   */
  export
  const defaultContentFactory = new ContentFactory();
}


/**
 * An implementation of a raw cell model.
 */
export
class RawCellModel extends AttachmentsCellModel {
  /**
   * The type of the cell.
   */
  get type(): 'raw' {
    return 'raw';
  }
}


/**
 * An implementation of a markdown cell model.
 */
export
class MarkdownCellModel extends AttachmentsCellModel {
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
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends CellModel implements ICodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  constructor(options: CodeCellModel.IOptions) {
    super(options);
    let factory = (options.contentFactory ||
      CodeCellModel.defaultContentFactory
    );
    let trusted = this.trusted;
    let cell = options.cell as nbformat.ICodeCell;
    let outputs: nbformat.IOutput[] = [];
    let executionCount = this.modelDB.createValue('executionCount');
    if (!executionCount.get()) {
      if (cell && cell.cell_type === 'code') {
        executionCount.set(cell.execution_count || null);
        outputs = cell.outputs;
      } else {
        executionCount.set(null);
      }
    }
    executionCount.changed.connect(this._onExecutionCountChanged, this);

    this._outputs = factory.createOutputArea({
      trusted,
      values: outputs,
      modelDB: this.modelDB
    });
    this._outputs.changed.connect(this.onGenericChange, this);
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
    return this.modelDB.getValue('executionCount') as nbformat.ExecutionCount;
  }
  set executionCount(newValue: nbformat.ExecutionCount) {
    let oldValue = this.executionCount;
    if (newValue === oldValue) {
      return;
    }
    this.modelDB.setValue('executionCount', newValue || null);
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
    this._outputs = null;
    super.dispose();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.ICodeCell {
    let cell = super.toJSON() as nbformat.ICodeCell;
    cell.execution_count = this.executionCount || null;
    cell.outputs = this.outputs.toJSON();
    return cell;
  }

  /**
   * Handle a change to the trusted state.
   */
  onTrustedChanged(trusted: IObservableValue, args: ObservableValue.IChangedArgs): void {
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
   * Handle a change to the execution count.
   */
  private _onExecutionCountChanged(count: IObservableValue, args: ObservableValue.IChangedArgs): void {
    this.contentChanged.emit(void 0);
    this.stateChanged.emit({
      name: 'executionCount',
      oldValue: args.oldValue,
      newValue: args.newValue });
  }


  private _outputs: IOutputAreaModel = null;
}


/**
 * The namespace for `CodeCellModel` statics.
 */
export
namespace CodeCellModel {
  /**
   * The options used to initialize a `CodeCellModel`.
   */
  export
  interface IOptions extends CellModel.IOptions {
    /**
     * The factory for output area model creation.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A factory for creating code cell model content.
   */
  export
  interface IContentFactory {
    /**
     * Create an output area.
     */
    createOutputArea(options: IOutputAreaModel.IOptions): IOutputAreaModel;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
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
  export
  const defaultContentFactory = new ContentFactory();
}
