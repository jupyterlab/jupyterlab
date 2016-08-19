// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
    ISignal
} from 'phosphor/lib/core/signaling';

import {
  EditorWidget, IEditorView, IPosition, IEditorModel, IEditorConfiguration
} from './widget';

export * from './widget';

/**
 * An editor view decorator.
 */
export
class EditorViewDecorator<T extends IEditorView> implements IEditorView, IDisposable {

  /**
   * Test whether this decorator is disposed.
   */
  isDisposed:boolean = true;

  /**
   * Constructs a new decorator.
   */
  constructor(private _editor:T) {
    this.addDecorations();
  }

  /**
   * Disposes this decorator.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.removeDecorations();
    this._editor.dispose();
    this._editor = null;
  }

  /**
   * A client should override this method to add decorations.
   */
  protected addDecorations() {
  }

  /**
   * A client should override this method to remove decorations.
   */
  protected removeDecorations() {
  }

  /**
   * Returns an underlying editor.
   */
  get editor(): T {
    return this._editor;
  }

  // --- Delegate methods ---

  get closed(): ISignal<IEditorView, void> {
    return this._editor.closed;
  }

  set closed(closed:ISignal<IEditorView, void>) {
    this._editor.closed = closed;
  }

  get position(): IPosition {
    return this._editor.position;
  }

  set position(position:IPosition) {
    this._editor.position = position;
  }

  getModel(): IEditorModel {
    return this._editor.getModel();
  }

  getConfiguration(): IEditorConfiguration {
    return this._editor.getConfiguration();
  }

  getLeftOffset(position: IPosition): number {
    return this._editor.getLeftOffset(position);
  }

  getTopOffset(position: IPosition): number {
    return this._editor.getTopOffset(position);
  }

  hasFocus(): boolean {
    return this._editor.hasFocus();
  }

  focus() {
    return this._editor.focus();
  }

}

/**
 * An editor widget decorator.
 */
export
class EditorWidgetDecorator<T extends EditorWidget> extends EditorViewDecorator<T> {
}