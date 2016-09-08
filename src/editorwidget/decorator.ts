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

import {
  PropertyObserver
} from './utils/utils';

export * from './widget';

/**
 * An editor view decorator.
 */
export
class EditorViewDecorator<T extends IEditorView> implements IEditorView, IDisposable {

  /**
   * Test whether this decorator is disposed.
   */
  isDisposed:boolean = false;

  /**
   * Constructs a new decorator.
   */
  constructor(editor:T) {
    this._editorObserver.connect = (editor)=>this.connect(editor);
    this._editorObserver.disconnect = (editor)=>this.disconnect(editor);
    this._editorObserver.onChanged = (editor)=>this.decorate(editor);
    this._editorObserver.property = editor;
  }

  /**
   * Disposes this decorator.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._editorObserver.dispose();
    this._editorObserver = null;
  }

  /**
   * Connects a decorator to the given editor.
   */
  protected connect(editor:T) {
    // do nothing
  }

  /**
   * Decorates the given editor.
   */
  protected decorate(editor:T) {
    // do nothing
  }

  /**
   * Disconnects a decorator from the given editor.
   */
  protected disconnect(editor:T) {
    // do nothing
  }

  /**
   * Returns an underlying editor.
   */
  get editor(): T {
    return this._editorObserver.property;
  }

  // --- Delegate methods ---

  get closed(): ISignal<IEditorView, void> {
    return this.editor.closed;
  }

  set closed(closed:ISignal<IEditorView, void>) {
    this.editor.closed = closed;
  }

  get position(): IPosition {
    return this.editor.position;
  }

  set position(position:IPosition) {
    this.editor.position = position;
  }

  getModel(): IEditorModel {
    return this.editor.getModel();
  }

  getConfiguration(): IEditorConfiguration {
    return this.editor.getConfiguration();
  }

  getLeftOffset(position: IPosition): number {
    return this.editor.getLeftOffset(position);
  }

  getTopOffset(position: IPosition): number {
    return this.editor.getTopOffset(position);
  }

  hasFocus(): boolean {
    return this.editor.hasFocus();
  }

  focus() {
    return this.editor.focus();
  }

  private _editorObserver = new PropertyObserver<T>();

}

/**
 * An editor widget decorator.
 */
export
class EditorWidgetDecorator<T extends EditorWidget> extends EditorViewDecorator<T> {
}
