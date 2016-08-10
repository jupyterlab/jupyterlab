// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  RenderMime
} from '../../../rendermime';

import {
  Notebook
} from '../../notebook/widget';

import {
  NotebookPanel
} from '../../notebook/panel';

import {
  CodeMirrorNotebookRenderer
} from './widget';


/**
 * A code mirror renderer for a notebook panel.
 */
export
class CodeMirrorNotebookPanelRenderer extends NotebookPanel.Renderer {
  /**
   * Create a notebook.
   */
  createContent(rendermime: RenderMime): Notebook {
    return new Notebook({
      rendermime,
      renderer: CodeMirrorNotebookRenderer.defaultRenderer
    });
  }
}


/**
 * A namespace for `CodeMirrorNotebookPanelRenderer` statics.
 */
export namespace CodeMirrorNotebookPanelRenderer {
  /**
   * A default code mirror renderer for a notebook panel.
   */
  export
  const defaultRenderer = new CodeMirrorNotebookPanelRenderer();
}
