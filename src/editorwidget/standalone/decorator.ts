// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  StandaloneEditorWidget, IStandaloneEditorView, IEditorModel
} from './widget';

import {
  EditorViewDecorator, EditorWidgetDecorator, EditorWidget
} from '../decorator';

/**
 * A standalone editor view decorator.
 */
export
class StandaloneEditorViewDecorator<T extends IStandaloneEditorView> extends EditorViewDecorator<T> implements IStandaloneEditorView {
  
  // --- Delegate methods ---

  setDirty(dirty: boolean): void {
    this.editor.setDirty(dirty);
  }

}

/**
 * A standalone editor widget decorator.
 */
export
class StandaloneEditorWidgetDecorator<T extends StandaloneEditorWidget> extends StandaloneEditorViewDecorator<T> {

}

/**
  * The class name added to a standalone editor widget.
  */
const EDITOR_CLASS = 'jp-EditorWidget';

/**
 * The class name added to a dirty standalone editor widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * A default standalone editor widget decorator.
 */
export
class DefaultStandaloneEditorWidgetDecorator<T extends StandaloneEditorWidget> extends StandaloneEditorWidgetDecorator<T> {

  /**
   * Connects a decorator to the given editor.
   */
  protected connect(editor:T) {
    editor.getModel().uriChanged.connect(this.onModelUriChanged, this);
  }

  /**
   * Disconnects a decorator from the given editor.
   */
  protected disconnect(editor:T) {
    editor.getModel().uriChanged.disconnect(this.onModelUriChanged, this);
  }

  /**
   * Decorates the given editor.
   */
  protected decorate(editor:T) {
    editor.addClass(EDITOR_CLASS);
    this.updateTitleLabel(editor.getModel().uri);
  }

  /**
   * Handles model uri changed events.
   */
  protected onModelUriChanged(model:IEditorModel): void {
    this.updateTitleLabel(model.uri);
  }

  /**
   * Handles dirty status changes.
   */
  setDirty(dirty: boolean): void {
    this.updateTitleStyles(dirty);
    super.setDirty(dirty);
  }

  /**
   * Updates a title lable of the decorated editor widget.
   */
  protected updateTitleLabel(uri:string) {
    const label = uri ? uri.split('/').pop() : 'Untitled';
    this.editor.title.label = label;
  }

  /**
   * Updates a title styles of the decorated editor widget.
   */
  protected updateTitleStyles(dirty:boolean) {
    if (dirty) {
      this.editor.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this.editor.title.className = this.editor.title.className.replace(DIRTY_CLASS, '');
    }
  }

}
