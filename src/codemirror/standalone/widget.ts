// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  loadModeByFileName
} from '../../codemirror';

import {
  CodeMirrorEditorWidget
} from '../widget';

import {
  IStandalonEditorView
} from '../../editorwidget/standalone/view';

import {
  IStandaloneEditorPresenter
} from '../../editorwidget/standalone/presenter';

/**
 * A standalone code mirror editor widget. 
 */
export
class CodeMirroStandaloneEditorWidget extends CodeMirrorEditorWidget implements IStandalonEditorView {

  /**
   * An associated presenter.
   */
  presenter:IStandaloneEditorPresenter

  /**
   * Disposes this widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    if (this.presenter) {
      this.presenter.dispose();
      this.presenter = null
    }
  }

  /**
   * Mark this editor as dirty.
   */
  setDirty(dirty: boolean) {
      // do nothing
  }

}