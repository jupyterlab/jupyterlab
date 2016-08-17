// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EditorWidget
} from '../widget';

import {
  IStandalonEditorView
} from './view';

import {
  IStandaloneEditorPresenter
} from './presenter';

export * from './view';

/**
 * A standalone editor widget.
 */
export
interface StandaloneEditorWidget extends EditorWidget, IStandalonEditorView {
  presenter:IStandaloneEditorPresenter
}