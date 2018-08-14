/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import { IDocumentManager } from '@jupyterlab/docmanager';

import {
  ILatexTypesetter,
  IRenderMimeRegistry,
  RenderMimeRegistry,
  standardRendererFactories
} from '@jupyterlab/rendermime';

namespace CommandIDs {
  export const handleLink = 'rendermime:handle-local-link';
}

/**
 * A plugin providing a rendermime registry.
 */
const plugin: JupyterLabPlugin<RenderMimeRegistry> = {
  id: '@jupyterlab/rendermime-extension:plugin',
  requires: [IDocumentManager],
  optional: [ILatexTypesetter],
  provides: IRenderMimeRegistry,
  activate: activate,
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * Activate the rendermine plugin.
 */
function activate(
  app: JupyterLab,
  docManager: IDocumentManager,
  latexTypesetter: ILatexTypesetter | null
) {
  app.commands.addCommand(CommandIDs.handleLink, {
    label: 'Handle Local Link',
    execute: args => {
      const path = args['path'] as string | undefined | null;
      const id = args['id'] as string | undefined | null;
      if (!path) {
        return;
      }
      // First check if the path exists on the server.
      return docManager.services.contents
        .get(path, { content: false })
        .then(() => {
          // Open the link with the default rendered widget factory,
          // if applicable.
          const factory = docManager.registry.defaultRenderedWidgetFactory(
            path
          );
          const widget = docManager.openOrReveal(path, factory.name);
          if (!widget) {
            return;
          }
          return widget.revealed.then(() => {
            // Once the widget is ready, attempt to scroll the hash into view
            // if one has been provided.
            if (!id) {
              return;
            }
            // Look for the an element with the hash id in the document.
            // This id is set automatically for headers tags when
            // we render markdown.
            const element = widget.node.querySelector(id);
            if (element) {
              element.scrollIntoView();
            }
            return;
          });
        });
    }
  });
  return new RenderMimeRegistry({
    initialFactories: standardRendererFactories,
    linkHandler: {
      handleLink: (node: HTMLElement, path: string, id?: string) => {
        app.commandLinker.connectNode(node, CommandIDs.handleLink, {
          path,
          id
        });
      }
    },
    latexTypesetter
  });
}
