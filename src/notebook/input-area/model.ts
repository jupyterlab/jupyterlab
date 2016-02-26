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
  IEditorModel, IEditorOptions, EditorModel
} from '../editor';


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

  /**
   * The dirty state of the input cell.
   */
  dirty: boolean;

  /**
   * The read only state of the input cell.
   */
  readOnly: boolean;
}


/**
 * The options for creating an input area.
 */
export
interface IInputAreaOptions extends IEditorOptions {}


/**
 * An implementation of an input area model.
 */
export
class InputAreaModel implements IInputAreaModel {
  /**
   * Construct a new input area model.
   */
  constructor(options?: IInputAreaOptions) {
    let editor = new EditorModel(options);
    InputAreaModelPrivate.textEditorProperty.set(this, editor);
    editor.stateChanged.connect(this._textEditorChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged() {
    return InputAreaModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * Get whether the input area should be collapsed or displayed.
   */
  get collapsed() {
    return InputAreaModelPrivate.collapsedProperty.get(this);
  }

  /**
   * Set whether the input area should be collapsed or displayed.
   */
  set collapsed(value: boolean) {
    InputAreaModelPrivate.collapsedProperty.set(this, value);
  }

  /**
   * Get the prompt number.
   */
  get promptNumber() {
    return InputAreaModelPrivate.promptNumberProperty.get(this);
  }

  /**
   * Set the prompt number.
   */
  set promptNumber(value: number) {
    InputAreaModelPrivate.promptNumberProperty.set(this, value);
  }

  /**
   * Get the execution count of the input area.
   */
  get executionCount() {
    return InputAreaModelPrivate.executionCountProperty.get(this);
  }

  /**
   * Set the execution count of the input area.
   */
  set executionCount(value: number) {
    InputAreaModelPrivate.executionCountProperty.set(this, value);
  }

  /**
   * Get the text editor Model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get textEditor(): EditorModel {
    return InputAreaModelPrivate.textEditorProperty.get(this);
  }

  /**
   * Get the dirty state.
   *
   * #### Notest
   * This is a pure delegate to the dirty state of the [textEditor].
   */
  get dirty(): boolean {
    return this.textEditor.dirty;
  }

  /**
   * Set the dirty state.
   *
   * #### Notest
   * This is a pure delegate to the dirty state of the [textEditor].
   */
  set dirty(value: boolean) {
    this.textEditor.dirty = value;
  }

  /**
   * Get the read only state.
   */
  get readOnly(): boolean {
    return this.textEditor.readOnly;
  }

  /**
   * Set the read only state.
   */
  set readOnly(value: boolean) {
    this.textEditor.readOnly = value;
  }

  /**
   * Re-emit changes to the text editor dirty state.
   */
  private _textEditorChanged(editor: EditorModel, args: IChangedArgs<any>): void {
    if (editor === this.textEditor && args.name === 'dirty') {
      this.stateChanged.emit(args);
    }
  }
}


/**
 * The namespace for the `InputAreaModel` class private data.
 */
namespace InputAreaModelPrivate {
  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const stateChangedSignal = new Signal<InputAreaModel, IChangedArgs<any>>();

  /**
  * A property descriptor which determines whether the input area is collapsed or displayed.
  */
  export
  const collapsedProperty = new Property<InputAreaModel, boolean>({
    name: 'collapsed',
    notify: stateChangedSignal,
  });

  /**
  * A property descriptor containing the prompt number.
  */
  export
  const promptNumberProperty = new Property<InputAreaModel, number>({
    name: 'promptNumber',
    notify: stateChangedSignal,
  });

  /**
  * A property descriptor containing the execution count of the input area.
  */
  export
  const executionCountProperty = new Property<InputAreaModel, number>({
    name: 'executionCount',
    notify: stateChangedSignal,
  });

  /**
  * A property descriptor containing the text editor Model.
  */
  export
  const textEditorProperty = new Property<InputAreaModel, EditorModel>({
    name: 'textEditor',
    notify: stateChangedSignal,
  });
}
