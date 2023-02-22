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
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ILatexTypesetter,
  IMarkdownParser,
  IRenderMimeRegistry,
  RenderedText,
  RenderMimeRegistry,
  standardRendererFactories,
  TEXT_RENDERER_MIME_TYPES
} from '@jupyterlab/rendermime';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

namespace CommandIDs {
  export const handleLink = 'rendermime:handle-local-link';
}

export const RENDERMIME_PLUGIN_ID = '@jupyterlab/rendermime-extension:plugin';

/**
 * A plugin providing a rendermime registry.
 */
const plugin: JupyterFrontEndPlugin<IRenderMimeRegistry> = {
  id: RENDERMIME_PLUGIN_ID,
  optional: [
    IDocumentManager,
    ILatexTypesetter,
    ISanitizer,
    IMarkdownParser,
    ITranslator,
    ISettingRegistry
  ],
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
  app: JupyterFrontEnd,
  docManager: IDocumentManager | null,
  latexTypesetter: ILatexTypesetter | null,
  sanitizer: ISanitizer | null,
  markdownParser: IMarkdownParser | null,
  translator: ITranslator | null,
  settingRegistry: ISettingRegistry | null
): RenderMimeRegistry {
  const trans = (translator ?? nullTranslator).load('jupyterlab');
  let disableAutolink = false;

  function onWidgetCreated(sender: any, widget: RenderedText) {
    widget.disableAutolink = disableAutolink;
  }

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
            const factory =
              docManager.registry.defaultRenderedWidgetFactory(path);
            const widget = docManager.openOrReveal(path, factory.name);

            // Handle the hash if one has been provided.
            if (widget && id) {
              widget.setFragment(id);
            }
          });
      }
    });
  }

  if (settingRegistry) {
    const loadSettings = settingRegistry.load(RENDERMIME_PLUGIN_ID);
    const updateSettings = (settings: ISettingRegistry.ISettings): void => {
      disableAutolink = settings.get('disableAutolink').composite as boolean;
    };

    Promise.all([loadSettings, app.restored])
      .then(([settings]) => {
        updateSettings(settings);
        settings.changed.connect(settings => {
          updateSettings(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }

  const renderMimeRegistry = new RenderMimeRegistry({
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

  TEXT_RENDERER_MIME_TYPES.forEach(mimeType => {
    renderMimeRegistry.getWidgetCreated(mimeType)?.connect(onWidgetCreated);
  });

  return renderMimeRegistry;
}
