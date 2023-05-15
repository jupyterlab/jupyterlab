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
import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';
import {
  ISearchProviderRegistry,
  SearchDocumentModel,
  SearchDocumentView,
  SearchProviderRegistry
} from '@jupyterlab/documentsearch';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';

const SEARCHABLE_CLASS = 'jp-mod-searchable';

namespace CommandIDs {
  /**
   * Start search in a document
   */
  export const search = 'documentsearch:start';
  /**
   * Start search and replace in a document
   */
  export const searchAndReplace = 'documentsearch:startWithReplace';
  /**
   * Find next search match
   */
  export const findNext = 'documentsearch:highlightNext';
  /**
   * Find previous search match
   */
  export const findPrevious = 'documentsearch:highlightPrevious';
  /**
   * End search in a document
   */
  export const end = 'documentsearch:end';
}

const labShellWidgetListener: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/documentsearch-extension:labShellWidgetListener',
  description: 'Active search on valid document',
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
      if (registry.hasProvider(widget)) {
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
  description: 'Provides the document search registry.',
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

    const searchViews = new Map<string, SearchDocumentView>();

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

    const isEnabled = () => {
      const widget = app.shell.currentWidget;
      if (!widget) {
        return false;
      }
      return registry.hasProvider(widget);
    };

    const getSearchWidget = (widget: Widget | null) => {
      if (!widget) {
        return;
      }
      const widgetId = widget.id;
      let searchView = searchViews.get(widgetId);
      if (!searchView) {
        const searchProvider = registry.getProvider(widget);
        if (!searchProvider) {
          return;
        }
        const searchModel = new SearchDocumentModel(
          searchProvider,
          searchDebounceTime
        );

        const newView = new SearchDocumentView(searchModel, translator);

        searchViews.set(widgetId, newView);
        // find next, previous and end are now enabled
        [CommandIDs.findNext, CommandIDs.findPrevious, CommandIDs.end].forEach(
          id => {
            app.commands.notifyCommandChanged(id);
          }
        );

        /**
         * Activate the target widget when the search panel is closing
         */
        newView.closed.connect(() => {
          if (!widget.isDisposed) {
            widget.activate();
          }
        });

        /**
         * Remove from mapping when the search view is disposed.
         */
        newView.disposed.connect(() => {
          if (!widget.isDisposed) {
            widget.activate();
          }
          searchViews.delete(widgetId);
          // find next, previous and end are now disabled
          [
            CommandIDs.findNext,
            CommandIDs.findPrevious,
            CommandIDs.end
          ].forEach(id => {
            app.commands.notifyCommandChanged(id);
          });
        });

        /**
         * Dispose resources when the widget is disposed.
         */
        widget.disposed.connect(() => {
          newView.dispose();
          searchModel.dispose();
          searchProvider.dispose();
        });

        searchView = newView;
      }

      if (!searchView.isAttached) {
        Widget.attach(searchView, widget.node);
        if (widget instanceof MainAreaWidget) {
          // Offset the position of the search widget to not cover the toolbar nor the content header.
          // TODO this does not update once the search widget is displayed.
          searchView.node.style.top = `${
            widget.toolbar.node.getBoundingClientRect().height +
            widget.contentHeader.node.getBoundingClientRect().height
          }px`;
        }
        if (searchView.model.searchExpression) {
          searchView.model.refresh();
        }
      }
      return searchView;
    };

    app.commands.addCommand(CommandIDs.search, {
      label: trans.__('Find…'),
      isEnabled: isEnabled,
      execute: args => {
        const searchWidget = getSearchWidget(app.shell.currentWidget);
        if (searchWidget) {
          const searchText = args['searchText'] as string;
          if (searchText) {
            searchWidget.setSearchText(searchText);
          } else {
            searchWidget.setSearchText(
              searchWidget.model.suggestedInitialQuery
            );
          }
          searchWidget.focusSearchInput();
        }
      }
    });

    app.commands.addCommand(CommandIDs.searchAndReplace, {
      label: trans.__('Find and Replace…'),
      isEnabled: isEnabled,
      execute: args => {
        const searchWidget = getSearchWidget(app.shell.currentWidget);
        if (searchWidget) {
          const searchText = args['searchText'] as string;
          if (searchText) {
            searchWidget.setSearchText(searchText);
          } else {
            searchWidget.setSearchText(
              searchWidget.model.suggestedInitialQuery
            );
          }
          const replaceText = args['replaceText'] as string;
          if (replaceText) {
            searchWidget.setReplaceText(replaceText);
          }
          searchWidget.showReplace();
          searchWidget.focusSearchInput();
        }
      }
    });

    app.commands.addCommand(CommandIDs.findNext, {
      label: trans.__('Find Next'),
      isEnabled: () =>
        !!app.shell.currentWidget &&
        searchViews.has(app.shell.currentWidget.id),
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }

        await searchViews.get(currentWidget.id)?.model.highlightNext();
      }
    });

    app.commands.addCommand(CommandIDs.findPrevious, {
      label: trans.__('Find Previous'),
      isEnabled: () =>
        !!app.shell.currentWidget &&
        searchViews.has(app.shell.currentWidget.id),
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }

        await searchViews.get(currentWidget.id)?.model.highlightPrevious();
      }
    });

    app.commands.addCommand(CommandIDs.end, {
      label: trans.__('End Search'),
      isEnabled: () =>
        !!app.shell.currentWidget &&
        searchViews.has(app.shell.currentWidget.id),
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }

        searchViews.get(currentWidget.id)?.close();
      }
    });

    // Add the command to the palette.
    if (palette) {
      [
        CommandIDs.search,
        CommandIDs.findNext,
        CommandIDs.findPrevious,
        CommandIDs.end
      ].forEach(command => {
        palette.addItem({
          command,
          category: trans.__('Main Area')
        });
      });
    }

    // Provide the registry to the system.
    return registry;
  }
};

export default [extension, labShellWidgetListener];
