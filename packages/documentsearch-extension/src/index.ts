// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  ISearchProviderRegistry,
  SearchInstance,
  SearchProviderRegistry
} from '@jupyterlab/documentsearch';

import { IMainMenu } from '@jupyterlab/mainmenu';

/**
 * Initialization data for the document-search extension.
 */
const extension: JupyterFrontEndPlugin<ISearchProviderRegistry> = {
  id: '@jupyterlab/documentsearch:plugin',
  provides: ISearchProviderRegistry,
  requires: [ICommandPalette],
  optional: [IMainMenu],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    mainMenu: IMainMenu | null
  ) => {
    // Create registry, retrieve all default providers
    const registry: SearchProviderRegistry = new SearchProviderRegistry();
    // TODO: Should register the default providers, with an application-specific
    // enabler.

    const activeSearches = new Map<string, SearchInstance>();

    const startCommand: string = 'documentsearch:start';
    const nextCommand: string = 'documentsearch:highlightNext';
    const prevCommand: string = 'documentsearch:highlightPrevious';
    app.commands.addCommand(startCommand, {
      label: 'Find…',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        return registry.getProviderForWidget(currentWidget) !== undefined;
      },
      execute: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const widgetId = currentWidget.id;
        let searchInstance = activeSearches.get(widgetId);
        if (!searchInstance) {
          const searchProvider = registry.getProviderForWidget(currentWidget);
          if (!searchProvider) {
            return;
          }
          searchInstance = new SearchInstance(currentWidget, searchProvider);

          activeSearches.set(widgetId, searchInstance);
          // find next and previous are now enabled
          app.commands.notifyCommandChanged();

          searchInstance.disposed.connect(() => {
            activeSearches.delete(widgetId);
            // find next and previous are now not enabled
            app.commands.notifyCommandChanged();
          });
        }
        searchInstance.focusInput();
      }
    });

    app.commands.addCommand(nextCommand, {
      label: 'Find Next',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        return activeSearches.has(currentWidget.id);
      },
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const instance = activeSearches.get(currentWidget.id);
        if (!instance) {
          return;
        }

        await instance.provider.highlightNext();
        instance.updateIndices();
      }
    });

    app.commands.addCommand(prevCommand, {
      label: 'Find Previous',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        return activeSearches.has(currentWidget.id);
      },
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const instance = activeSearches.get(currentWidget.id);
        if (!instance) {
          return;
        }

        await instance.provider.highlightPrevious();
        instance.updateIndices();
      }
    });

    // Add the command to the palette.
    palette.addItem({ command: startCommand, category: 'Main Area' });
    palette.addItem({ command: nextCommand, category: 'Main Area' });
    palette.addItem({ command: prevCommand, category: 'Main Area' });

    // Add main menu notebook menu.
    if (mainMenu) {
      mainMenu.editMenu.addGroup(
        [
          { command: startCommand },
          { command: nextCommand },
          { command: prevCommand }
        ],
        10
      );
    }

    // Provide the registry to the system.
    return registry;
  }
};

export default extension;
