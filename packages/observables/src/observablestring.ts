// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { IObservable } from './modeldb';

/**
 * A string which can be observed for changes.
 */
export interface IObservableString extends IDisposable, IObservable {
  /**
   * The type of the Observable.
   */
  type: 'String';

  /**
   * A signal emitted when the string has changed.
   */
  readonly changed: ISignal<this, IObservableString.IChangedArgs>;

  /**
   * The value of the string.
   */
  text: string;

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string, options?: unknown): void;

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number, options?: unknown): void;

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void;

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void;
}

/**
 * The namespace for `IObservableString` associate interfaces.
 */
export namespace IObservableString {
  /**
   * The change types which occur on an observable string.
   */
  export type ChangeType =
    /**
     * Text was inserted.
     */
    | 'insert'

    /**
     * Text was removed.
     */
    | 'remove'

    /**
     * Text was set.
     */
    | 'set';

  /**
   * The changed args object which is emitted by an observable string.
   */
  export interface IChangedArgs {
    /**
     * The type of change undergone by the list.
     */
    type: ChangeType;

    /**
     * The starting index of the change.
     */
    start: number;

    /**
     * The end index of the change.
     */
    end: number;

    /**
     * The value of the change.
     *
     * ### Notes
     * If `ChangeType` is `set`, then
     * this is the new value of the string.
     *
     * If `ChangeType` is `insert` this is
     * the value of the inserted string.
     *
     * If `ChangeType` is remove this is the
     * value of the removed substring.
     */
    value: string;

    options?: unknown;
  }
}

/**
 * A concrete implementation of [[IObservableString]]
 */
export class ObservableString implements IObservableString {
  /**
   * Construct a new observable string.
   */
  constructor(initialText: string = '') {
    this._text = initialText;
  }

  /**
   * The type of the Observable.
   */
  get type(): 'String' {
    return 'String';
  }

  /**
   * A signal emitted when the string has changed.
   */
  get changed(): ISignal<this, IObservableString.IChangedArgs> {
    return this._changed;
  }

  /**
   * Set the value of the string.
   */
  set text(value: string) {
    if (value.length === this._text.length && value === this._text) {
      return;
    }
    this._text = value;
    this._changed.emit({
      type: 'set',
      start: 0,
      end: value.length,
      value: value
    });
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    return this._text;
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string, options?: unknown): void {
    this._text = this._text.slice(0, index) + text + this._text.slice(index);
    this._changed.emit({
      type: 'insert',
      start: index,
      end: index + text.length,
      value: text,
      options
    });
  }

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number, options?: unknown): void {
    const oldValue: string = this._text.slice(start, end);
    this._text = this._text.slice(0, start) + this._text.slice(end);
    this._changed.emit({
      type: 'remove',
      start: start,
      end: end,
      value: oldValue,
      options
    });
  }

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void {
    this.text = '';
  }

  /**
   * Test whether the string has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this.clear();
  }

  private _text = '';
  private _isDisposed: boolean = false;
  private _changed = new Signal<this, IObservableString.IChangedArgs>(this);
}
