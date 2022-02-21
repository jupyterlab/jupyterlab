// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import * as Y from 'yjs';
import { IShared, SharedDoc } from './model';

/**
 * A string which can be observed for changes.
 */
export interface ISharedString extends IShared {
  /**
   * The type of the Observable.
   */
  readonly type: 'String';

  /**
   * A signal emitted when the string has changed.
   */
  readonly changed: ISignal<this, ISharedString.IChangedArgs>;

  /**
   * The specific model behind the ISharedMap abstraction.
   *
   * Note: The default implementation is based on Yjs so the underlying
   * model is a Y.Text.
   */
  readonly underlyingModel: any;

  readonly undoManager: any;

  /**
   * The value of the string.
   */
  text: string;

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void;

  /**
   * Whether the SharedString can undo changes.
   */
  canUndo(): boolean;

  /**
   * Whether the SharedString can redo changes.
   */
  canRedo(): boolean;

  /**
   * Undo an operation.
   */
  undo(): void;

  /**
   * Redo an operation.
   */
  redo(): void;

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void;

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void;

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void;
}

/**
 * The namespace for `IObservableString` associate interfaces.
 */
export namespace ISharedString {
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
     * TODO:
     * ModelDb returns the old value when removing, but we can not extract
     * the old value from the YTextEvent. Should we return undefined?
     */
    value?: string;
  }
}

/**
 * A concrete implementation of [[IObservableString]]
 */
export class SharedString implements ISharedString {
  private _ytext: Y.Text;
  private _doc: SharedDoc;
  private _undoManager: Y.UndoManager;
  private _isDisposed: boolean = false;
  private _changed = new Signal<this, ISharedString.IChangedArgs>(this);

  /**
   * Construct a new observable string.
   */
  constructor(options: SharedString.IOptions) {
    if (options.ytext) {
      this._ytext = options.ytext;
    } else {
      this._ytext = new Y.Text();
    }
    this._doc = options.doc;

    if (options.initialize !== false) {
      this.initialize();
    }

    this._ytext.observe(this._onTextChanged);
  }

  /**
   * The type of the Observable.
   */
  get type(): 'String' {
    return 'String';
  }

  get underlyingModel(): Y.Text {
    return this._ytext;
  }

  get undoManager(): any {
    return this._undoManager;
  }

  /**
   * A signal emitted when the string has changed.
   */
  get changed(): ISignal<this, ISharedString.IChangedArgs> {
    return this._changed;
  }

  /**
   * Set the value of the string.
   */
  set text(value: string) {
    this._doc.transact(() => {
      this._ytext.delete(0, this._ytext.length);
      this._ytext.insert(0, value);
    });
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    return this._ytext.toString();
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
    this._ytext.unobserve(this._onTextChanged);
  }

  initialize(): void {
    this._undoManager = new Y.UndoManager(this._ytext, {
      trackedOrigins: new Set([this])
    });
  }

  /**
   * Whether the SharedString can undo changes.
   */
  canUndo(): boolean {
    return this._undoManager.undoStack.length > 0;
  }

  /**
   * Whether the SharedString can redo changes.
   */
  canRedo(): boolean {
    return this._undoManager.redoStack.length > 0;
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._undoManager.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._undoManager.redo();
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void {
    this._doc.transact(() => {
      this._ytext.insert(index, text);
    });
  }

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void {
    this._doc.transact(() => {
      this._ytext.delete(start, end - start);
    });
  }

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void {
    this.text = '';
  }

  private _onTextChanged = (event: Y.YTextEvent): void => {
    let currpos = 0;
    let args: any = {};

    event.changes.delta.forEach(delta => {
      if (
        args.type === 'remove' &&
        delta.insert != null &&
        args.end === delta.insert.length
      ) {
        args = {
          type: 'set',
          start: 0,
          end: delta.insert.length,
          value: delta.insert as string
        };
        currpos += delta.insert.length;
      } else if (delta.insert != null) {
        args = {
          type: 'insert',
          start: currpos,
          end: currpos + delta.insert.length,
          value: delta.insert as string
        };
        currpos += delta.insert.length;
      } else if (delta.delete != null) {
        /* TODO:
         * ModelDb returns the old value, but we can not extract
         * the old value from the YTextEvent. Should we return undefined?
         */
        args = {
          type: 'remove',
          start: currpos,
          end: currpos + delta.delete,
          value: undefined
        };
      } else if (delta.retain != null) {
        currpos += delta.retain;
      }
    });

    //console.debug("_onTextChanged:");
    //console.debug("DELTA:", event.changes.delta);
    //console.debug("EMIT:", args);
    this._changed.emit(args);
  };
}

/**
 * The namespace for SharedString related interfaces.
 */
export namespace SharedString {
  /**
   * Options for creating a `SharedString` object.
   */
  export interface IOptions {
    /**
     * A specific document to use as the store for this
     * SharedDoc.
     */
    doc: SharedDoc;

    /**
     * The underlying Y.Text for the SharedString.
     */
    ytext?: Y.Text;

    initialize?: boolean;
  }
}
