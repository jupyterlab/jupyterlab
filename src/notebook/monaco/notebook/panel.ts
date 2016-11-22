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
  MonacoNotebookRenderer
} from './widget';


/**
 * A Monaco renderer for a notebook panel.
 */
export
class MonacoNotebookPanelRenderer extends NotebookPanel.Renderer {
  /**
   * Create a notebook.
   */
  createContent(rendermime: RenderMime): Notebook {
    return new Notebook({
      rendermime,
      renderer: MonacoNotebookRenderer.defaultRenderer
    });
  }
}


/**
 * A namespace for `MonacoNotebookPanelRenderer` statics.
 */
export namespace MonacoNotebookPanelRenderer {
  /**
   * A default Monaco renderer for a notebook panel.
   */
  export
  const defaultRenderer = new MonacoNotebookPanelRenderer();
}
