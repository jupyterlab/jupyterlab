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
  ISearchKeyBindings,
  ISearchProviderRegistry,
  SearchDocumentModel,
  SearchDocumentView,
  SearchProviderRegistry
} from '@jupyterlab/documentsearch';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

/**
 * Class added to widgets that can be searched (have a search provider).
 */
const SEARCHABLE_CLASS = 'jp-mod-searchable';
/**
 * Class added to widgets with open search view (not necessarily focused).
 */
const SEARCH_ACTIVE_CLASS = 'jp-mod-search-active';

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
  /**
   * Toggle search in selection
   */
  export const toggleSearchInSelection =
    'documentsearch:toggleSearchInSelection';
}

/**
 * When automatic selection search filter logic should be active.
 *
 * - `multiple-selected`: when multiple lines/cells are selected
 * - `any-selected`: when any number of characters/cells are selected
 * - `never`: never
 */
type AutoSearchInSelection = 'never' | 'multiple-selected' | 'any-selected';

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

type KeyBindingsCache = Record<
  'next' | 'previous' | 'toggleSearchInSelection',
  CommandRegistry.IKeyBinding | undefined
>;

/**
 * Exposes the current keybindings to search box view.
 */
class SearchKeyBindings implements ISearchKeyBindings {
  constructor(private _commandRegistry: CommandRegistry) {
    this._cache = this._buildCache();
    this._commandRegistry.keyBindingChanged.connect(this._rebuildCache, this);
  }

  get next() {
    return this._cache.next;
  }

  get previous() {
    return this._cache.previous;
  }

  get toggleSearchInSelection() {
    return this._cache.toggleSearchInSelection;
  }

  private _rebuildCache() {
    this._cache = this._buildCache();
  }

  private _buildCache(): KeyBindingsCache {
    const next = this._commandRegistry.keyBindings.find(
      binding => binding.command === CommandIDs.findNext
    );
    const previous = this._commandRegistry.keyBindings.find(
      binding => binding.command === CommandIDs.findPrevious
    );
    const toggleSearchInSelection = this._commandRegistry.keyBindings.find(
      binding => binding.command === CommandIDs.toggleSearchInSelection
    );
    return {
      next,
      previous,
      toggleSearchInSelection
    };
  }

  dispose() {
    this._commandRegistry.keyBindingChanged.disconnect(
      this._rebuildCache,
      this
    );
  }

  private _cache: KeyBindingsCache;
}

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
    let autoSearchInSelection: AutoSearchInSelection = 'never';

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
        autoSearchInSelection = settings.get('autoSearchInSelection')
          .composite as AutoSearchInSelection;
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

        const keyBingingsInfo = new SearchKeyBindings(app.commands);

        const newView = new SearchDocumentView(
          searchModel,
          translator,
          keyBingingsInfo
        );

        searchViews.set(widgetId, newView);
        // find next, previous and end are now enabled
        [
          CommandIDs.findNext,
          CommandIDs.findPrevious,
          CommandIDs.end,
          CommandIDs.toggleSearchInSelection
        ].forEach(id => {
          app.commands.notifyCommandChanged(id);
        });

        /**
         * Activate the target widget when the search panel is closing
         */
        newView.closed.connect(() => {
          if (!widget.isDisposed) {
            widget.activate();
            widget.removeClass(SEARCH_ACTIVE_CLASS);
          }
        });

        /**
         * Remove from mapping when the search view is disposed.
         */
        newView.disposed.connect(() => {
          if (!widget.isDisposed) {
            widget.activate();
            widget.removeClass(SEARCH_ACTIVE_CLASS);
          }
          searchViews.delete(widgetId);
          // find next, previous and end are now disabled
          [
            CommandIDs.findNext,
            CommandIDs.findPrevious,
            CommandIDs.end,
            CommandIDs.toggleSearchInSelection
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
          keyBingingsInfo.dispose();
        });

        searchView = newView;
      }

      if (!searchView.isAttached) {
        Widget.attach(searchView, widget.node);
        widget.addClass(SEARCH_ACTIVE_CLASS);
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
      execute: async args => {
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
          const selectionState = searchWidget.model.selectionState;

          let enableSelectionMode = false;
          switch (autoSearchInSelection) {
            case 'multiple-selected':
              enableSelectionMode = selectionState === 'multiple';
              break;
            case 'any-selected':
              enableSelectionMode =
                selectionState === 'multiple' || selectionState === 'single';
              break;
            case 'never':
              // no-op
              break;
          }
          if (enableSelectionMode) {
            await searchWidget.model.setFilter('selection', true);
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

    app.commands.addCommand(CommandIDs.toggleSearchInSelection, {
      label: trans.__('Search in Selection'),
      isEnabled: () =>
        !!app.shell.currentWidget &&
        searchViews.has(app.shell.currentWidget.id) &&
        'selection' in
          searchViews.get(app.shell.currentWidget.id)!.model.filtersDefinition,
      execute: async () => {
        const currentWidget = app.shell.currentWidget;
        if (!currentWidget) {
          return;
        }
        const model = searchViews.get(currentWidget.id)?.model;
        if (!model) {
          return;
        }

        const currentValue = model.filters['selection'];
        return model.setFilter('selection', !currentValue);
      }
    });

    app.shell.currentChanged?.connect(() => {
      Object.values(CommandIDs).forEach(cmd => {
        app.commands.notifyCommandChanged(cmd);
      });
    });

    // Add the command to the palette.
    if (palette) {
      [
        CommandIDs.search,
        CommandIDs.findNext,
        CommandIDs.findPrevious,
        CommandIDs.end,
        CommandIDs.toggleSearchInSelection
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
