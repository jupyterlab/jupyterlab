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
  IEditorModel
} from '../editor';

import {
  IInputAreaModel
} from '../input-area';

import {
  CellType, ICell, ICodeCell, IRawCell, IMarkdownCell
} from '../notebook/nbformat';

import {
  IOutputAreaModel
} from '../output-area';


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
   * Whether the cell is focused for editing.
   */
  focused: boolean;

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
  constructor(input: IInputAreaModel) {
    this._input = input;
    input.stateChanged.connect(this.onInputChanged, this);
    input.textEditor.stateChanged.connect(this.onEditorChanged, this);
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
   * Get whether the cell is focused for editing.
   *
   * #### Notes
   * This is a delegate to the focused state of the input's editor.
   */
  get focused(): boolean {
    return this.input.textEditor.focused;
  }

  /**
   * Get whether the cell is focused for editing.
   *
   * #### Notes
   * This is a delegate to the focused state of the input's editor.
   */
  set focused(value: boolean) {
    this.input.textEditor.focused = value;
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
    return this._input;
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
   * The type of cell.
   */
  type: CellType;

  /**
   * Handle changes to the input model.
   */
  private onInputChanged(input: IInputAreaModel, args: IChangedArgs<any>): void {
    // Re-emit changes to input dirty and readOnly states.
    if (args.name === 'dirty' || args.name === 'readOnly' || args.name ) {
      this.stateChanged.emit(args);
    }
  }

  /**
   * Handle changes to the editor model.
   */
  private onEditorChanged(editor: IEditorModel, args: IChangedArgs<any>): void {
    // Re-emit changes to the focused state of the editor.
    if (args.name == 'focused') {
      this.stateChanged.emit(args);
    }
  }

  private _input: IInputAreaModel = null;
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
    this.input.prompt = 'In[ ]:';
  }

  /**
   * Get the output area model.
   */
  get output(): IOutputAreaModel {
    return this._output;
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
    if (value !== void 0 && value !== null) {
      this.input.prompt = `In[${value}]:`;
    } else {
      this.input.prompt = 'In[ ]:';
    }
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

  type: CellType = "code";

  private _output: IOutputAreaModel = null;
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

  type: CellType = "raw";
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
    value: true,
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
