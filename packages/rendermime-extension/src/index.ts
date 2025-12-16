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
import { ISanitizer, IThemeManager } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  ILatexTypesetter,
  IMarkdownParser,
  IRenderMime,
  IRenderMimeRegistry,
  RenderMimeRegistry,
  standardRendererFactories
} from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

namespace CommandIDs {
  export const handleLink = 'rendermime:handle-local-link';
}

/**
 * A plugin providing a rendermime registry.
 */
const plugin: JupyterFrontEndPlugin<IRenderMimeRegistry> = {
  id: '@jupyterlab/rendermime-extension:plugin',
  description: 'Provides the render mime registry.',
  optional: [
    IDocumentManager,
    ILatexTypesetter,
    ISanitizer,
    IMarkdownParser,
    ITranslator,
    ISettingRegistry,
    IThemeManager
  ],
  provides: IRenderMimeRegistry,
  activate: activate,
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

const DEBUGGER_OPEN_SOURCE = 'debugger:open-source';

/**
 * Activate the rendermine plugin.
 */
function activate(
  app: JupyterFrontEnd,
  docManager: IDocumentManager | null,
  latexTypesetter: ILatexTypesetter | null,
  sanitizer: IRenderMime.ISanitizer | null,
  markdownParser: IMarkdownParser | null,
  translator: ITranslator | null,
  settingsRegistry: ISettingRegistry | null,
  themeManager: IThemeManager | null
): RenderMimeRegistry {
  const trans = (translator ?? nullTranslator).load('jupyterlab');

  // Set up error background color management
  let currentSettings: ISettingRegistry.ISettings | null = null;

  const loadSettings = () => {
    if (!currentSettings || !themeManager) {
      return;
    }

    // Detect if current theme is light or dark
    const isLight = themeManager.theme
      ? themeManager.isLight(themeManager.theme)
      : true;

    // Get the appropriate color from theme
    const settingKey = isLight ? 'errorBackgroundLight' : 'errorBackgroundDark';
    const color = currentSettings.get(settingKey).composite as string;

    // Update the CSS variable
    document.documentElement.style.setProperty(
      '--jp-rendermime-error-background',
      color
    );
  };

  // Initial load of settings
  if (settingsRegistry) {
    settingsRegistry
      .load(plugin.id)
      .then(settings => {
        currentSettings = settings;

        // Initial update
        loadSettings();

        // Update when settings change
        settings.changed.connect(loadSettings);
      })
      .catch(console.error);
  }

  // Update when theme changes
  if (themeManager) {
    themeManager.themeChanged.connect(loadSettings);
  }

  if (docManager) {
    app.commands.addCommand(CommandIDs.handleLink, {
      label: trans.__('Handle Local Link'),
      execute: args => {
        const path = args['path'] as string | undefined | null;
        const id = args['id'] as string | undefined | null;
        const scope = (args['scope'] as string | undefined | null) || 'server';
        if (!path) {
          return;
        }
        if (scope === 'kernel') {
          // Note: using a command instead of requiring
          // `IDebuggerSourceViewer` to avoid a dependency cycle.
          if (!app.commands.hasCommand(DEBUGGER_OPEN_SOURCE)) {
            console.warn(
              'Cannot open kernel file: debugger sources provider not available'
            );
            return;
          }
          return app.commands.execute(DEBUGGER_OPEN_SOURCE, { path });
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
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: trans.__('The file path to open')
            },
            id: {
              type: 'string',
              description: trans.__('Fragment identifier to navigate to')
            },
            scope: {
              type: 'string',
              enum: ['kernel', 'server'],
              description: trans.__('Scope of the file location')
            }
          },
          required: ['path']
        }
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
          },
          handlePath: (
            node: HTMLElement,
            path: string,
            scope: 'kernel' | 'server',
            id?: string
          ) => {
            app.commandLinker.connectNode(node, CommandIDs.handleLink, {
              path,
              id,
              scope
            });
          }
        },
    latexTypesetter: latexTypesetter ?? undefined,
    markdownParser: markdownParser ?? undefined,
    translator: translator ?? undefined,
    sanitizer: sanitizer ?? undefined
  });
}
