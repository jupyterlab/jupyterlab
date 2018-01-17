/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILatexTypesetter, IRenderMimeRegistry, RenderMimeRegistry,
  standardRendererFactories
} from '@jupyterlab/rendermime';


/**
 * A plugin providing a rendermime registry.
 */
const plugin: JupyterLabPlugin<RenderMimeRegistry> = {
    id: '@jupyterlab/rendermime-extension:plugin',
    optional: [ILatexTypesetter],
    provides: IRenderMimeRegistry,
    activate: activate,
    autoStart: true
};

/**
 * Export the plugin as default.
 */
export
default plugin;


/**
 * Activate the rendermine plugin.
 */
function activate(app: JupyterLab, latexTypesetter: ILatexTypesetter) {
  return new RenderMimeRegistry({
    initialFactories: standardRendererFactories,
    linkHandler: {
      handleLink: (node, path) => {
        app.commandLinker.connectNode(
          node, 'docmanager:open', { path: path }
        );
      }
    },
    latexTypesetter
  });
}
