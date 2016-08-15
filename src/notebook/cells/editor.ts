// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ICellEditorView
} from './view';

import {
  ICellEditorPresenter
} from './presenter';

import {
  EditorWidget
} from '../../editorWidget/widget';

/**
 * A widget for a cell editor.
 */
export
interface ICellEditorWidget extends EditorWidget, ICellEditorView {
  presenter:ICellEditorPresenter
}
