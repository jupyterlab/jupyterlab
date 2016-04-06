// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  shallowEquals
} from 'jupyter-js-utils';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  IInputAreaModel
} from '../input-area';

import {
  CellType
} from '../notebook/nbformat';

import {
  IOutputAreaModel
} from '../output-area';


/**
 * The scrolled setting of a cell.
 */
export
type ScrollSetting = boolean | 'auto';


/**
 * The definition of a model object for a base cell.
 */
export
interface IBaseCellModel extends IDisposable {
  /**
   * The type of cell.
   */
  type: CellType;

  /**
   * The cell's name. If present, must be a non-empty string.
   */
  name?: string;

  /**
   * The cell's tags. Tags must be unique, and must not contain commas.
   */
  tags?: string[];

  /**
   * A signal emitted when state of the cell changes.
   */
  stateChanged: ISignal<IBaseCellModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a user metadata state changes.
   */
  metadataChanged: ISignal<IBaseCellModel, string>;

  /**
   * The input area of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  input: IInputAreaModel;

  /**
   * Whether the cell is trusted.
   *
   * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
   */
  trusted: boolean;

  /**
   * Whether the cell is read only.
   */
  readOnly: boolean;

  /**
   * Get a metadata cursor for the cell.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the cell.
   */
  getMetadata(name: string): IMetadataCursor;

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): string[];
}


/**
 * The definition of a code cell.
 */
export
interface ICodeCellModel extends IBaseCellModel {
  /**
   * Execution, display, or stream outputs.
   */
  output: IOutputAreaModel;

  /**
   * The code cell's prompt number. Will be null if the cell has not been run.
   */
  executionCount: number;

  /**
   * Whether the cell is collapsed/expanded.
   */
  collapsed?: boolean;

  /**
   * Whether the cell's output is scrolled, unscrolled, or autoscrolled.
   */
  scrolled?: ScrollSetting;
}


/**
 * The definition of a raw cell.
 */
export
interface IRawCellModel extends IBaseCellModel {
  /**
   * Raw cell metadata format for nbconvert.
   */
  format?: string;
}


/**
 * The definition of a markdown cell.
 */
export
interface IMarkdownCellModel extends IBaseCellModel {
  /**
   * Whether the cell is rendered.
   */
  rendered: boolean;
}



/**
 * A model consisting of any valid cell type.
 */
export
type ICellModel =  (
  IRawCellModel | IMarkdownCellModel | ICodeCellModel
);


/**
 * An implemention of the base cell Model.
 */
export
class BaseCellModel implements IBaseCellModel {
  /**
   * Construct a new base cell model.
   */
  constructor(input: IInputAreaModel) {
    this._input = input;
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<IBaseCellModel, IChangedArgs<any>> {
    return CellModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a user metadata state changes.
   *
   * #### Notes
   * The signal argument is the namespace of the metadata that changed.
   */
  get metadataChanged(): ISignal<IBaseCellModel, string> {
    return CellModelPrivate.metadataChangedSignal.bind(this);
  }

  /**
   * Get the input area model.
   */
  get input(): IInputAreaModel {
    return this._input;
  }

  /**
   * The read only state of the cell.
   *
   * #### Notes
   * This is a delegate to the read only state of the [input].
   */
  get readOnly(): boolean {
    return this.input.readOnly;
  }
  set readOnly(value: boolean) {
    this.input.readOnly = value;
  }

  /**
   * The trusted state of the cell.
   *
   * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(value: boolean) {
    if (value === this._trusted) {
      return;
    }
    let prev = this._trusted;
    this._trusted = value;
    this.onTrustChanged(value);
    this.stateChanged.emit({
      name: 'trusted',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The name of the cell.
   */
  get name(): string {
    return this._name;
  }
  set name(value: string) {
    if (value === this._name) {
      return;
    }
    let prev = this._name;
    this._name = value;
    this.stateChanged.emit({
      name: 'name',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The tags for the cell.
   */
  get tags(): string[] {
    return JSON.parse(this._tags);
  }
  set tags(value: string[]) {
    let prev = JSON.parse(this._tags);
    if (shallowEquals(prev, value)) {
      return;
    }
    this._tags = JSON.stringify(value);
    this.stateChanged.emit({
      name: 'tags',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._input === null;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._input.dispose();
    this._input = null;
  }

  /**
   * Get a metadata cursor for the cell.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the cell.
   */
  getMetadata(name: string): IMetadataCursor {
    let blacklist = ['tags', 'name', 'trusted', 'collapsed', 'scrolled',
                     'execution_count', 'format'];
    if (blacklist.indexOf(name) !== -1) {
      let key = blacklist[blacklist.indexOf(name)];
      throw Error(`Use model attribute for ${key} directly`);
    }
    return new MetadataCursor(
      name,
      this._metadata[name],
      this._cursorCallback
    );
  }

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): string[] {
    return Object.keys(this._metadata);
  }

  /**
   * Handle changes to cell trust.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected onTrustChanged(value: boolean): void {

  }

  /**
   * The singleton callback for cursor change events.
   */
  private _cursorCallback(name: string, value: string): void {
    this._metadata[name] = value;
    this.metadataChanged.emit(name);
  }

  /**
   * The type of cell.
   */
  type: CellType;

  private _input: IInputAreaModel = null;
  private _tags = '';
  private _name = '';
  private _trusted = false;
  private _metadata: { [key: string]: string } = Object.create(null);
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends BaseCellModel implements ICodeCellModel {
  /**
   * Construct a new code cell model.
   */
  constructor(input: IInputAreaModel, output: IOutputAreaModel) {
    super(input);
    this._output = output;
    this.input.prompt = 'In [ ]:';
  }

  /**
   * Get the output area model.
   */
  get output(): IOutputAreaModel {
    return this._output;
  }

  /**
   * Handle changes to cell trust.
   *
   * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
   */
  protected onTrustChanged(value: boolean): void {
    this.output.trusted = value;
  }

  /**
   * The execution count.
   */
  get executionCount(): number {
    return this._executionCount;
  }
  set executionCount(value: number) {
    if (this._executionCount === value) {
      return;
    }
    let prev = this._executionCount;
    this._executionCount = value;
    this.input.prompt = `In [${value === null ? ' ' : value}]:`;
    this.stateChanged.emit({
      name: 'executionCount',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * Whether the cell is collapsed/expanded.
   */
  get collapsed(): boolean {
    return this._collapsed;
  }
  set collapsed(value: boolean) {
    if (this._collapsed === value) {
      return;
    }
    let prev = this._collapsed;
    this._collapsed = value;
    this.stateChanged.emit({
      name: 'collapsed',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * Whether the cell's output is scrolled, unscrolled, or autoscrolled.
   */
  get scrolled(): ScrollSetting {
    return this._scrolled;
  }
  set scrolled(value: ScrollSetting) {
    if (this._scrolled === value) {
      return;
    }
    let prev = this._scrolled;
    this._scrolled = value;
    this.stateChanged.emit({
      name: 'scrolled',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    this._output = null;
    super.dispose();
  }

  type: CellType = 'code';

  private _output: IOutputAreaModel = null;
  private _scrolled: ScrollSetting = false;
  private _collapsed = false;
  private _executionCount = -1;
}


/**
 * An implementation of a Markdown cell Model.
 */
export
class MarkdownCellModel extends BaseCellModel implements IMarkdownCellModel {
  /**
   * Whether we should display a rendered representation.
   */
  get rendered() {
    return this._rendered;
  }
  set rendered(value: boolean) {
    if (this._rendered === value) {
      return;
    }
    let prev = this._rendered;
    this._rendered = value;
    this.stateChanged.emit({
      name: 'rendered',
      oldValue: prev,
      newValue: value
    });
  }

  type: CellType = 'markdown';
  private _rendered = true;
}


/**
 * An implementation of a Raw cell Model.
 */
export
class RawCellModel extends BaseCellModel implements IRawCellModel {
  /**
   * The raw cell metadata format for nbconvert.
   */
  get format(): string {
    return this._format;
  }
  set format(value: string) {
    if (this._format === value) {
      return;
    }
    let prev = this._format;
    this._format = value;
    this.stateChanged.emit({
      name: 'format',
      oldValue: prev,
      newValue: value
    });
  }

  type: CellType = 'raw';
  private _format = '';
}


/**
  * A type guard for testing if a cell model is a markdown cell.
  */
export
function isMarkdownCellModel(m: ICellModel): m is IMarkdownCellModel {
  return (m.type === 'markdown');
}

/**
  * A type guard for testing if a cell is a code cell.
  */
export
function isCodeCellModel(m: ICellModel): m is ICodeCellModel {
  return (m.type === 'code');
}

/**
  * A type guard for testing if a cell is a raw cell.
  */
export
function isRawCellModel(m: ICellModel): m is IRawCellModel {
  return (m.type === 'raw');
}


/**
 * A namespace for cell private data.
 */
namespace CellModelPrivate {
  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const stateChangedSignal = new Signal<IBaseCellModel, IChangedArgs<any>>();

  /**
   * A signal emitted when a user metadata state changes.
   */
  export
  const metadataChangedSignal = new Signal<IBaseCellModel, string>();
}



/**
 * A class used to interact with user level metadata.
 */
export
interface IMetadataCursor {
  /**
   * The metadata namespace.
   */
  name: string;

  /**
   * Get the value of the metadata.
   */
  getValue(): any;

  /**
   * Set the value of the metdata.
   */
  setValue(value: any): void;
}


/**
 * An implementation of a metadata cursor.
 */
export
class MetadataCursor implements IMetadataCursor {

  /**
   * Construct a new metadata cursor.
   *
   * @param name - the metadata namespace key.
   *
   * @param value - this initial value of the namespace.
   *
   * @param cb - a change callback.
   */
  constructor(name: string, value: string, cb: (name: string, value: string) => void) {
    this._name = name;
    this._value = value || 'null';
    this._cb = cb;
  }

  /**
   * Get the namespace key of the metadata.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the value of the namespace data.
   */
  getValue(): any {
    return JSON.parse(this._value);
  }

  /**
   * Set the value of the namespace data.
   */
  setValue(value: string): any {
    let prev = this._value;
    if (prev === value) {
      return;
    }
    this._value = JSON.stringify(value);
    let cb = this._cb;
    cb(this._name, this._value);
  }

  private _value = 'null';
  private _name = '';
  private _cb: (name: string, value: string) => void = null;
}
