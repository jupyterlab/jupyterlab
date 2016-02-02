// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';


import {
  IInputAreaModel
} from 'jupyter-js-input-area';
import {
  IOutputAreaModel
} from 'jupyter-js-output-area';

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
 * An enum which describes the type of cell.
 */
export
enum CellType {
  /**
   * The cell contains code input.
   */
  Code,

  /**
   * The cell contains markdown.
   */
  Markdown,

  /**
   * The cell contains raw text.
   */
  Raw
}


/**
 * An object which is serializable.
 */
export
interface ISerializable {
  toJSON(): any;
  fromJSON(data: any): void;
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
   * Get namespaced metadata about the cell.
   */
  //getMetadata(namespace: string) : IObservableMap<string, ISerializable>;

  /**
   * The input area of the cell.
   */
  input: IInputAreaModel;

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
   * A signal emitted when the state of the model changes.
   *
   * **See also:** [[stateChanged]]
   */
  static stateChangedSignal = new Signal<IBaseCellModel, IChangedArgs<any>>();

  /**
   * A signal emitted when the state of the model changes.
   *
   * #### Notes
   * This is a pure delegate to the [[stateChangedSignal]].
   */
  get stateChanged(): ISignal<IBaseCellModel, IChangedArgs<any>> {
    return BaseCellModel.stateChangedSignal.bind(this);
  }

  /**
   * A property descriptor for the input area model.
   *
   * **See also:** [[input]]
   */
  static inputProperty = new Property<IBaseCellModel, IInputAreaModel>({
    name: 'input',
    notify: BaseCellModel.stateChangedSignal,
  });

  /**
   * Get the input area model.
   *
   * #### Notes
   * This is a pure delegate to the [[inputProperty]].
   */
  get input() {
    return BaseCellModel.inputProperty.get(this);
  }
  
  /**
   * Set the input area model.
   *
   * #### Notes
   * This is a pure delegate to the [[inputProperty]].
   */
  set input(value: IInputAreaModel) {
    BaseCellModel.inputProperty.set(this, value);
  }

  /**
   * The type of cell.
   */
  type: CellType;
}


/**
 * An implementation of a code cell Model.
 */
export
class CodeCellModel extends BaseCellModel implements ICodeCellModel {

  /**
  * A property descriptor holding the output area model.
  * 
  * TODO: Do we need this execute signal?
  * **See also:** [[output]]
  */
  static outputProperty = new Property<CodeCellModel, IOutputAreaModel>({
      name: 'output',
      notify: CodeCellModel.stateChangedSignal,
  });


  /**
   * Get the output area model.
   *
   * #### Notes
   * This is a pure delegate to the [[outputProperty]].
   */
  get output() { 
      return CodeCellModel.outputProperty.get(this); 
  }
  
  /**
   * Set the output area model.
   *
   * #### Notes
   * This is a pure delegate to the [[outputProperty]].
   */
  set output(value: IOutputAreaModel) {
      CodeCellModel.outputProperty.set(this, value);
  }
  
  type: CellType = CellType.Code;
}


/**
 * An implementation of a Markdown cell Model.
 */
export
class MarkdownCellModel extends BaseCellModel implements IMarkdownCellModel {

  /**
   * A property descriptor which determines whether the input area should be rendered.
   *
   * **See also:** [[rendered]]
   */
  static renderedProperty = new Property<MarkdownCellModel, boolean>({
    name: 'rendered',
    notify: MarkdownCellModel.stateChangedSignal,
  });

  /**
   * Get whether we should display a rendered representation.
   *
   * #### Notes
   * This is a pure delegate to the [[renderedProperty]].
   */
  get rendered() {
    return MarkdownCellModel.renderedProperty.get(this);
  }

  /**
   * Get whether we should display a rendered representation.
   *
   * #### Notes
   * This is a pure delegate to the [[renderedProperty]].
   */
  set rendered(value: boolean) {
    MarkdownCellModel.renderedProperty.set(this, value);
  }
  
  type: CellType = CellType.Markdown;
}

/**
  * A type guard for testing if a cell is a markdown cell.
  */
export
function isMarkdownCell(m: ICellModel): m is IMarkdownCellModel {
  return (m.type === CellType.Markdown);
}

/**
  * A type guard for testing if a cell is a code cell.
  */
export
function isCodeCell(m: ICellModel): m is ICodeCellModel {
  return (m.type === CellType.Code);
}

/**
  * A type guard for testing if a cell is a raw cell.
  */
export
function isRawCell(m: ICellModel): m is IRawCellModel {
  return (m.type === CellType.Raw);
}
