// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';


/**
 * A string which can be observed for changes.
 */
export
interface IObservableString extends IDisposable {
  /**
   * A signal emitted when the string has changed.
   */
  changed: ISignal<IObservableString, string>;

  /**
   * The value of the string.
   */
  text : string;

  /**
   * Set the ObservableString to an empty string.
   */
  clear() : void;

  /**
   * Dispose of the resources held by the string.
   */
  dispose() : void;
}

/**
 * A concrete implementation of [[IObservableString]] 
 */
export
class ObservableString implements IObservableString {

  constructor(initialText: string = '') {
    this._text = initialText;
    this.changed.emit('');
  }

  /**
   * A signal emitted when the string has changed.
   */
  changed: ISignal<IObservableString, string>;


  /**
   * Set the value of the string.
   */
  set text( value: string ) {
    let oldValue = this._text;
    this._text = value;
    this.changed.emit(oldValue);
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    return this._text;
  }

  /**
   * Test whether the string has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }


  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void {
    this._text = '';
    this.changed.emit(void 0);
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.clear();
    clearSignalData(this);
  }

  private _text = '';
  private _isDisposed : boolean = false;
}

// Define the signals for the `ObservableString` class.
defineSignal(ObservableString.prototype, 'changed');
