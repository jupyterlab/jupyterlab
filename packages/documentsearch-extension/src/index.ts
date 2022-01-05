// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module documentsearch-extension
 */

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  ISearchProviderRegistry,
  SearchInstance,
  SearchProviderRegistry
} from '@jupyterlab/documentsearch';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
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
      } else {
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
  id: '@jupyterlab/documentsearch-extension:plugin',
  provides: ISearchProviderRegistry,
  requires: [ITranslator],
  optional: [ICommandPalette, ISettingRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry | null
  ) => {
    const trans = translator.load('jupyterlab');

    let searchDebounceTime = 500;

    // Create registry
    const registry: SearchProviderRegistry = new SearchProviderRegistry(
      translator
    );

    const activeSearches = new Map<string, SearchInstance>();

    const startCommand: string = 'documentsearch:start';
    const startReplaceCommand: string = 'documentsearch:startWithReplace';
    const nextCommand: string = 'documentsearch:highlightNext';
    const prevCommand: string = 'documentsearch:highlightPrevious';

    if (settingRegistry) {
      const loadSettings = settingRegistry.load(extension.id);
      const updateSettings = (settings: ISettingRegistry.ISettings): void => {
        searchDebounceTime = settings.get('searchDebounceTime')
          .composite as number;
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
        searchInstance = new SearchInstance(
          currentWidget,
          searchProvider,
          searchDebounceTime,
          translator
        );

        activeSearches.set(widgetId, searchInstance);
        // find next and previous are now enabled
        app.commands.notifyCommandChanged();

        searchInstance.disposed.connect(() => {
          activeSearches.delete(widgetId);
          searchProvider.dispose();
          // find next and previous are now not enabled
          app.commands.notifyCommandChanged();
        });
      }
      return searchInstance;
    };

    app.commands.addCommand(startCommand, {
      label: trans.__('Find…'),
      isEnabled: currentWidgetHasSearchProvider,
      execute: args => {
        const searchInstance = getCurrentWidgetSearchInstance();
        if (searchInstance) {
          const searchText = args['searchText'] as string;
          if (searchText) {
            searchInstance.setSearchText(searchText);
          }
          searchInstance.focusInput();
        }
      }
    });

    app.commands.addCommand(startReplaceCommand, {
      label: trans.__('Find and Replace…'),
      isEnabled: currentWidgetHasSearchProvider,
      execute: args => {
        const searchInstance = getCurrentWidgetSearchInstance();
        if (searchInstance) {
          const searchText = args['searchText'] as string;
          if (searchText) {
            searchInstance.setSearchText(searchText);
          }
          const replaceText = args['replaceText'] as string;
          if (replaceText) {
            searchInstance.setReplaceText(replaceText);
          }
          searchInstance.showReplace();
          searchInstance.focusInput();
        }
      }
    });

    app.commands.addCommand(nextCommand, {
      label: trans.__('Find Next'),
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
      label: trans.__('Find Previous'),
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
      palette.addItem({
        command: startCommand,
        category: trans.__('Main Area')
      });
      palette.addItem({
        command: nextCommand,
        category: trans.__('Main Area')
      });
      palette.addItem({
        command: prevCommand,
        category: trans.__('Main Area')
      });
    }

    // Provide the registry to the system.
    return registry;
  }
};

export default [extension, labShellWidgetListener];
