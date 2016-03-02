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
   */
  collapsed: boolean;

  /**
   * The prompt text to display for the input area.
   */
  prompt: string;

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
interface IInputAreaOptions extends IEditorOptions { }


/**
 * An implementation of an input area model.
 */
export
class InputAreaModel implements IInputAreaModel {
  /**
   * Construct a new input area model.
   */
  constructor(options?: IInputAreaOptions) {
    this._editor = new EditorModel(options);
    this._editor.stateChanged.connect(this.onEditorChanged, this);
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
   * Get the prompt text.
   */
  get prompt() {
    return InputAreaModelPrivate.promptProperty.get(this);
  }

  /**
   * Set the prompt text.
   */
  set prompt(value: string) {
    InputAreaModelPrivate.promptProperty.set(this, value);
  }

  /**
   * Get the text editor Model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get textEditor(): EditorModel {
    return this._editor;
  }

  /**
   * Get the dirty state.
   *
   * #### Notest
   * This is a delegate to the dirty state of the [textEditor].
   */
  get dirty(): boolean {
    return this.textEditor.dirty;
  }

  /**
   * Set the dirty state.
   *
   * #### Notest
   * This is a delegate to the dirty state of the [textEditor].
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
   * Handle changes to the editor state.
   */
  protected onEditorChanged(editor: EditorModel, args: IChangedArgs<any>): void {
    if (args.name === 'dirty') {
      // Re-emit dirty state changes from the editor.
      this.stateChanged.emit(args);
    }
  }

  private _editor: EditorModel = null;
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
  * A property descriptor containing the prompt.
  */
  export
  const promptProperty = new Property<InputAreaModel, string>({
    name: 'prompt',
    notify: stateChangedSignal,
  });
}
