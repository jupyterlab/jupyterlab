// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  RenderMime
} from '../../../rendermime';

import {
  Notebook
} from '../../notebook/widget';

import {
  NotebookPanel, NotebookPanelRenderer
} from '../../notebook/panel';

import {
  CodeMirrorNotebookRenderer
} from './widget';

/**
 * A namespace for `CodeMirrorNotebookPanelRenderer` statics.
 */
export
namespace CodeMirrorNotebookPanelRenderer {

  /**
   * A default options for a code mirror notebook renderer.
   */
  export
  const defaultOptions:NotebookPanelRenderer.IOptions = {
    renderer: CodeMirrorNotebookRenderer.defaultRenderer
  };

  /**
   * A default code mirror renderer for a notebook panel.
   */
  export
  const defaultRenderer = new NotebookPanel.Renderer(defaultOptions);
}
