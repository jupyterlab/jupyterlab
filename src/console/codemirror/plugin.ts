// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

import {
  ConsoleContent
} from '../content';

import {
  IEditorServices
} from '../../codeeditor';

import {
  CodeCellWidget
} from '../../notebook/cells';


/**
 * The provider for a console's code mirror renderer.
 */
export
const plugin: JupyterLabPlugin<ConsoleContent.IRenderer> = {
  id: 'jupyter.services.console.codemirror.renderer',
  requires: [IEditorServices],
  provides: ConsoleContent.IRenderer,
  activate: activateRendererProvider
};

/**
 * Activates the renderer provider extension.
 */
function activateRendererProvider(app: JupyterLab, editorServices: IEditorServices): ConsoleContent.IRenderer {
  const bannerRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
  const promptRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      matchBrackets: false,
      autoCloseBrackets: false,
      extraKeys: {
        Enter: function () { /* no-op */ }
      }
    })
  });
  const foreignCellRenderer = promptRenderer;
  const editorMimeTypeService = editorServices.mimeTypeService;
  return new ConsoleContent.Renderer({
    bannerRenderer, promptRenderer, foreignCellRenderer, editorMimeTypeService
  });
}
