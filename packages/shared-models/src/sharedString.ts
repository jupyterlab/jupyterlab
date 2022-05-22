// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import * as Y from 'yjs';
import { Delta, IShared, IUndoManager, SharedDoc } from './model';

/**
 * A string which can be shared by multiple clients.
 */
export interface ISharedString extends IShared {
  /**
   * The type of the IShared.
   */
  readonly type: 'String';

  /**
   * A signal emitted when the string has changed.
   */
  readonly changed: ISignal<this, ISharedString.IChangedArgs>;

  /**
   * The specific undo manager class behind the IShared abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a Y.UndoManager.
   *
   * TODO: Define an API
   */
  undoManager: IUndoManager;

  /**
   * The value of the string.
   */
  text: string;

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void;

  /**
   * Perform a transaction. While the function f is called, all changes to the SharedString
   * document are bundled into a single event.
   */
  transact(f: () => void): void;

  /**
   * Whether the ISharedString can undo changes.
   */
  canUndo(): boolean;

  /**
   * Whether the ISharedString can redo changes.
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
   * Clear the change stack.
   */
  clearUndo(): void;

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
   * Set the ISharedString to an empty string.
   */
  clear(): void;
}

/**
 * The namespace for `ISharedString` associate interfaces.
 */
export namespace ISharedString {
  /**
   * The changed args object which is emitted by an SharedString string.
   */
  export type IChangedArgs = Array<Delta<string>>;
}

/**
 * A concrete implementation of [[ISharedString]]
 */
export class SharedString implements ISharedString {
  private _sharedDoc: SharedDoc;
  private _undoManager: Y.UndoManager | undefined;
  private _isDisposed: boolean = false;
  private _changed = new Signal<this, ISharedString.IChangedArgs>(this);

  /**
   * Construct a new SharedString.
   */
  constructor(options: SharedString.IOptions) {
    this._sharedDoc = options.sharedDoc;

    if (options.underlyingModel) {
      this.underlyingModel = options.underlyingModel;
    } else {
      this.underlyingModel = new Y.Text();
    }

    this._undoManager = options.undoManager;
    this._undoManager?.addTrackedOrigin(SharedString);

    this.underlyingModel.observe(this._onTextChanged);
  }

  /**
   * The type of the IShared.
   */
  readonly type = 'String';

  /**
   * The specific model behind the ISharedString abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a Y.Text.
   */
  readonly underlyingModel: Y.Text;

  /**
   * A signal emitted when the string has changed.
   */
  get changed(): ISignal<this, ISharedString.IChangedArgs> {
    return this._changed;
  }

  /**
   * The specific undo manager class behind the IShared abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a Y.UndoManager.
   *
   * TODO: Define an API
   */
  get undoManager(): Y.UndoManager | undefined {
    return this._undoManager;
  }
  set undoManager(undoManager: Y.UndoManager | undefined) {
    this._undoManager = undoManager;
    this._undoManager?.addTrackedOrigin(SharedString);
  }

  /**
   * Set the value of the string.
   */
  set text(value: string) {
    this.transact(() => {
      this.underlyingModel.delete(0, this.underlyingModel.length);
      this.underlyingModel.insert(0, value);
    });
  }

  /**
   * Get the value of the string.
   */
  get text(): string {
    return this.underlyingModel.toString();
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
    this.underlyingModel.unobserve(this._onTextChanged);
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the SharedString
   * document are bundled into a single event.
   */
  transact(f: () => void): void {
    this._sharedDoc.transact(f, this);
  }

  /**
   * Whether the ISharedString can undo changes.
   */
  canUndo(): boolean {
    return this._undoManager == undefined
      ? false
      : this._undoManager.undoStack.length > 0;
  }

  /**
   * Whether the ISharedString can redo changes.
   */
  canRedo(): boolean {
    return this._undoManager == undefined
      ? false
      : this._undoManager.redoStack.length > 0;
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._undoManager?.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._undoManager?.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    this._undoManager?.clear();
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void {
    this.transact(() => {
      this.underlyingModel.insert(index, text);
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
    this.transact(() => {
      this.underlyingModel.delete(start, end - start);
    });
  }

  /**
   * Set the ISharedString to an empty string.
   */
  clear(): void {
    this.text = '';
  }

  private _onTextChanged = (event: Y.YTextEvent): void => {
    this._changed.emit(event.changes.delta as ISharedString.IChangedArgs);
  };
}

/**
 * The namespace for SharedString related interfaces.
 */
export namespace SharedString {
  /**
   * Options for creating a `SharedString` object.
   */
  export interface IOptions extends SharedDoc.IModelOptions {
    /**
     * A specific document to use as the store for this
     * SharedDoc.
     */
    sharedDoc: SharedDoc;

    /**
     * The underlying Y.Text for the SharedString.
     */
    underlyingModel?: Y.Text;
  }
}
