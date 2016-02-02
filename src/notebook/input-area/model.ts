// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  IEditorModel, EditorModel
} from 'jupyter-js-editor';

/**
 * The model for an input area.
 */
export
interface IInputAreaModel {

  /**
   * A signal emitted when state of the input area changes.
   */
  stateChanged: ISignal<IInputAreaModel, IChangedArgs<any>>;

  /**
   * The text editor model.
   */
  textEditor: IEditorModel;

  /**
   * Whether the input area should be collapsed (hidden) or expanded.
   * 
   * // TODO: this should probably be a property on the cell, not the input area.
   */
  collapsed: boolean;

  /**
   * The prompt number to display for the input area.
   */
  promptNumber: number;

  /**
   * The execution count.
   */
  executionCount: number;
}



/**
 * An implementation of an input area model.
 */
export
class InputAreaModel implements IInputAreaModel {

  /**
   * A signal emitted when the state of the model changes.
   *
   * **See also:** [[stateChanged]]
   */
  static stateChangedSignal = new Signal<InputAreaModel, IChangedArgs<any>>();

  /**
  * A property descriptor which determines whether the input area is collapsed or displayed.
  *
  * **See also:** [[collapsed]]
  */
  static collapsedProperty = new Property<InputAreaModel, boolean>({
    name: 'collapsed',
    notify: InputAreaModel.stateChangedSignal,
  });

  /**
  * A property descriptor containing the prompt number.
  *
  * **See also:** [[promptNumber]]
  */
  static promptNumberProperty = new Property<InputAreaModel, number>({
    name: 'promptNumber',
    notify: InputAreaModel.stateChangedSignal,
  });

  /**
  * A property descriptor containing the execution count of the input area.
  *
  * **See also:** [[executionCount]]
  */
  static executionCountProperty = new Property<InputAreaModel, number>({
    name: 'executionCount',
    notify: InputAreaModel.stateChangedSignal,
  });

  /**
  * A property descriptor containing the text editor Model.
  *
  * **See also:** [[textEditor]]
  */
  static textEditorProperty = new Property<InputAreaModel, EditorModel>({
    name: 'textEditor',
    notify: InputAreaModel.stateChangedSignal,
  });

  /**
   * A signal emitted when the state of the model changes.
   *
   * #### Notes
   * This is a pure delegate to the [[stateChangedSignal]].
   */
  get stateChanged() {
    return InputAreaModel.stateChangedSignal.bind(this);
  }

  /**
   * Get whether the input area should be collapsed or displayed.
   *
   * #### Notes
   * This is a pure delegate to the [[collapsedProperty]].
   */
  get collapsed() {
    return InputAreaModel.collapsedProperty.get(this);
  }

  /**
   * Set whether the input area should be collapsed or displayed.
   *
   * #### Notes
   * This is a pure delegate to the [[collapsedProperty]].
   */
  set collapsed(value: boolean) {
    InputAreaModel.collapsedProperty.set(this, value);
  }

  /**
   * Get the prompt number.
   *
   * #### Notes
   * This is a pure delegate to the [[promptNumberProperty]].
   */
  get promptNumber() {
    return InputAreaModel.promptNumberProperty.get(this);
  }

  /**
   * Set the prompt number.
   *
   * #### Notes
   * This is a pure delegate to the [[promptNumberProperty]].
   */
  set promptNumber(value: number) {
    InputAreaModel.promptNumberProperty.set(this, value);
  }

  /**
   * Get the execution count of the input area.
   *
   * #### Notes
   * This is a pure delegate to the [[executionCountProperty]].
   */
  get executionCount() {
    return InputAreaModel.executionCountProperty.get(this);
  }

  /**
   * Set the execution count of the input area.
   *
   * #### Notes
   * This is a pure delegate to the [[executionCountProperty]].
   */
  set executionCount(value: number) {
    InputAreaModel.executionCountProperty.set(this, value);
  }

  /**
   * Get the text editor Model.
   *
   * #### Notes
   * This is a pure delegate to the [[textEditorProperty]].
   */
  get textEditor() {
    return InputAreaModel.textEditorProperty.get(this);
  }
  
  /**
   * Set the text editor Model.
   *
   * #### Notes
   * This is a pure delegate to the [[textEditorProperty]].
   */
  set textEditor(value: EditorModel) {
    InputAreaModel.textEditorProperty.set(this, value);
  }
}
