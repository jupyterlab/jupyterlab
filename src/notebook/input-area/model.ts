// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  IEditorModel
} from '../editor';


/**
 * The model for an input area.
 */
export
interface IInputAreaModel extends IDisposable {
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
   * The read only state of the input cell.
   */
  readOnly: boolean;
}


/**
 * An implementation of an input area model.
 */
export
class InputAreaModel implements IInputAreaModel {
  /**
   * Construct a new input area model.
   */
  constructor(editor: IEditorModel) {
    this._editor = editor;
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged() {
    return InputAreaModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * Whether the input area should be collapsed or displayed.
   */
  get collapsed() {
    return InputAreaModelPrivate.collapsedProperty.get(this);
  }
  set collapsed(value: boolean) {
    InputAreaModelPrivate.collapsedProperty.set(this, value);
  }

  /**
   * The prompt text.
   */
  get prompt() {
    return InputAreaModelPrivate.promptProperty.get(this);
  }
  set prompt(value: string) {
    InputAreaModelPrivate.promptProperty.set(this, value);
  }

  /**
   * Get the text editor Model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get textEditor(): IEditorModel {
    return this._editor;
  }

  /**
   * The read only state.
   */
  get readOnly(): boolean {
    return this.textEditor.readOnly;
  }
  set readOnly(value: boolean) {
    this.textEditor.readOnly = value;
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._editor === null;
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
    this._editor.dispose();
    this._editor = null;
  }

  private _editor: IEditorModel = null;
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
    notify: stateChangedSignal
  });

  /**
  * A property descriptor containing the prompt.
  */
  export
  const promptProperty = new Property<InputAreaModel, string>({
    name: 'prompt',
    notify: stateChangedSignal
  });
}
