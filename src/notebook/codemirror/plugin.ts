// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel, Notebook
} from '../notebook';

import {
  CodeCellWidget
} from '../cells';

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

import {
  IEditorServices
} from '../../codeeditor';

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
  const codeCellRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      extra: {
        matchBrackets: true,
        autoCloseBrackets: true
      }
    })
  });
  const rawCellRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
  const markdownCellRenderer = rawCellRenderer;
  const editorMimeTypeService = editorServices.mimeTypeService;
  const notebookRenderer = new Notebook.Renderer({
    codeCellRenderer, markdownCellRenderer, rawCellRenderer, editorMimeTypeService
  });
  return new NotebookPanel.Renderer({
    notebookRenderer
  });
}

