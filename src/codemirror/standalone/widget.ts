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


export
class CodeMirroStandaloneEditorWidget extends CodeMirrorEditorWidget implements IStandalonEditorView {

  presenter:IStandaloneEditorPresenter

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

  setPath(path: string) {
    loadModeByFileName(this.editor, path);
  }

  setDirty(dirty: boolean) {
  }

}