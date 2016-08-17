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