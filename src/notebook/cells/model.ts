// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IInputAreaModel, IInputAreaOptions, InputAreaModel
} from '../input-area';
import {
  IOutputAreaModel, OutputAreaModel
} from '../output-area';

import {
  IObservableList
} from 'phosphor-observablelist';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


/**
 * A type which describes the type of cell.
 */
export
type CellType = "code" | "markdown" | "raw";


/**
 * An object which is serializable.
 */
export
interface ISerializable {
  toJSON(): any;
  fromJSON(data: any): void;
}


/**
 * The options for creating a cell.
 */
export
interface ICellOptions extends IInputAreaOptions {
}


/**
 * The definition of a model object for a base cell.
 */
export
interface IBaseCellModel {

  /**
   * The type of cell.
   */
  type: CellType;

  /**
   * Tags applied to the cell.
   */
  tags?: IObservableList<string>;

  /**
   * A signal emitted when state of the cell changes.
   */
  stateChanged: ISignal<IBaseCellModel, IChangedArgs<any>>;

  /**
   * A signal emitted when the cell is selected.
   */
  selected: ISignal<IBaseCellModel, void>;

  /**
   * Get namespaced metadata about the cell.
   */
  //getMetadata(namespace: string) : IObservableMap<string, ISerializable>;

  /**
   * The input area of the cell.
   *
   * #### Notes
   * This is a read-only property.
   */
  input: IInputAreaModel;

  /**
   * The dirty state of the cell.
   */
  dirty: boolean;

  /**
   * Whether the cell is read only.
   */
  readOnly: boolean;

  /**
   * Select the cell model.
   */
  select(): void;

  /**
   * Whether a cell is deletable.
   */
  //deleteable: boolean;

  /**
   * Whether a cell is mergable.
   */
  //mergeable: boolean;

  /**
   * Whether a cell is splittable.
   */
  //splittable: boolean;

  /**
   * Whether the cell is marked for applying commands
   */
  //marked: boolean;

}


/**
 * The definition of a code cell.
 */
export
interface ICodeCellModel extends IBaseCellModel {
  output: IOutputAreaModel;
  executionCount: number;
}


/**
 * The definition of a raw cell.
 */
export
interface IRawCellModel extends IBaseCellModel {
  /**
   * The raw cell format.
   */
  format?: string;
}


/**
 * The definition of a markdown cell.
 */
export
interface IMarkdownCellModel extends IBaseCellModel {
  /**
   * Whether a cell is rendered.
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
  constructor(options?: ICellOptions) {
    let input = new InputAreaModel(options);
    Private.inputProperty.set(this, input);
    input.stateChanged.connect(this._inputChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<IBaseCellModel, IChangedArgs<any>> {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the cell is selected.
   */
  get selected(): ISignal<IBaseCellModel, void> {
    return Private.selectedSignal.bind(this);
  }

  /**
   * Get the input area model.
   */
  get input(): IInputAreaModel {
    return Private.inputProperty.get(this);
  }

  /**
   * Get the dirty state of the cell.
   *
   * #### Notes
   * This is a delegate to the dirty state of the [input].
   */
  get dirty(): boolean {
    return this.input.dirty;
  }

  /**
   * Set the dirty state of the cell.
   *
   * #### Notes
   * This is a delegate to the dirty state of the [input].
   */
  set dirty(value: boolean) {
    this.input.dirty = value;
  }

  /**
   * Get the read only state of the cell.
   *
   * #### Notes
   * This is a delegate to the read only state of the [input].
   */
  get readOnly(): boolean {
    return this.input.readOnly;
  }

  /**
   * Set the read only state of the cell.
   *
   * #### Notes
   * This is a delegate to the read only state of the [input].
   */
  set readOnly(value: boolean) {
    this.input.readOnly = value;
  }

  /**
   * Select the cell model.
   */
  select(): void {
    this.selected.emit(void 0);
    this.input.textEditor.select();
  }

  /**
   * The type of cell.
   */
  type: CellType;

  /**
   * Re-emit changes to the input dirty state.
   */
  private _inputChanged(input: IInputAreaModel, args: IChangedArgs<any>): void {
    if (args.name === 'dirty' || args.name === 'readOnly') {
      this.stateChanged.emit(args);
    }
  }
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends BaseCellModel implements ICodeCellModel {
  /**
   * Construct a new code cell model.
   */
  constructor(options?: ICellOptions) {
    super(options);
    Private.outputProperty.set(this, new OutputAreaModel());
  }

  /**
   * Get the output area model.
   */
  get output(): IOutputAreaModel {
    return Private.outputProperty.get(this);
  }

  /**
   * Get the execution count.
   */
  get executionCount(): number {
    return Private.executionCountProperty.get(this);
  }

  /**
   * Set the execution count.
   */
  set executionCount(value: number) {
    Private.executionCountProperty.set(this, value);
  }

  type: CellType = "code";
}


/**
 * An implementation of a Markdown cell Model.
 */
export
class MarkdownCellModel extends BaseCellModel implements IMarkdownCellModel {
  /**
   * Get whether we should display a rendered representation.
   */
  get rendered() {
    return Private.renderedProperty.get(this);
  }

  /**
   * Get whether we should display a rendered representation.
   */
  set rendered(value: boolean) {
    Private.renderedProperty.set(this, value);
  }

  /**
   * Select the cell model.
   */
  select(): void {
    this.selected.emit(void 0);
    if (!this.rendered) this.input.textEditor.select();
  }

  type: CellType = "markdown";
}


/**
  * A type guard for testing if a cell model is a markdown cell.
  */
export
function isMarkdownCellModel(m: ICellModel): m is IMarkdownCellModel {
  return (m.type === "markdown");
}

/**
  * A type guard for testing if a cell is a code cell.
  */
export
function isCodeCellModel(m: ICellModel): m is ICodeCellModel {
  return (m.type === "code");
}

/**
  * A type guard for testing if a cell is a raw cell.
  */
export
function isRawCellModel(m: ICellModel): m is IRawCellModel {
  return (m.type === "raw");
}


/**
 * A namespace for cell private data.
 */
namespace Private {

  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const stateChangedSignal = new Signal<IBaseCellModel, IChangedArgs<any>>();

  /**
   * A signal emitted when a cell model is selected.
   */
  export
  const selectedSignal = new Signal<IBaseCellModel, void>();

  /**
   * A property descriptor for the input area model.
   */
  export
  const inputProperty = new Property<IBaseCellModel, IInputAreaModel>({
    name: 'input',
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor holding the output area model.
  */
  export
  const outputProperty = new Property<CodeCellModel, IOutputAreaModel>({
      name: 'output',
      notify: stateChangedSignal,
  });

  /**
   * A property descriptor which determines whether the input area should be rendered.
   */
  export
  const renderedProperty = new Property<MarkdownCellModel, boolean>({
    name: 'rendered',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor for the execution count of a code cell.
   */
  export
  const executionCountProperty = new Property<CodeCellModel, number>({
    name: 'executionCount',
    value: null,
    notify: stateChangedSignal,
  });
}
