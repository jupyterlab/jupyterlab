// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EditorWidget
} from '../widget';

import {
  IStandaloneEditorPresenter, IStandaloneEditorView
} from './presenter';

export * from './view';

/**
 * A standalone editor widget.
 */
export
interface StandaloneEditorWidget extends EditorWidget, IStandaloneEditorView {
  presenter:IStandaloneEditorPresenter
}