// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel
} from '../notebook/panel';

import {
  CodeMirrorNotebookPanelRenderer
} from './notebook/panel';

import {
  JupyterLabPlugin
} from '../../application';

/**
 * The provider for a notebook's code mirror renderer.
 */
export
const rendererProvider: JupyterLabPlugin<NotebookPanel.IRenderer> = {
  id: 'jupyter.services.notebook.codemirror.renderer',
  provides: NotebookPanel.IRenderer,
  activate: () => CodeMirrorNotebookPanelRenderer.defaultRenderer
};
