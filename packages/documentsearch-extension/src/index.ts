// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  ISearchProviderRegistry,
  SearchInstance,
  SearchProviderRegistry,
  CodeMirrorSearchProvider,
  NotebookSearchProvider
} from '@jupyterlab/documentsearch';

import { IMainMenu } from '@jupyterlab/mainmenu';
import { Widget } from '@lumino/widgets';

const SEARCHABLE_CLASS = 'jp-mod-searchable';

const labShellWidgetListener: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/documentsearch:labShellWidgetListener',
  requires: [ILabShell, ISearchProviderRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    registry: ISearchProviderRegistry
  ) => {
    // If a given widget is searchable, apply the searchable class.
    // If it's not searchable, remove the class.
    const transformWidgetSearchability = (widget: Widget | null) => {
      if (!widget) {
        return;
      }
      const providerForWidget = registry.getProviderForWidget(widget);
      if (providerForWidget) {
        widget.addClass(SEARCHABLE_CLASS);
      }
      if (!providerForWidget) {
        widget.removeClass(SEARCHABLE_CLASS);
      }
    };

    // Update searchability of the active widget when the registry
    // changes, in case a provider for the current widget was added
    // or removed
    registry.changed.connect(() =>
      transformWidgetSearchability(labShell.activeWidget)
    );

    // Apply the searchable class only to the active widget if it is actually
    // searchable. Remove the searchable class from a widget when it's
    // no longer active.
    labShell.activeChanged.connect((_, args) => {
      const oldWidget = args.oldValue;
      if (oldWidget) {
        oldWidget.removeClass(SEARCHABLE_CLASS);
      }
      transformWidgetSearchability(args.newValue);
    });
  }
};

/**
 * Initialization data for the document-search extension.
 */
const extension: JupyterFrontEndPlugin<ISearchProviderRegistry> = {
  id: '@jupyterlab/documentsearch:plugin',
  provides: ISearchProviderRegistry,
  optional: [ICommandPalette, IMainMenu],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    mainMenu: IMainMenu | null
  ) => {
    // Create registry, retrieve all default providers
    const registry: SearchProviderRegistry = new SearchProviderRegistry();

    // Register default implementations of the Notebook and CodeMirror search providers
    registry.register('jp-notebookSearchProvider', NotebookSearchProvider);
    registry.register('jp-codeMirrorSearchProvider', CodeMirrorSearchProvider);

    const activeSearches = new Map<string, SearchInstance>();

    const startCommand: string = 'documentsearch:start';
    const startReplaceCommand: string = 'documentsearch:startWithReplace';
    const nextCommand: string = 'documentsearch:highlightNext';
    const prevCommand: string = 'documentsearch:highlightPrevious';

    const currentWidgetHasSearchProvider = () => {
      const currentWidget = app.shell.currentWidget;
      if (!currentWidget) {
        return false;
      }
      return registry.getProviderForWidget(currentWidget) !== undefined;
    };
    const getCurrentWidgetSearchInstance = () => {
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
      return searchInstance;
    };

    app.commands.addCommand(startCommand, {
      label: 'Find…',
      isEnabled: currentWidgetHasSearchProvider,
      execute: () => {
        const searchInstance = getCurrentWidgetSearchInstance();
        if (searchInstance) {
          searchInstance.focusInput();
        }
      }
    });

    app.commands.addCommand(startReplaceCommand, {
      label: 'Find and Replace…',
      isEnabled: currentWidgetHasSearchProvider,
      execute: () => {
        const searchInstance = getCurrentWidgetSearchInstance();
        if (searchInstance) {
          searchInstance.showReplace();
          searchInstance.focusInput();
        }
      }
    });

    app.commands.addCommand(nextCommand, {
      label: 'Find Next',
      isEnabled: () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return false;
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
          return false;
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
    if (palette) {
      palette.addItem({ command: startCommand, category: 'Main Area' });
      palette.addItem({ command: nextCommand, category: 'Main Area' });
      palette.addItem({ command: prevCommand, category: 'Main Area' });
    }
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

export default [extension, labShellWidgetListener];
