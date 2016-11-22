// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel
} from '../notebook/panel';

import {
  MonacoNotebookPanelRenderer
} from './notebook/panel';

import {
  JupyterLabPlugin
} from '../../application';

/**
 * The provider for a notebook's Monaco renderer.
 */
export
const rendererProvider: JupyterLabPlugin<NotebookPanel.IRenderer> = {
  id: 'jupyter.services.notebook.monaco.renderer',
  provides: NotebookPanel.IRenderer,
  activate: () => MonacoNotebookPanelRenderer.defaultRenderer
};
