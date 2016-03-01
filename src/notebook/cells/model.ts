// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

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

import {
  IInputAreaModel, IInputAreaOptions, InputAreaModel
} from '../input-area';

import {
  CellType, ICell, ICodeCell, IRawCell, IMarkdownCell
} from '../notebook/nbformat';

import {
  IOutputAreaModel, OutputAreaModel
} from '../output-area';


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
interface IBaseCellModel extends ISerializable {
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
   * Whether the cell is selected.
   */
  selected: boolean;

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
   * Whether the cell is marked for applying commands.
   */
  marked: boolean;

  /**
   * Serialize the cell model.
   */
  toJSON(): ICell;

  /**
   * Populate from a JSON cell model.
   */
  fromJSON(data: ICell): void;
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
  scrolled?: boolean | 'auto';
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
   * Get whether the cell is selected.
   */
  get selected(): boolean {
    return Private.selectedProperty.get(this);
  }

  /**
   * Set whether the cell is selected.
   */
  set selected(value: boolean) {
    Private.selectedProperty.set(this, value);
  }

  /**
   * Get whether the cell is marked.
   */
  get marked(): boolean {
    return Private.markedProperty.get(this);
  }

  /**
   * Set whether the cell is marked.
   */
  set marked(value: boolean) {
    Private.markedProperty.set(this, value);
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
   * Get the name of the cell.
   */
  get name(): string {
    return Private.nameProperty.get(this);
  }

  /**
   * Set the name of the cell.
   */
  set name(value: string) {
    Private.nameProperty.set(this, value);
  }

  /**
   * Get the tags for the cell.
   */
  get tags(): string[] {
    return Private.tagsProperty.get(this);
  }

  /**
   * Set the tags for the cell.
   */
  set tags(value: string[]) {
    Private.tagsProperty.set(this, value);
  }

  /**
   * Serialize the cell model.
   */
  toJSON(): ICell {
    return {
      source: this.input.textEditor.text,
      cell_type: this.type,
      metadata: {
        tags: this.tags,
        name: this.name
      }
    }
  }

  /**
   * Populate from a JSON cell model.
   */
  fromJSON(data: ICell): void {
    let source = data.source as string;
    if (Array.isArray(data.source)) {
      source = (data.source as string[]).join('\n');
    }
    this.input.textEditor.text = source;
    this.tags = data.metadata.tags;
    this.name = data.metadata.name;
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

  /**
   * Get whether the cell is collapsed/expanded.
   */
  get collapsed(): boolean {
    return Private.collapsedProperty.get(this);
  }

  /**
   * Set whether the cell is collapsed/expanded.
   */
  set collapsed(value: boolean) {
    Private.collapsedProperty.set(this, value);
  }

  /**
   * Get whether the cell's output is scrolled, unscrolled, or autoscrolled.
   */
  get scrolled(): boolean | 'auto' {
    return Private.scrolledProperty.get(this);
  }

  /**
   * Set whether the cell's output is scrolled, unscrolled, or autoscrolled.
   */
  set scrolled(value: boolean | 'auto') {
    Private.scrolledProperty.set(this, value);
  }

  /**
   * Serialize the cell model.
   */
  toJSON(): ICodeCell {
    let value = super.toJSON() as ICodeCell;
    value.metadata.scrolled = this.scrolled;
    value.metadata.collapsed = this.collapsed;
    value.outputs = [];
    for (let i = 0; i < this.output.outputs.length; i++) {
      value.outputs.push(this.output.outputs.get(i));
    }
    value.execution_count = this.executionCount;
    return value;
  }

  /**
   * Populate from a JSON cell model.
   */
  fromJSON(data: ICodeCell): void {
    super.fromJSON(data);
    this.collapsed = data.metadata.collapsed;
    this.scrolled = data.metadata.scrolled;
    this.executionCount = data.execution_count;
    this.output.add.apply(null, data.outputs);
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
   * Populate from a JSON cell model.
   */
  fromJSON(data: IMarkdownCell): void {
    super.fromJSON(data);
    this.rendered = true;
  }

  type: CellType = "markdown";
}


/**
 * An implementation of a Raw cell Model.
 */
export
class RawCellModel extends BaseCellModel implements IRawCellModel {
  /**
   * Get the raw cell metadata format for nbconvert.
   */
  get format(): string {
    return Private.formatProperty.get(this);
  }

  /**
   * Get the raw cell metadata format for nbconvert.
   */
  set format(value: string) {
    Private.formatProperty.set(this, value);
  }

  /**
   * Serialize the cell model.
   */
  toJSON(): IRawCell {
    let value = super.toJSON() as IRawCell;
    value.metadata.format = this.format;
    return value;
  }

  /**
   * Populate from a JSON cell model.
   */
  fromJSON(data: IRawCell): void {
    super.fromJSON(data);
    this.format = data.metadata.format;
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
   * A property descriptor for the selected state of the cell.
   */
  export
  const selectedProperty = new Property<IBaseCellModel, boolean>({
    name: 'selected',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor for the marked state of the cell.
   */
  export
  const markedProperty = new Property<IBaseCellModel, boolean>({
    name: 'marked',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor for the input area model.
   */
  export
  const inputProperty = new Property<IBaseCellModel, IInputAreaModel>({
    name: 'input',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor for the name of a cell.
   */
  export
  const nameProperty = new Property<IBaseCellModel, string>({
    name: 'name',
    value: null,
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor for the tags of a cell.
   */
  export
  const tagsProperty = new Property<IBaseCellModel, string[]>({
    name: 'tags',
    value: null,
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor holding the format of a raw cell.
  */
  export
  const formatProperty = new Property<IRawCellModel, string>({
    name: 'format',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor which determines whether the input area should be rendered.
   */
  export
  const renderedProperty = new Property<IMarkdownCellModel, boolean>({
    name: 'rendered',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor for the execution count of a code cell.
   */
  export
  const executionCountProperty = new Property<ICodeCellModel, number>({
    name: 'executionCount',
    value: null,
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor holding the outputs of a code cell.
  */
  export
  const outputProperty = new Property<ICodeCellModel, IOutputAreaModel>({
    name: 'output',
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor for the collapsed state of a code cell.
  */
  export
  const collapsedProperty = new Property<ICodeCellModel, boolean>({
    name: 'collapsed',
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor for the scrolled state of a code cell.
  */
  export
  const scrolledProperty = new Property<ICodeCellModel, boolean | 'auto'>({
    name: 'scrolled',
    notify: stateChangedSignal,
  });
}
