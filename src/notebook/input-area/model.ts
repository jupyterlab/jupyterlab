// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

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
    return this._collapsed;
  }
  set collapsed(newValue: boolean) {
    if (newValue === this._collapsed) {
      return;
    }
    let oldValue = this._collapsed;
    let name = 'collapsed';
    this._collapsed = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The prompt text.
   */
  get prompt() {
    return this._prompt;
  }
  set prompt(newValue: string) {
    if (newValue === this._prompt) {
      return;
    }
    let oldValue = this._prompt;
    let name = 'prompt';
    this._prompt = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
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
  private _collapsed = false;
  private _prompt: string = null;
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
}
