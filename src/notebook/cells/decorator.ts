// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    ISignal
} from 'phosphor/lib/core/signaling';

import {
  CellEditorWidget, ICellEditorView, EdgeLocation
} from './editor';

import {
  EditorViewDecorator
} from '../../editorwidget/decorator';

export * from './editor';

/**
 * A cell editor view decorator.
 */
export
class CellEditorViewDecorator<T extends ICellEditorView> extends EditorViewDecorator<T> implements ICellEditorView {

  // --- Delegate methods ---

  get edgeRequested(): ISignal<ICellEditorView, EdgeLocation> {
    return this.editor.edgeRequested;
  }

  set edgeRequested(edgeRequested:ISignal<ICellEditorView, EdgeLocation>) {
    this.editor.edgeRequested = edgeRequested;
  }

}

/**
 * A cell editor wdiget decorator.
 */
export
class CellEditorWidgetDecorator<T extends CellEditorWidget> extends CellEditorViewDecorator<T> {

}

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';

/**
 * A default cell editor widget decorator.
 */
export
class DefaultCellEditorWidgetDecorator<T extends CellEditorWidget> extends CellEditorWidgetDecorator<T> {

  /**
   * Decorates an underlying widget.
   */
  protected addDecorations() {
    this.editor.addClass(CELL_EDITOR_CLASS);
  }

  /**
   * Removes decorations from an underlying widget.
   */
  protected removeDecorations() {
    this.editor.removeClass(CELL_EDITOR_CLASS);
  }

}