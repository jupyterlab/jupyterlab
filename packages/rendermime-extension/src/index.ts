/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module rendermime-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISanitizer } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  ISearchProviderRegistry,
  TextSearchEngine
} from '@jupyterlab/documentsearch';
import {
  ILatexTypesetter,
  IMarkdownParser,
  IRenderMimeRegistry,
  markdownRendererFactory,
  MarkdownSearchEngine,
  RenderMimeRegistry,
  standardRendererFactories,
  textRendererFactory
} from '@jupyterlab/rendermime';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

namespace CommandIDs {
  export const handleLink = 'rendermime:handle-local-link';
}

/**
 * A plugin providing a rendermime registry.
 */
const plugin: JupyterFrontEndPlugin<IRenderMimeRegistry> = {
  id: '@jupyterlab/rendermime-extension:plugin',
  optional: [
    IDocumentManager,
    ILatexTypesetter,
    ISanitizer,
    IMarkdownParser,
    ITranslator
  ],
  provides: IRenderMimeRegistry,
  activate: activate,
  autoStart: true
};

/**
 * A plugin providing search engine for cell outputs.
 */
const search: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/rendermime-extension:search',
  requires: [ISearchProviderRegistry],
  activate: (app: JupyterFrontEnd, searchRegistry: ISearchProviderRegistry) => {
    textRendererFactory.mimeTypes.forEach(mimeType => {
      searchRegistry.registerMimeTypeSearchEngine(mimeType, TextSearchEngine);
    });

    [
      ...markdownRendererFactory.mimeTypes,
      'text/x-ipythongfm',
      'text/x-markdown',
      'text/x-gfm'
    ].forEach(mimeType => {
      searchRegistry.registerMimeTypeSearchEngine(
        mimeType,
        MarkdownSearchEngine
      );
    });
  },
  autoStart: true
};

/**
 * Export the plugins as default.
 */
export default [plugin, search];

/**
 * Activate the rendermine plugin.
 */
function activate(
  app: JupyterFrontEnd,
  docManager: IDocumentManager | null,
  latexTypesetter: ILatexTypesetter | null,
  sanitizer: ISanitizer | null,
  markdownParser: IMarkdownParser | null,
  translator: ITranslator | null
): RenderMimeRegistry {
  const trans = (translator ?? nullTranslator).load('jupyterlab');
  if (docManager) {
    app.commands.addCommand(CommandIDs.handleLink, {
      label: trans.__('Handle Local Link'),
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

            // Handle the hash if one has been provided.
            if (widget && id) {
              widget.setFragment(id);
            }
          });
      }
    });
  }
  return new RenderMimeRegistry({
    initialFactories: standardRendererFactories,
    linkHandler: !docManager
      ? undefined
      : {
          handleLink: (node: HTMLElement, path: string, id?: string) => {
            // If node has the download attribute explicitly set, use the
            // default browser downloading behavior.
            if (node.tagName === 'A' && node.hasAttribute('download')) {
              return;
            }
            app.commandLinker.connectNode(node, CommandIDs.handleLink, {
              path,
              id
            });
          }
        },
    latexTypesetter: latexTypesetter ?? undefined,
    markdownParser: markdownParser ?? undefined,
    translator: translator ?? undefined,
    sanitizer: sanitizer ?? undefined
  });
}
