// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  IEditorView
} from '../../editorwidget/view';

export * from '../../editorwidget/view';

/**
 * The location of requested edges.
 */
export type EdgeLocation = 'top' | 'bottom';

/**
 * A cell editor view.
 */
export
interface ICellEditorView extends IEditorView {

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorView, EdgeLocation>;

}

/**
 * Utilities for a cell editor view.
 */
export
namespace ICellEditorView {

  /**
   * Tests whether the given editor view is a cell editor view.
   */
  export
  function is(editorView:any): editorView is ICellEditorView {
    return IEditorView.is(editorView) && ('edgeRequested' in editorView);
  }

}
