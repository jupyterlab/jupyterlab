// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ICellEditorView, ICellEditorPresenter
} from './presenter';

import {
  EditorWidget
} from '../../editorWidget/widget';

export * from './presenter';

/**
 * A cell editor widget.
 */
export
interface CellEditorWidget extends EditorWidget, ICellEditorView {
  presenter:ICellEditorPresenter
}
