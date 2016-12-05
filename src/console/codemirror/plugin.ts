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
  createRenderer
} from '.';

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
  return createRenderer(editorServices);
}
