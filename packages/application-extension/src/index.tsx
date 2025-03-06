// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module application-extension
 */

import {
  ConnectionLost,
  IConnectionLost,
  ILabShell,
  ILabStatus,
  ILayoutRestorer,
  IRouter,
  ITreePathUpdater,
  JupyterFrontEnd,
  JupyterFrontEndContextMenu,
  JupyterFrontEndPlugin,
  JupyterLab,
  LabShell,
  LayoutRestorer,
  Router
} from '@jupyterlab/application';
import {
  Dialog,
  ICommandPalette,
  IWindowResolver,
  MenuFactory,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import {
  IPropertyInspectorProvider,
  SideBarPropertyInspectorProvider
} from '@jupyterlab/property-inspector';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { IStatusBar } from '@jupyterlab/statusbar';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  buildIcon,
  ContextMenuSvg,
  jupyterIcon,
  RankedMenu,
  Switch
} from '@jupyterlab/ui-components';
import { find, some } from '@lumino/algorithm';
import {
  JSONExt,
  PromiseDelegate,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { DisposableDelegate, DisposableSet } from '@lumino/disposable';
import { DockLayout, DockPanel, Widget } from '@lumino/widgets';
import * as React from 'react';
import { topbar } from './topbar';

/**
 * Default context menu item rank
 */
export const DEFAULT_CONTEXT_ITEM_RANK = 100;

/**
 * The command IDs used by the application plugin.
 */
namespace CommandIDs {
  export const activateNextTab: string = 'application:activate-next-tab';

  export const activatePreviousTab: string =
    'application:activate-previous-tab';

  export const activateNextTabBar: string = 'application:activate-next-tab-bar';

  export const activatePreviousTabBar: string =
    'application:activate-previous-tab-bar';

  export const close = 'application:close';

  export const closeOtherTabs = 'application:close-other-tabs';

  export const closeRightTabs = 'application:close-right-tabs';

  export const closeAll: string = 'application:close-all';

  export const setMode: string = 'application:set-mode';

  export const showPropertyPanel: string = 'property-inspector:show-panel';

  export const resetLayout: string = 'application:reset-layout';

  export const toggleContextMenu: string = 'application:toggle-context-menu';

  export const toggleHeader: string = 'application:toggle-header';

  export const toggleMode: string = 'application:toggle-mode';

  export const toggleLeftArea: string = 'application:toggle-left-area';

  export const toggleRightArea: string = 'application:toggle-right-area';

  export const toggleSideTabBar: string = 'application:toggle-side-tabbar';

  export const toggleSidebarWidget: string =
    'application:toggle-sidebar-widget';

  export const togglePresentationMode: string =
    'application:toggle-presentation-mode';

  export const toggleFullscreenMode: string =
    'application:toggle-fullscreen-mode';

  export const tree: string = 'router:tree';

  export const switchSidebar = 'sidebar:switch';
}

/**
 * A plugin to register the commands for the main application.
 */
const mainCommands: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:commands',
  description: 'Adds commands related to the shell.',
  autoStart: true,
  requires: [ITranslator],
  optional: [ILabShell, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    labShell: ILabShell | null,
    palette: ICommandPalette | null
  ) => {
    const { commands, shell } = app;
    const trans = translator.load('jupyterlab');
    const category = trans.__('Main Area');

    // Add Command to override the JLab context menu.
    commands.addCommand(JupyterFrontEndContextMenu.contextMenu, {
      label: trans.__('Shift+Right Click for Browser Menu'),
      isEnabled: () => false,
      execute: () => void 0
    });

    // Returns the widget associated with the most recent contextmenu event.
    const contextMenuWidget = (): Widget | null => {
      const test = (node: HTMLElement) => !!node.dataset.id;
      const node = app.contextMenuHitTest(test);

      if (!node) {
        // Fall back to active widget if path cannot be obtained from event.
        return shell.currentWidget;
      }

      return (
        find(shell.widgets('main'), widget => widget.id === node.dataset.id) ||
        shell.currentWidget
      );
    };

    // Closes an array of widgets.
    const closeWidgets = (widgets: Array<Widget>): void => {
      widgets.forEach(widget => widget.close());
    };

    // Find the tab area for a widget within a specific dock area.
    const findTab = (
      area: DockLayout.AreaConfig,
      widget: Widget
    ): DockLayout.ITabAreaConfig | null => {
      if (area.type === 'tab-area') {
        return area.widgets.includes(widget) ? area : null;
      }
      if (area.type === 'split-area') {
        for (const child of area.children) {
          const found = findTab(child, widget);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    // Find the tab area for a widget within the main dock area.
    const tabAreaFor = (widget: Widget): DockLayout.ITabAreaConfig | null => {
      const layout = labShell?.saveLayout();
      const mainArea = layout?.mainArea;
      if (!mainArea || PageConfig.getOption('mode') !== 'multiple-document') {
        return null;
      }
      const area = mainArea.dock?.main;
      return area ? findTab(area, widget) : null;
    };

    // Returns an array of all widgets to the right of a widget in a tab area.
    const widgetsRightOf = (widget: Widget): Array<Widget> => {
      const { id } = widget;
      const tabArea = tabAreaFor(widget);
      const widgets = tabArea ? tabArea.widgets || [] : [];
      const index = widgets.findIndex(widget => widget.id === id);
      if (index < 0) {
        return [];
      }
      return widgets.slice(index + 1);
    };

    // Gets and returns the dataId of currently active tab in the specified sidebar (left or right)
    // or an empty string
    const activeSidePanelWidget = (side: string): string => {
      // default active element is luancher (luancher-0)
      let activeTab;
      if (side != 'left' && side != 'right') {
        throw Error(`Unsupported sidebar: ${side}`);
      }
      if (side === 'left') {
        activeTab = document.querySelector('.lm-TabBar-tab.lm-mod-current');
      } else {
        const query = document.querySelectorAll(
          '.lm-TabBar-tab.lm-mod-current'
        );
        activeTab = query[query.length - 1];
      }
      const activeTabDataId = activeTab?.getAttribute('data-id');
      if (activeTabDataId) {
        return activeTabDataId?.toString();
      } else {
        return '';
      }
    };

    // Sets tab focus on the element
    function setTabFocus(focusElement: HTMLElement | null) {
      if (focusElement) {
        focusElement.focus();
      }
    }

    commands.addCommand(CommandIDs.close, {
      label: () => trans.__('Close Tab'),
      isEnabled: () => {
        const widget = contextMenuWidget();
        return !!widget && widget.title.closable;
      },
      execute: () => {
        const widget = contextMenuWidget();
        if (widget) {
          widget.close();
        }
      }
    });

    commands.addCommand(CommandIDs.closeOtherTabs, {
      label: () => trans.__('Close All Other Tabs'),
      isEnabled: () => {
        // Ensure there are at least two widgets.
        return some(shell.widgets('main'), (_, i) => i === 1);
      },
      execute: () => {
        const widget = contextMenuWidget();
        if (!widget) {
          return;
        }
        const { id } = widget;
        for (const widget of shell.widgets('main')) {
          if (widget.id !== id) {
            widget.close();
          }
        }
      }
    });

    commands.addCommand(CommandIDs.closeRightTabs, {
      label: () => trans.__('Close Tabs to Right'),
      isEnabled: () =>
        !!contextMenuWidget() &&
        widgetsRightOf(contextMenuWidget()!).length > 0,
      execute: () => {
        const widget = contextMenuWidget();
        if (!widget) {
          return;
        }
        closeWidgets(widgetsRightOf(widget));
      }
    });

    shell.currentChanged?.connect(() => {
      [
        CommandIDs.close,
        CommandIDs.closeOtherTabs,
        CommandIDs.closeRightTabs
      ].forEach(cmd => commands.notifyCommandChanged(cmd));
    });

    if (labShell) {
      commands.addCommand(CommandIDs.activateNextTab, {
        label: trans.__('Activate Next Tab'),
        execute: () => {
          labShell.activateNextTab();
        }
      });

      commands.addCommand(CommandIDs.activatePreviousTab, {
        label: trans.__('Activate Previous Tab'),
        execute: () => {
          labShell.activatePreviousTab();
        }
      });

      commands.addCommand(CommandIDs.activateNextTabBar, {
        label: trans.__('Activate Next Tab Bar'),
        execute: () => {
          labShell.activateNextTabBar();
        }
      });

      commands.addCommand(CommandIDs.activatePreviousTabBar, {
        label: trans.__('Activate Previous Tab Bar'),
        execute: () => {
          labShell.activatePreviousTabBar();
        }
      });

      commands.addCommand(CommandIDs.closeAll, {
        label: trans.__('Close All Tabs'),
        execute: () => {
          labShell.closeAll();
        }
      });

      commands.addCommand(CommandIDs.toggleHeader, {
        label: trans.__('Show Header'),
        execute: () => {
          if (labShell.mode === 'single-document') {
            labShell.toggleTopInSimpleModeVisibility();
          }
        },
        isToggled: () => labShell.isTopInSimpleModeVisible(),
        isVisible: () => labShell.mode === 'single-document'
      });

      commands.addCommand(CommandIDs.toggleLeftArea, {
        label: trans.__('Show Left Sidebar'),
        execute: () => {
          if (labShell.leftCollapsed) {
            labShell.expandLeft();
          } else {
            labShell.collapseLeft();
            if (labShell.currentWidget) {
              labShell.activateById(labShell.currentWidget.id);
            }
          }
        },
        isToggled: () => !labShell.leftCollapsed,
        isEnabled: () => !labShell.isEmpty('left')
      });

      commands.addCommand(CommandIDs.toggleRightArea, {
        label: trans.__('Show Right Sidebar'),
        execute: () => {
          if (labShell.rightCollapsed) {
            labShell.expandRight();
          } else {
            labShell.collapseRight();
            if (labShell.currentWidget) {
              labShell.activateById(labShell.currentWidget.id);
            }
          }
        },
        isToggled: () => !labShell.rightCollapsed,
        isEnabled: () => !labShell.isEmpty('right')
      });

      commands.addCommand(CommandIDs.toggleSidebarWidget, {
        label: args =>
          args === undefined ||
          args.side === undefined ||
          args.index === undefined
            ? trans.__('Toggle Sidebar Element')
            : args.side === 'right'
            ? trans.__(
                'Toggle Element %1 in Right Sidebar',
                parseInt(args.index as string, 10) + 1
              )
            : trans.__(
                'Toggle Element %1 in Left Sidebar',
                parseInt(args.index as string, 10) + 1
              ),
        execute: args => {
          const index = parseInt(args.index as string, 10);
          if (args.side != 'left' && args.side != 'right') {
            throw Error(`Unsupported sidebar: ${args.side}`);
          }
          const widgets = Array.from(labShell.widgets(args.side));
          if (index >= widgets.length) {
            return;
          }
          const widgetId = widgets[index].id;
          const focusElement: HTMLElement | null = document.querySelector(
            "[data-id='" + widgetId + "']"
          );
          if (activeSidePanelWidget(args.side) === widgetId) {
            if (args.side == 'left') {
              labShell.collapseLeft();
              setTabFocus(focusElement);
            }
            if (args.side == 'right') {
              labShell.collapseRight();
              setTabFocus(focusElement);
            }
          } else {
            labShell.activateById(widgetId);
            setTabFocus(focusElement);
          }
        }
      });

      commands.addCommand(CommandIDs.toggleSideTabBar, {
        label: args =>
          args.side === 'right'
            ? trans.__('Show Right Activity Bar')
            : trans.__('Show Left Activity Bar'),
        execute: args => {
          if (args.side === 'right') {
            labShell.toggleSideTabBarVisibility('right');
          } else {
            labShell.toggleSideTabBarVisibility('left');
          }
        },
        isToggled: args =>
          args.side === 'right'
            ? labShell.isSideTabBarVisible('right')
            : labShell.isSideTabBarVisible('left'),
        isEnabled: args =>
          args.side === 'right'
            ? !labShell.isEmpty('right')
            : !labShell.isEmpty('left')
      });

      commands.addCommand(CommandIDs.togglePresentationMode, {
        label: () => trans.__('Presentation Mode'),
        execute: () => {
          labShell.presentationMode = !labShell.presentationMode;
        },
        isToggled: () => labShell.presentationMode,
        isVisible: () => true
      });

      commands.addCommand(CommandIDs.toggleFullscreenMode, {
        label: trans.__('Fullscreen Mode'),
        execute: () => {
          if (
            document.fullscreenElement === null ||
            document.fullscreenElement === undefined
          ) {
            document.documentElement.requestFullscreen().catch(reason => {
              console.error('Failed to enter fullscreen mode.', reason);
            });
          } else if (document.fullscreenElement !== null) {
            document.exitFullscreen().catch(reason => {
              console.error('Failed to exit fullscreen mode.', reason);
            });
          }
        },
        isToggled: () => document.fullscreenElement !== null
      });

      commands.addCommand(CommandIDs.setMode, {
        label: args =>
          args['mode']
            ? trans.__('Set %1 mode.', args['mode'])
            : trans.__('Set the layout `mode`.'),
        caption: trans.__(
          'The layout `mode` can be "single-document" or "multiple-document".'
        ),
        isVisible: args => {
          const mode = args['mode'] as string;
          return mode === 'single-document' || mode === 'multiple-document';
        },
        execute: args => {
          const mode = args['mode'] as string;
          if (mode === 'single-document' || mode === 'multiple-document') {
            labShell.mode = mode;
            return;
          }
          throw new Error(`Unsupported application shell mode: ${mode}`);
        }
      });

      commands.addCommand(CommandIDs.toggleMode, {
        label: trans.__('Simple Interface'),
        isToggled: () => labShell.mode === 'single-document',
        execute: () => {
          const args =
            labShell.mode === 'multiple-document'
              ? { mode: 'single-document' }
              : { mode: 'multiple-document' };
          return commands.execute(CommandIDs.setMode, args);
        }
      });

      commands.addCommand(CommandIDs.resetLayout, {
        label: trans.__('Reset Default Layout'),
        execute: () => {
          // Turn off presentation mode
          if (labShell.presentationMode) {
            commands
              .execute(CommandIDs.togglePresentationMode)
              .catch(reason => {
                console.error('Failed to undo presentation mode.', reason);
              });
          }
          // Turn off fullscreen mode
          if (
            document.fullscreenElement !== null ||
            document.fullscreenElement !== undefined
          ) {
            commands.execute(CommandIDs.toggleFullscreenMode).catch(reason => {
              console.error('Failed to exit fullscreen mode.', reason);
            });
          }
          // Display top header
          if (
            labShell.mode === 'single-document' &&
            !labShell.isTopInSimpleModeVisible()
          ) {
            commands.execute(CommandIDs.toggleHeader).catch(reason => {
              console.error('Failed to display title header.', reason);
            });
          }
          // Display side tabbar
          (['left', 'right'] as ('left' | 'right')[]).forEach(side => {
            if (
              !labShell.isSideTabBarVisible(side) &&
              !labShell.isEmpty(side)
            ) {
              commands
                .execute(CommandIDs.toggleSideTabBar, { side })
                .catch(reason => {
                  console.error(`Failed to show ${side} activity bar.`, reason);
                });
            }
          });

          // Some actions are also trigger indirectly
          // - by listening to this command execution.
        }
      });
    }

    if (palette) {
      [
        CommandIDs.activateNextTab,
        CommandIDs.activatePreviousTab,
        CommandIDs.activateNextTabBar,
        CommandIDs.activatePreviousTabBar,
        CommandIDs.close,
        CommandIDs.closeAll,
        CommandIDs.closeOtherTabs,
        CommandIDs.closeRightTabs,
        CommandIDs.toggleHeader,
        CommandIDs.toggleLeftArea,
        CommandIDs.toggleRightArea,
        CommandIDs.togglePresentationMode,
        CommandIDs.toggleFullscreenMode,
        CommandIDs.toggleMode,
        CommandIDs.resetLayout
      ].forEach(command => palette.addItem({ command, category }));

      ['right', 'left'].forEach(side => {
        palette.addItem({
          command: CommandIDs.toggleSideTabBar,
          category,
          args: { side }
        });
      });
    }
  }
};

/**
 * The main extension.
 */
const main: JupyterFrontEndPlugin<ITreePathUpdater> = {
  id: '@jupyterlab/application-extension:main',
  description:
    'Initializes the application and provides the URL tree path handler.',
  requires: [
    IRouter,
    IWindowResolver,
    ITranslator,
    JupyterFrontEnd.ITreeResolver
  ],
  optional: [IConnectionLost],
  provides: ITreePathUpdater,
  activate: (
    app: JupyterFrontEnd,
    router: IRouter,
    resolver: IWindowResolver,
    translator: ITranslator,
    treeResolver: JupyterFrontEnd.ITreeResolver,
    connectionLost: IConnectionLost | null
  ) => {
    const trans = translator.load('jupyterlab');

    if (!(app instanceof JupyterLab)) {
      throw new Error(`${main.id} must be activated in JupyterLab.`);
    }

    // These two internal state variables are used to manage the two source
    // of the tree part of the URL being updated: 1) path of the active document,
    // 2) path of the default browser if the active main area widget isn't a document.
    let _docTreePath = '';
    let _defaultBrowserTreePath = '';

    function updateTreePath(treePath: string) {
      // Wait for tree resolver to finish before updating the path because it use the PageConfig['treePath']
      void treeResolver.paths.then(() => {
        _defaultBrowserTreePath = treePath;
        if (!_docTreePath) {
          const url = PageConfig.getUrl({ treePath });
          const path = URLExt.parse(url).pathname;
          router.navigate(path, { skipRouting: true });
          // Persist the new tree path to PageConfig as it is used elsewhere at runtime.
          PageConfig.setOption('treePath', treePath);
        }
      });
    }

    // Requiring the window resolver guarantees that the application extension
    // only loads if there is a viable window name. Otherwise, the application
    // will short-circuit and ask the user to navigate away.
    const workspace = resolver.name;

    console.debug(`Starting application in workspace: "${workspace}"`);

    // If there were errors registering plugins, tell the user.
    if (app.registerPluginErrors.length !== 0) {
      const body = (
        <pre>{app.registerPluginErrors.map(e => e.message).join('\n')}</pre>
      );

      void showErrorMessage(trans.__('Error Registering Plugins'), {
        message: body
      });
    }

    // Watch the mode and update the page URL to /lab or /doc to reflect the
    // change.
    app.shell.modeChanged.connect((_, args: DockPanel.Mode) => {
      const url = PageConfig.getUrl({ mode: args as string });
      const path = URLExt.parse(url).pathname;
      router.navigate(path, { skipRouting: true });
      // Persist this mode change to PageConfig as it is used elsewhere at runtime.
      PageConfig.setOption('mode', args as string);
    });

    // Wait for tree resolver to finish before updating the path because it use the PageConfig['treePath']
    void treeResolver.paths.then(() => {
      // Watch the path of the current widget in the main area and update the page
      // URL to reflect the change.
      app.shell.currentPathChanged.connect((_, args) => {
        const maybeTreePath = args.newValue as string;
        const treePath = maybeTreePath || _defaultBrowserTreePath;
        const url = PageConfig.getUrl({ treePath: treePath });
        const path = URLExt.parse(url).pathname;
        router.navigate(path, { skipRouting: true });
        // Persist the new tree path to PageConfig as it is used elsewhere at runtime.
        PageConfig.setOption('treePath', treePath);
        _docTreePath = maybeTreePath;
      });
    });

    // If the connection to the server is lost, handle it with the
    // connection lost handler.
    connectionLost = connectionLost || ConnectionLost;
    app.serviceManager.connectionFailure.connect((manager, error) =>
      connectionLost!(manager, error, translator)
    );

    const builder = app.serviceManager.builder;
    const build = () => {
      return builder
        .build()
        .then(() => {
          return showDialog({
            title: trans.__('Build Complete'),
            body: (
              <div>
                {trans.__('Build successfully completed, reload page?')}
                <br />
                {trans.__('You will lose any unsaved changes.')}
              </div>
            ),
            buttons: [
              Dialog.cancelButton({
                label: trans.__('Reload Without Saving'),
                actions: ['reload']
              }),
              Dialog.okButton({ label: trans.__('Save and Reload') })
            ],
            hasClose: true
          });
        })
        .then(({ button: { accept, actions } }) => {
          if (accept) {
            void app.commands
              .execute('docmanager:save')
              .then(() => {
                router.reload();
              })
              .catch(err => {
                void showErrorMessage(trans.__('Save Failed'), {
                  message: <pre>{err.message}</pre>
                });
              });
          } else if (actions.includes('reload')) {
            router.reload();
          }
        })
        .catch(err => {
          void showErrorMessage(trans.__('Build Failed'), {
            message: <pre>{err.message}</pre>
          });
        });
    };

    if (builder.isAvailable && builder.shouldCheck) {
      void builder.getStatus().then(response => {
        if (response.status === 'building') {
          return build();
        }

        if (response.status !== 'needed') {
          return;
        }

        const body = (
          <div>
            {trans.__('JupyterLab build is suggested:')}
            <br />
            <pre>{response.message}</pre>
          </div>
        );

        void showDialog({
          title: trans.__('Build Recommended'),
          body,
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({ label: trans.__('Build') })
          ]
        }).then(result => (result.button.accept ? build() : undefined));
      });
    }
    return updateTreePath;
  },
  autoStart: true
};

/**
 * Plugin to build the context menu from the settings.
 */
const contextMenuPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:context-menu',
  description: 'Populates the context menu.',
  autoStart: true,
  requires: [ISettingRegistry, ITranslator],
  optional: [ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry,
    translator: ITranslator,
    palette: ICommandPalette | null
  ): void => {
    const trans = translator.load('jupyterlab');

    function createMenu(options: ISettingRegistry.IMenu): RankedMenu {
      const menu = new RankedMenu({ ...options, commands: app.commands });
      if (options.label) {
        menu.title.label = trans.__(options.label);
      }
      return menu;
    }

    // Load the context menu lately so plugins are loaded.
    app.started
      .then(() => {
        return Private.loadSettingsContextMenu(
          app.contextMenu,
          app.commands,
          settingRegistry,
          createMenu,
          translator
        );
      })
      .then(() => {
        if (palette) {
          palette?.addItem({
            category: trans.__('Settings'),
            command: CommandIDs.toggleContextMenu
          });
        }
      })
      .catch(reason => {
        console.error(
          'Failed to load context menu items from settings registry.',
          reason
        );
      });
  }
};

/**
 * Check if the application is dirty before closing the browser tab.
 */
const dirty: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:dirty',
  description:
    'Adds safeguard dialog when closing the browser tab with unsaved modifications.',
  autoStart: true,
  requires: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator): void => {
    if (!(app instanceof JupyterLab)) {
      throw new Error(`${dirty.id} must be activated in JupyterLab.`);
    }
    const trans = translator.load('jupyterlab');
    const message = trans.__(
      'Are you sure you want to exit JupyterLab?\n\nAny unsaved changes will be lost.'
    );

    // The spec for the `beforeunload` event is implemented differently by
    // the different browser vendors. Consequently, the `event.returnValue`
    // attribute needs to set in addition to a return value being returned.
    // For more information, see:
    // https://developer.mozilla.org/en/docs/Web/Events/beforeunload
    window.addEventListener('beforeunload', event => {
      if (app.status.isDirty) {
        return ((event as any).returnValue = message);
      }
    });
  }
};

/**
 * The default layout restorer provider.
 */
const layout: JupyterFrontEndPlugin<ILayoutRestorer> = {
  id: '@jupyterlab/application-extension:layout',
  description: 'Provides the shell layout restorer.',
  requires: [IStateDB, ILabShell, ISettingRegistry],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    labShell: ILabShell,
    settingRegistry: ISettingRegistry,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    const first = app.started;
    const registry = app.commands;

    const mode = PageConfig.getOption('mode') as DockPanel.Mode;
    const restorer = new LayoutRestorer({
      connector: state,
      first,
      registry,
      mode
    });
    settingRegistry
      .load(shell.id)
      .then(settings => {
        // Add a layer of customization to support app shell mode
        const customizedLayout = settings.composite['layout'] as any;

        // Restore the layout.
        void labShell
          .restoreLayout(mode, restorer, {
            'multiple-document': customizedLayout.multiple ?? {},
            'single-document': customizedLayout.single ?? {}
          })
          .then(() => {
            labShell.layoutModified.connect(() => {
              void restorer.save(labShell.saveLayout());
            });

            settings.changed.connect(onSettingsChanged);
            Private.activateSidebarSwitcher(app, labShell, settings, trans);
          });
      })
      .catch(reason => {
        console.error('Fail to load settings for the layout restorer.');
        console.error(reason);
      });

    return restorer;

    async function onSettingsChanged(
      settings: ISettingRegistry.ISettings
    ): Promise<void> {
      if (
        !JSONExt.deepEqual(
          settings.composite['layout'] as ReadonlyPartialJSONValue,
          {
            single: labShell.userLayout['single-document'],
            multiple: labShell.userLayout['multiple-document']
          } as any
        )
      ) {
        const result = await showDialog({
          title: trans.__('Information'),
          body: trans.__(
            'User layout customization has changed. You may need to reload JupyterLab to see the changes.'
          ),
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({ label: trans.__('Reload') })
          ]
        });

        if (result.button.accept) {
          location.reload();
        }
      }
    }
  },
  autoStart: true,
  provides: ILayoutRestorer
};

/**
 * The default URL router provider.
 */
const router: JupyterFrontEndPlugin<IRouter> = {
  id: '@jupyterlab/application-extension:router',
  description: 'Provides the URL router',
  requires: [JupyterFrontEnd.IPaths],
  activate: (app: JupyterFrontEnd, paths: JupyterFrontEnd.IPaths) => {
    const { commands } = app;
    const base = paths.urls.base;
    const router = new Router({ base, commands });

    void app.started.then(() => {
      // Route the very first request on load.
      void router.route();

      // Route all pop state events.
      window.addEventListener('popstate', () => {
        void router.route();
      });
    });

    return router;
  },
  autoStart: true,
  provides: IRouter
};

/**
 * The default tree route resolver plugin.
 */
const tree: JupyterFrontEndPlugin<JupyterFrontEnd.ITreeResolver> = {
  id: '@jupyterlab/application-extension:tree-resolver',
  description: 'Provides the tree route resolver',
  autoStart: true,
  requires: [IRouter],
  provides: JupyterFrontEnd.ITreeResolver,
  activate: (
    app: JupyterFrontEnd,
    router: IRouter
  ): JupyterFrontEnd.ITreeResolver => {
    const { commands } = app;
    const set = new DisposableSet();
    const delegate = new PromiseDelegate<JupyterFrontEnd.ITreeResolver.Paths>();

    const treePattern = new RegExp(
      '/(lab|doc)(/workspaces/[a-zA-Z0-9-_]+)?(/tree/.*)?'
    );

    set.add(
      commands.addCommand(CommandIDs.tree, {
        execute: async (args: IRouter.ILocation) => {
          if (set.isDisposed) {
            return;
          }

          const query = URLExt.queryStringToObject(args.search ?? '');
          const browser = query['file-browser-path'] || '';

          // Remove the file browser path from the query string.
          delete query['file-browser-path'];

          // Clean up artifacts immediately upon routing.
          set.dispose();

          delegate.resolve({ browser, file: PageConfig.getOption('treePath') });
        }
      })
    );
    set.add(
      router.register({ command: CommandIDs.tree, pattern: treePattern })
    );

    // If a route is handled by the router without the tree command being
    // invoked, resolve to `null` and clean up artifacts.
    const listener = () => {
      if (set.isDisposed) {
        return;
      }
      set.dispose();
      delegate.resolve(null);
    };
    router.routed.connect(listener);
    set.add(
      new DisposableDelegate(() => {
        router.routed.disconnect(listener);
      })
    );

    return { paths: delegate.promise };
  }
};

/**
 * The default URL not found extension.
 */
const notfound: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:notfound',
  description: 'Defines the behavior for not found URL (aka route).',
  requires: [JupyterFrontEnd.IPaths, IRouter, ITranslator],
  activate: (
    _: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter,
    translator: ITranslator
  ) => {
    const trans = translator.load('jupyterlab');
    const bad = paths.urls.notFound;

    if (!bad) {
      return;
    }

    const base = router.base;
    const message = trans.__(
      'The path: %1 was not found. JupyterLab redirected to: %2',
      bad,
      base
    );

    // Change the URL back to the base application URL.
    router.navigate('');

    void showErrorMessage(trans.__('Path Not Found'), { message });
  },
  autoStart: true
};

/**
 * Change the favicon changing based on the busy status;
 */
const busy: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:faviconbusy',
  description: 'Handles the favicon depending on the application status.',
  requires: [ILabStatus],
  activate: async (_: JupyterFrontEnd, status: ILabStatus) => {
    status.busySignal.connect((_, isBusy) => {
      const favicon = document.querySelector(
        `link[rel="icon"]${isBusy ? '.idle.favicon' : '.busy.favicon'}`
      ) as HTMLLinkElement;
      if (!favicon) {
        return;
      }
      const newFavicon = document.querySelector(
        `link${isBusy ? '.busy.favicon' : '.idle.favicon'}`
      ) as HTMLLinkElement;
      if (!newFavicon) {
        return;
      }
      // If we have the two icons with the special classes, then toggle them.
      if (favicon !== newFavicon) {
        favicon.rel = '';
        newFavicon.rel = 'icon';

        // Firefox doesn't seem to recognize just changing rel, so we also
        // reinsert the link into the DOM.
        newFavicon.parentNode!.replaceChild(newFavicon, newFavicon);
      }
    });
  },
  autoStart: true
};

/**
 * The default JupyterLab application shell.
 */
const shell: JupyterFrontEndPlugin<ILabShell> = {
  id: '@jupyterlab/application-extension:shell',
  description:
    'Provides the JupyterLab shell. It has an extended API compared to `app.shell`.',
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ) => {
    if (!(app.shell instanceof LabShell)) {
      throw new Error(`${shell.id} did not find a LabShell instance.`);
    }
    if (settingRegistry) {
      void settingRegistry.load(shell.id).then(settings => {
        (app.shell as LabShell).updateConfig(settings.composite);
        settings.changed.connect(() => {
          (app.shell as LabShell).updateConfig(settings.composite);
        });
      });
    }
    return app.shell;
  },
  autoStart: true,
  provides: ILabShell
};

/**
 * The default JupyterLab application status provider.
 */
const status: JupyterFrontEndPlugin<ILabStatus> = {
  id: '@jupyterlab/application-extension:status',
  description: 'Provides the application status.',
  activate: (app: JupyterFrontEnd) => {
    if (!(app instanceof JupyterLab)) {
      throw new Error(`${status.id} must be activated in JupyterLab.`);
    }
    return app.status;
  },
  autoStart: true,
  provides: ILabStatus
};

/**
 * The default JupyterLab application-specific information provider.
 *
 * #### Notes
 * This plugin should only be used by plugins that specifically need to access
 * JupyterLab application information, e.g., listing extensions that have been
 * loaded or deferred within JupyterLab.
 */
const info: JupyterFrontEndPlugin<JupyterLab.IInfo> = {
  id: '@jupyterlab/application-extension:info',
  description: 'Provides the application information.',
  activate: (app: JupyterFrontEnd) => {
    if (!(app instanceof JupyterLab)) {
      throw new Error(`${info.id} must be activated in JupyterLab.`);
    }
    return app.info;
  },
  autoStart: true,
  provides: JupyterLab.IInfo
};

/**
 * The default JupyterLab paths dictionary provider.
 */
const paths: JupyterFrontEndPlugin<JupyterFrontEnd.IPaths> = {
  id: '@jupyterlab/application-extension:paths',
  description: 'Provides the application paths.',
  activate: (app: JupyterFrontEnd): JupyterFrontEnd.IPaths => {
    if (!(app instanceof JupyterLab)) {
      throw new Error(`${paths.id} must be activated in JupyterLab.`);
    }
    return app.paths;
  },
  autoStart: true,
  provides: JupyterFrontEnd.IPaths
};

/**
 * The default property inspector provider.
 */
const propertyInspector: JupyterFrontEndPlugin<IPropertyInspectorProvider> = {
  id: '@jupyterlab/application-extension:property-inspector',
  description: 'Provides the property inspector.',
  autoStart: true,
  requires: [ILabShell, ITranslator],
  optional: [ILayoutRestorer],
  provides: IPropertyInspectorProvider,
  activate: (
    app: JupyterFrontEnd,
    labshell: ILabShell,
    translator: ITranslator,
    restorer: ILayoutRestorer | null
  ) => {
    const trans = translator.load('jupyterlab');
    const widget = new SideBarPropertyInspectorProvider({
      shell: labshell,
      translator
    });
    widget.title.icon = buildIcon;
    widget.title.caption = trans.__('Property Inspector');
    widget.id = 'jp-property-inspector';
    labshell.add(widget, 'right', { rank: 100, type: 'Property Inspector' });

    app.commands.addCommand(CommandIDs.showPropertyPanel, {
      label: trans.__('Property Inspector'),
      execute: () => {
        labshell.activateById(widget.id);
      }
    });

    if (restorer) {
      restorer.add(widget, 'jp-property-inspector');
    }
    return widget;
  }
};

const jupyterLogo: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:logo',
  description: 'Sets the application logo.',
  autoStart: true,
  requires: [ILabShell],
  activate: (app: JupyterFrontEnd, shell: ILabShell) => {
    const logo = new Widget();
    jupyterIcon.element({
      container: logo.node,
      elementPosition: 'center',
      margin: '2px 2px 2px 8px',
      height: 'auto',
      width: '16px'
    });
    logo.id = 'jp-MainLogo';
    shell.add(logo, 'top', { rank: 0 });
  }
};

/**
 * The simple interface mode switch in the status bar.
 */
const modeSwitchPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:mode-switch',
  description: 'Adds the interface mode switch',
  requires: [ILabShell, ITranslator],
  optional: [IStatusBar, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    translator: ITranslator,
    statusBar: IStatusBar | null,
    settingRegistry: ISettingRegistry | null
  ) => {
    if (statusBar === null) {
      // Bail early
      return;
    }
    const trans = translator.load('jupyterlab');
    const modeSwitch = new Switch();
    modeSwitch.id = 'jp-single-document-mode';

    modeSwitch.valueChanged.connect((_, args) => {
      labShell.mode = args.newValue ? 'single-document' : 'multiple-document';
    });
    labShell.modeChanged.connect((_, mode) => {
      modeSwitch.value = mode === 'single-document';
    });

    if (settingRegistry) {
      const loadSettings = settingRegistry.load(shell.id);
      const updateSettings = (settings: ISettingRegistry.ISettings): void => {
        const startMode = settings.get('startMode').composite as string;
        if (startMode) {
          labShell.mode =
            startMode === 'single' ? 'single-document' : 'multiple-document';
        }
      };

      Promise.all([loadSettings, app.restored])
        .then(([settings]) => {
          updateSettings(settings);
        })
        .catch((reason: Error) => {
          console.error(reason.message);
        });
    }

    // Show the current file browser shortcut in its title.
    const updateModeSwitchTitle = () => {
      const binding = app.commands.keyBindings.find(
        b => b.command === 'application:toggle-mode'
      );
      if (binding) {
        const ks = binding.keys.map(CommandRegistry.formatKeystroke).join(', ');
        modeSwitch.caption = trans.__('Simple Interface (%1)', ks);
      } else {
        modeSwitch.caption = trans.__('Simple Interface');
      }
    };
    updateModeSwitchTitle();
    app.commands.keyBindingChanged.connect(() => {
      updateModeSwitchTitle();
    });

    modeSwitch.label = trans.__('Simple');

    statusBar.registerStatusItem(modeSwitchPlugin.id, {
      priority: 1,
      item: modeSwitch,
      align: 'left',
      rank: -1
    });
  },
  autoStart: true
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  contextMenuPlugin,
  dirty,
  main,
  mainCommands,
  layout,
  router,
  tree,
  notfound,
  busy,
  shell,
  status,
  info,
  modeSwitchPlugin,
  paths,
  propertyInspector,
  jupyterLogo,
  topbar
];

export default plugins;

namespace Private {
  async function displayInformation(trans: TranslationBundle): Promise<void> {
    const result = await showDialog({
      title: trans.__('Information'),
      body: trans.__(
        'Context menu customization has changed. You will need to reload JupyterLab to see the changes.'
      ),
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({ label: trans.__('Reload') })
      ]
    });

    if (result.button.accept) {
      location.reload();
    }
  }

  export async function loadSettingsContextMenu(
    contextMenu: ContextMenuSvg,
    commands: CommandRegistry,
    registry: ISettingRegistry,
    menuFactory: (options: ISettingRegistry.IMenu) => RankedMenu,
    translator: ITranslator
  ): Promise<void> {
    const trans = translator.load('jupyterlab');
    const pluginId = contextMenuPlugin.id;
    let canonical: ISettingRegistry.ISchema | null = null;
    let loaded: { [name: string]: ISettingRegistry.IContextMenuItem[] } = {};
    /**
     * Populate the plugin's schema defaults.
     *
     * We keep track of disabled entries in case the plugin is loaded
     * after the menu initialization.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};
      const pluginDefaults = Object.keys(registry.plugins)
        .map(plugin => {
          const items =
            registry.plugins[plugin]!.schema['jupyter.lab.menus']?.context ??
            [];
          loaded[plugin] = items;
          return items;
        })
        .concat([schema['jupyter.lab.menus']?.context ?? []])
        .reduceRight(
          (
            acc: ISettingRegistry.IContextMenuItem[],
            val: ISettingRegistry.IContextMenuItem[]
          ) => SettingRegistry.reconcileItems(acc, val, true),
          []
        )!;

      // Apply default value as last step to take into account overrides.json
      // The standard default being [] as the plugin must use `jupyter.lab.menus.context`
      // to define their default value.
      schema.properties!.contextMenu.default = SettingRegistry.reconcileItems(
        pluginDefaults,
        schema.properties!.contextMenu.default as any[],
        true
      )!
        // flatten one level
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    }

    // Transform the plugin object to return different schema than the default.
    registry.transform(pluginId, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults = canonical.properties?.contextMenu?.default ?? [];
        const user = {
          ...plugin.data.user,
          contextMenu: plugin.data.user.contextMenu ?? []
        };
        const composite = {
          ...plugin.data.composite,
          contextMenu: SettingRegistry.reconcileItems(
            defaults as ISettingRegistry.IContextMenuItem[],
            user.contextMenu as ISettingRegistry.IContextMenuItem[],
            false
          )
        };

        plugin.data = { composite, user };

        return plugin;
      },
      fetch: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        return {
          data: plugin.data,
          id: plugin.id,
          raw: plugin.raw,
          schema: canonical,
          version: plugin.version
        };
      }
    });

    // Repopulate the canonical variable after the setting registry has
    // preloaded all initial plugins.
    const settings = await registry.load(pluginId);

    // Set the suppress flag on document.body if necessary.
    const setDisabled = (settings: ISettingRegistry.ISettings) => {
      const root = document.body;
      const isDisabled = root.hasAttribute('data-jp-suppress-context-menu');
      const shouldDisable = settings.get('disabled').composite;
      if (isDisabled && !shouldDisable) {
        root.removeAttribute('data-jp-suppress-context-menu');
      } else if (shouldDisable && !isDisabled) {
        root.setAttribute('data-jp-suppress-context-menu', 'true');
      }
    };

    const contextItems: ISettingRegistry.IContextMenuItem[] =
      (settings.composite.contextMenu as any) ?? [];

    // Create menu item for non-disabled element
    SettingRegistry.filterDisabledItems(contextItems).forEach(item => {
      MenuFactory.addContextItem(
        {
          // We have to set the default rank because Lumino is sorting the visible items
          rank: DEFAULT_CONTEXT_ITEM_RANK,
          ...item
        },
        contextMenu,
        menuFactory
      );
    });

    settings.changed.connect(() => {
      // As extension may change the context menu through API,
      // prompt the user to reload if the menu has been updated.
      const newItems = (settings.composite.contextMenu as any) ?? [];
      if (!JSONExt.deepEqual(contextItems, newItems)) {
        void displayInformation(trans);
      }
      setDisabled(settings);
    });

    registry.pluginChanged.connect(async (sender, plugin) => {
      if (plugin !== pluginId) {
        // If the plugin changed its menu.
        const oldItems = loaded[plugin] ?? [];
        const newItems =
          registry.plugins[plugin]!.schema['jupyter.lab.menus']?.context ?? [];
        if (!JSONExt.deepEqual(oldItems, newItems)) {
          if (loaded[plugin]) {
            // The plugin has changed, request the user to reload the UI
            await displayInformation(trans);
          } else {
            // The plugin was not yet loaded when the menu was built => update the menu
            loaded[plugin] = JSONExt.deepCopy(newItems);
            // Merge potential disabled state
            const toAdd =
              SettingRegistry.reconcileItems(
                newItems,
                contextItems,
                false,
                false
              ) ?? [];
            SettingRegistry.filterDisabledItems(toAdd).forEach(item => {
              MenuFactory.addContextItem(
                {
                  // We have to set the default rank because Lumino is sorting the visible items
                  rank: DEFAULT_CONTEXT_ITEM_RANK,
                  ...item
                },
                contextMenu,
                menuFactory
              );
            });
          }
        }
      }
    });

    // Handle disabled status.
    setDisabled(settings);
    commands.addCommand(CommandIDs.toggleContextMenu, {
      label: trans.__('Enable Context Menu'),
      isToggleable: true,
      isToggled: () => !settings.get('disabled').composite,
      execute: () =>
        void settings.set('disabled', !settings.get('disabled').composite)
    });
  }

  export function activateSidebarSwitcher(
    app: JupyterFrontEnd,
    labShell: ILabShell,
    settings: ISettingRegistry.ISettings,
    trans: TranslationBundle
  ): void {
    // Add a command to switch a side panels's side
    app.commands.addCommand(CommandIDs.switchSidebar, {
      label: trans.__('Switch Sidebar Side'),
      execute: () => {
        // First, try to find the correct panel based on the application
        // context menu click. Bail if we don't find a sidebar for the widget.
        const contextNode: HTMLElement | undefined = app.contextMenuHitTest(
          node => !!node.dataset.id
        );
        if (!contextNode) {
          return;
        }

        const id = contextNode.dataset['id']!;
        const leftPanel = document.getElementById('jp-left-stack');
        const node = document.getElementById(id);

        let newLayout: {
          'single-document': ILabShell.IUserLayout;
          'multiple-document': ILabShell.IUserLayout;
        } | null = null;
        // Move the panel to the other side.
        if (leftPanel && node && leftPanel.contains(node)) {
          const widget = find(labShell.widgets('left'), w => w.id === id);
          if (widget) {
            newLayout = labShell.move(widget, 'right');
            labShell.activateById(widget.id);
          }
        } else {
          const widget = find(labShell.widgets('right'), w => w.id === id);
          if (widget) {
            newLayout = labShell.move(widget, 'left');
            labShell.activateById(widget.id);
          }
        }

        if (newLayout) {
          settings
            .set('layout', {
              single: newLayout['single-document'],
              multiple: newLayout['multiple-document']
            } as any)
            .catch(reason => {
              console.error(
                'Failed to save user layout customization.',
                reason
              );
            });
        }
      }
    });

    app.commands.commandExecuted.connect((registry, executed) => {
      if (executed.id === CommandIDs.resetLayout) {
        settings.remove('layout').catch(reason => {
          console.error('Failed to remove user layout customization.', reason);
        });
      }
    });
  }
}
