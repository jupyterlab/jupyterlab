// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel
} from '../notebook';

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

import {
  IEditorServices
} from '../../codeeditor';

import {
  createNotebookPanelRenderer
} from '.';


/**
 * The provider for a notebook's code mirror renderer.
 */
export
const plugin: JupyterLabPlugin<NotebookPanel.IRenderer> = {
  id: 'jupyter.services.notebook.codemirror.renderer',
  requires: [IEditorServices],
  provides: NotebookPanel.IRenderer,
  activate: activateRendererProvider
};

/**
 * Activates the renderer provider extension.
 */
function activateRendererProvider(app: JupyterLab, editorServices: IEditorServices): NotebookPanel.IRenderer {
  return createNotebookPanelRenderer(editorServices);
}

