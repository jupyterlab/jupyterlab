// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IObservableList
} from 'phosphor-observablelist';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
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
 * The interactivity modes for a cell.
 */
export
type CellMode = 'command' | 'edit';

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
   * Whether the cell is the active cell in the notebook.
   */
  active: boolean;

  /**
   * The mode of the cell.
   */
  mode: CellMode;

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
   * Whether the cell is selected for applying commands.
   */
  selected: boolean;
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
    input.textEditor.stateChanged.connect(this.onEditorChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<IBaseCellModel, IChangedArgs<any>> {
    return CellModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * Whether the cell is the active cell in the notebook.
   */
  get active(): boolean {
    return CellModelPrivate.activeProperty.get(this);
  }
  set active(value: boolean) {
    CellModelPrivate.activeProperty.set(this, value);
  }

  /**
   * The mode of the cell.
   *
   * #### Notes
   * This is a delegate to the focused state of the input's editor.
   */
  get mode(): CellMode {
    if (this.input.textEditor.focused) {
      return 'edit';
    } else {
      return 'command';
    }
  }
  set mode(value: CellMode) {
    this.input.textEditor.focused = value === 'edit';
  }

  /**
   * Whether the cell is selected for applying commands.
   */
  get selected(): boolean {
    return CellModelPrivate.selectedProperty.get(this);
  }
  set selected(value: boolean) {
    CellModelPrivate.selectedProperty.set(this, value);
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
    return CellModelPrivate.trustedProperty.get(this);
  }
  set trusted(value: boolean) {
    CellModelPrivate.trustedProperty.set(this, value);
  }

  /**
   * The name of the cell.
   */
  get name(): string {
    return CellModelPrivate.nameProperty.get(this);
  }
  set name(value: string) {
    CellModelPrivate.nameProperty.set(this, value);
  }

  /**
   * The tags for the cell.
   */
  get tags(): string[] {
    return CellModelPrivate.tagsProperty.get(this);
  }
  set tags(value: string[]) {
    CellModelPrivate.tagsProperty.set(this, value);
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
   * The type of cell.
   */
  type: CellType;

  /**
   * Handle changes to the editor model.
   */
  private onEditorChanged(editor: IEditorModel, args: IChangedArgs<any>): void {
    // Handle changes to the focused state of the editor.
    if (args.name === 'focused') {
      if (args.newValue) {
        this.stateChanged.emit({
          name: 'mode',
          newValue: 'edit',
          oldValue: 'command'
        });
      } else {
        this.stateChanged.emit({
          name: 'mode',
          newValue: 'command',
          oldValue: 'edit'
        });
      }
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
    this.input.prompt = 'In [ ]:';
  }

  /**
   * Get the output area model.
   */
  get output(): IOutputAreaModel {
    return this._output;
  }

  /**
   * Set the trusted state of the model.
   *
   * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
   */
  set trusted(value: boolean) {
    CellModelPrivate.trustedProperty.set(this, value);
    this.output.trusted = value;
  }

  /**
   * The execution count.
   */
  get executionCount(): number {
    return CellModelPrivate.executionCountProperty.get(this);
  }
  set executionCount(value: number) {
    CellModelPrivate.executionCountProperty.set(this, value);
    this.input.prompt = `In [${value === null ? ' ' : value}]:`;
  }

  /**
   * Whether the cell is collapsed/expanded.
   */
  get collapsed(): boolean {
    return CellModelPrivate.collapsedProperty.get(this);
  }
  set collapsed(value: boolean) {
    CellModelPrivate.collapsedProperty.set(this, value);
  }

  /**
   * Whether the cell's output is scrolled, unscrolled, or autoscrolled.
   */
  get scrolled(): ScrollSetting {
    return CellModelPrivate.scrolledProperty.get(this);
  }
  set scrolled(value: ScrollSetting) {
    CellModelPrivate.scrolledProperty.set(this, value);
  }

  /** 
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    this._output = null;
    super.dispose();
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
   * Whether we should display a rendered representation.
   */
  get rendered() {
    return CellModelPrivate.renderedProperty.get(this);
  }
  set rendered(value: boolean) {
    CellModelPrivate.renderedProperty.set(this, value);
  }

  type: CellType = "markdown";
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
    return CellModelPrivate.formatProperty.get(this);
  }
  set format(value: string) {
    CellModelPrivate.formatProperty.set(this, value);
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
namespace CellModelPrivate {
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
   * A property descriptor for the active state of the cell.
   */
  export
  const activeProperty = new Property<IBaseCellModel, boolean>({
    name: 'active',
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
  * A property descriptor for the trusted state of a cell.
  */
  export
  const trustedProperty = new Property<IBaseCellModel, boolean>({
    name: 'trusted',
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
  const scrolledProperty = new Property<ICodeCellModel, ScrollSetting>({
    name: 'scrolled',
    notify: stateChangedSignal,
  });
}
