// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IConnectionLost,
  ILabShell,
  ILabStatus,
  ILayoutRestorer,
  IRouter,
  ConnectionLost,
  JupyterFrontEnd,
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
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';

import { PathExt, URLExt } from '@jupyterlab/coreutils';

import {
  IPropertyInspectorProvider,
  SideBarPropertyInspectorProvider
} from '@jupyterlab/property-inspector';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { IStateDB } from '@jupyterlab/statedb';

import { buildIcon } from '@jupyterlab/ui-components';

import { each, iter, toArray } from '@lumino/algorithm';

import { PromiseDelegate } from '@lumino/coreutils';

import { DisposableDelegate, DisposableSet } from '@lumino/disposable';

import { Widget, DockLayout } from '@lumino/widgets';

import * as React from 'react';

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

  export const toggleMode: string = 'application:toggle-mode';

  export const toggleLeftArea: string = 'application:toggle-left-area';

  export const toggleRightArea: string = 'application:toggle-right-area';

  export const togglePresentationMode: string =
    'application:toggle-presentation-mode';

  export const tree: string = 'router:tree';

  export const switchSidebar = 'sidebar:switch';
}

/**
 * The main extension.
 */
const main: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:main',
  requires: [IRouter, IWindowResolver],
  optional: [ICommandPalette, IConnectionLost],
  activate: (
    app: JupyterFrontEnd,
    router: IRouter,
    resolver: IWindowResolver,
    palette: ICommandPalette | null,
    connectionLost: IConnectionLost | null
  ) => {
    if (!(app instanceof JupyterLab)) {
      throw new Error(`${main.id} must be activated in JupyterLab.`);
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

      void showErrorMessage('Error Registering Plugins', { message: body });
    }

    addCommands(app, palette);

    // If the application shell layout is modified,
    // trigger a refresh of the commands.
    app.shell.layoutModified.connect(() => {
      app.commands.notifyCommandChanged();
    });

    // If the connection to the server is lost, handle it with the
    // connection lost handler.
    connectionLost = connectionLost || ConnectionLost;
    app.serviceManager.connectionFailure.connect(connectionLost);

    const builder = app.serviceManager.builder;
    const build = () => {
      return builder
        .build()
        .then(() => {
          return showDialog({
            title: 'Build Complete',
            body: 'Build successfully completed, reload page?',
            buttons: [
              Dialog.cancelButton(),
              Dialog.warnButton({ label: 'Reload' })
            ]
          });
        })
        .then(result => {
          if (result.button.accept) {
            router.reload();
          }
        })
        .catch(err => {
          void showErrorMessage('Build Failed', {
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
            JupyterLab build is suggested:
            <br />
            <pre>{response.message}</pre>
          </div>
        );

        void showDialog({
          title: 'Build Recommended',
          body,
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Build' })]
        }).then(result => (result.button.accept ? build() : undefined));
      });
    }

    const message =
      'Are you sure you want to exit JupyterLab?\n' +
      'Any unsaved changes will be lost.';

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
  },
  autoStart: true
};

/**
 * The default layout restorer provider.
 */
const layout: JupyterFrontEndPlugin<ILayoutRestorer> = {
  id: '@jupyterlab/application-extension:layout',
  requires: [IStateDB, ILabShell],
  activate: (app: JupyterFrontEnd, state: IStateDB, labShell: ILabShell) => {
    const first = app.started;
    const registry = app.commands;
    const restorer = new LayoutRestorer({ connector: state, first, registry });

    void restorer.fetch().then(saved => {
      labShell.restoreLayout(saved);
      labShell.layoutModified.connect(() => {
        void restorer.save(labShell.saveLayout());
      });
    });

    return restorer;
  },
  autoStart: true,
  provides: ILayoutRestorer
};

/**
 * The default URL router provider.
 */
const router: JupyterFrontEndPlugin<IRouter> = {
  id: '@jupyterlab/application-extension:router',
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
  autoStart: true,
  requires: [JupyterFrontEnd.IPaths, IRouter, IWindowResolver],
  provides: JupyterFrontEnd.ITreeResolver,
  activate: (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter,
    resolver: IWindowResolver
  ): JupyterFrontEnd.ITreeResolver => {
    const { commands } = app;
    const treePattern = new RegExp(`^${paths.urls.tree}([^?]+)`);
    const workspacePattern = new RegExp(
      `^${paths.urls.workspaces}/[^?/]+/tree/([^?]+)`
    );
    const set = new DisposableSet();
    const delegate = new PromiseDelegate<JupyterFrontEnd.ITreeResolver.Paths>();

    set.add(
      commands.addCommand(CommandIDs.tree, {
        execute: async (args: IRouter.ILocation) => {
          if (set.isDisposed) {
            return;
          }

          const treeMatch = args.path.match(treePattern);
          const workspaceMatch = args.path.match(workspacePattern);
          const match = treeMatch || workspaceMatch;
          const file = match ? decodeURI(match[1]) : '';
          const workspace = PathExt.basename(resolver.name);
          const query = URLExt.queryStringToObject(args.search ?? '');
          const browser = query['file-browser-path'] || '';

          // Remove the file browser path from the query string.
          delete query['file-browser-path'];

          // Remove the tree portion of the URL.
          const url =
            (workspaceMatch
              ? URLExt.join(paths.urls.workspaces, workspace)
              : paths.urls.app) +
            URLExt.objectToQueryString(query) +
            args.hash;

          // Route to the cleaned URL.
          router.navigate(url);

          // Clean up artifacts immediately upon routing.
          set.dispose();

          delegate.resolve({ browser, file });
        }
      })
    );
    set.add(
      router.register({ command: CommandIDs.tree, pattern: treePattern })
    );
    set.add(
      router.register({ command: CommandIDs.tree, pattern: workspacePattern })
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
  requires: [JupyterFrontEnd.IPaths, IRouter],
  activate: (
    _: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter
  ) => {
    const bad = paths.urls.notFound;

    if (!bad) {
      return;
    }

    const base = router.base;
    const message = `
      The path: ${bad} was not found. JupyterLab redirected to: ${base}
    `;

    // Change the URL back to the base application URL.
    router.navigate('');

    void showErrorMessage('Path Not Found', { message });
  },
  autoStart: true
};

/**
 * Change the favicon changing based on the busy status;
 */
const busy: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:faviconbusy',
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

const SIDEBAR_ID = '@jupyterlab/application-extension:sidebar';

/**
 * Keep user settings for where to show the side panels.
 */
const sidebar: JupyterFrontEndPlugin<void> = {
  id: SIDEBAR_ID,
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry,
    labShell: ILabShell
  ) => {
    type overrideMap = { [id: string]: 'left' | 'right' };
    let overrides: overrideMap = {};
    const handleLayoutOverrides = () => {
      each(labShell.widgets('left'), widget => {
        if (overrides[widget.id] && overrides[widget.id] === 'right') {
          labShell.add(widget, 'right');
        }
      });
      each(labShell.widgets('right'), widget => {
        if (overrides[widget.id] && overrides[widget.id] === 'left') {
          labShell.add(widget, 'left');
        }
      });
    };
    labShell.layoutModified.connect(handleLayoutOverrides);
    // Fetch overrides from the settings system.
    void Promise.all([settingRegistry.load(SIDEBAR_ID), app.restored]).then(
      ([settings]) => {
        overrides = (settings.get('overrides').composite as overrideMap) || {};
        settings.changed.connect(settings => {
          overrides =
            (settings.get('overrides').composite as overrideMap) || {};
          handleLayoutOverrides();
        });
      }
    );

    // Add a command to switch a side panels's side
    app.commands.addCommand(CommandIDs.switchSidebar, {
      label: 'Switch Sidebar Side',
      execute: () => {
        // First, try to find the correct panel based on the
        // application context menu click.
        const contextNode: HTMLElement | undefined = app.contextMenuHitTest(
          node => !!node.dataset.id
        );
        let id: string;
        let side: 'left' | 'right';
        if (contextNode) {
          id = contextNode.dataset['id']!;
          const leftPanel = document.getElementById('jp-left-stack');
          const node = document.getElementById(id);
          if (leftPanel && node && leftPanel.contains(node)) {
            side = 'right';
          } else {
            side = 'left';
          }
        } else {
          // Bail if we don't find a sidebar for the widget.
          return;
        }
        // Move the panel to the other side.
        const newOverrides = { ...overrides };
        newOverrides[id] = side;
        return settingRegistry.set(SIDEBAR_ID, 'overrides', newOverrides);
      }
    });

    // Add a context menu item to sidebar tabs.
    app.contextMenu.addItem({
      command: CommandIDs.switchSidebar,
      selector: '.jp-SideBar .lm-TabBar-tab',
      rank: 500
    });
  },
  requires: [ISettingRegistry, ILabShell],
  autoStart: true
};

/**
 * Add the main application commands.
 */
function addCommands(app: JupyterLab, palette: ICommandPalette | null): void {
  const { commands, contextMenu, shell } = app;
  const category = 'Main Area';

  // Returns the widget associated with the most recent contextmenu event.
  const contextMenuWidget = (): Widget | null => {
    const test = (node: HTMLElement) => !!node.dataset.id;
    const node = app.contextMenuHitTest(test);

    if (!node) {
      // Fall back to active widget if path cannot be obtained from event.
      return shell.currentWidget;
    }

    const matches = toArray(shell.widgets('main')).filter(
      widget => widget.id === node.dataset.id
    );

    if (matches.length < 1) {
      return shell.currentWidget;
    }

    return matches[0];
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
    switch (area.type) {
      case 'split-area':
        const iterator = iter(area.children);
        let tab: DockLayout.ITabAreaConfig | null = null;
        let value: DockLayout.AreaConfig | undefined;
        do {
          value = iterator.next();
          if (value) {
            tab = findTab(value, widget);
          }
        } while (!tab && value);
        return tab;
      case 'tab-area':
        const { id } = widget;
        return area.widgets.some(widget => widget.id === id) ? area : null;
      default:
        return null;
    }
  };

  // Find the tab area for a widget within the main dock area.
  const tabAreaFor = (widget: Widget): DockLayout.ITabAreaConfig | null => {
    const { mainArea } = shell.saveLayout();
    if (!mainArea || mainArea.mode !== 'multiple-document') {
      return null;
    }
    const area = mainArea.dock?.main;
    if (!area) {
      return null;
    }
    return findTab(area, widget);
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

  commands.addCommand(CommandIDs.activateNextTab, {
    label: 'Activate Next Tab',
    execute: () => {
      shell.activateNextTab();
    }
  });

  commands.addCommand(CommandIDs.activatePreviousTab, {
    label: 'Activate Previous Tab',
    execute: () => {
      shell.activatePreviousTab();
    }
  });

  commands.addCommand(CommandIDs.activateNextTabBar, {
    label: 'Activate Next Tab Bar',
    execute: () => {
      shell.activateNextTabBar();
    }
  });

  commands.addCommand(CommandIDs.activatePreviousTabBar, {
    label: 'Activate Previous Tab Bar',
    execute: () => {
      shell.activatePreviousTabBar();
    }
  });

  // A CSS selector targeting tabs in the main area. This is a very
  // specific selector since we really only want tabs that are
  // in the main area, as opposed to those in sidebars, ipywidgets, etc.
  const tabSelector =
    '#jp-main-dock-panel .lm-DockPanel-tabBar.jp-Activity .lm-TabBar-tab';

  commands.addCommand(CommandIDs.close, {
    label: () => 'Close Tab',
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
  contextMenu.addItem({
    command: CommandIDs.close,
    selector: tabSelector,
    rank: 4
  });

  commands.addCommand(CommandIDs.closeAll, {
    label: 'Close All Tabs',
    execute: () => {
      shell.closeAll();
    }
  });

  commands.addCommand(CommandIDs.closeOtherTabs, {
    label: () => `Close All Other Tabs`,
    isEnabled: () => {
      // Ensure there are at least two widgets.
      const iterator = shell.widgets('main');
      return !!iterator.next() && !!iterator.next();
    },
    execute: () => {
      const widget = contextMenuWidget();
      if (!widget) {
        return;
      }
      const { id } = widget;
      const otherWidgets = toArray(shell.widgets('main')).filter(
        widget => widget.id !== id
      );
      closeWidgets(otherWidgets);
    }
  });
  contextMenu.addItem({
    command: CommandIDs.closeOtherTabs,
    selector: tabSelector,
    rank: 4
  });

  commands.addCommand(CommandIDs.closeRightTabs, {
    label: () => `Close Tabs to Right`,
    isEnabled: () =>
      !!contextMenuWidget() && widgetsRightOf(contextMenuWidget()!).length > 0,
    execute: () => {
      const widget = contextMenuWidget();
      if (!widget) {
        return;
      }
      closeWidgets(widgetsRightOf(widget));
    }
  });
  contextMenu.addItem({
    command: CommandIDs.closeRightTabs,
    selector: tabSelector,
    rank: 5
  });

  app.commands.addCommand(CommandIDs.toggleLeftArea, {
    label: () => 'Show Left Sidebar',
    execute: () => {
      if (shell.leftCollapsed) {
        shell.expandLeft();
      } else {
        shell.collapseLeft();
        if (shell.currentWidget) {
          shell.activateById(shell.currentWidget.id);
        }
      }
    },
    isToggled: () => !shell.leftCollapsed,
    isVisible: () => !shell.isEmpty('left')
  });

  app.commands.addCommand(CommandIDs.toggleRightArea, {
    label: () => 'Show Right Sidebar',
    execute: () => {
      if (shell.rightCollapsed) {
        shell.expandRight();
      } else {
        shell.collapseRight();
        if (shell.currentWidget) {
          shell.activateById(shell.currentWidget.id);
        }
      }
    },
    isToggled: () => !shell.rightCollapsed,
    isVisible: () => !shell.isEmpty('right')
  });

  app.commands.addCommand(CommandIDs.togglePresentationMode, {
    label: () => 'Presentation Mode',
    execute: () => {
      shell.presentationMode = !shell.presentationMode;
    },
    isToggled: () => shell.presentationMode,
    isVisible: () => true
  });

  app.commands.addCommand(CommandIDs.setMode, {
    isVisible: args => {
      const mode = args['mode'] as string;
      return mode === 'single-document' || mode === 'multiple-document';
    },
    execute: args => {
      const mode = args['mode'] as string;
      if (mode === 'single-document' || mode === 'multiple-document') {
        shell.mode = mode;
        return;
      }
      throw new Error(`Unsupported application shell mode: ${mode}`);
    }
  });

  app.commands.addCommand(CommandIDs.toggleMode, {
    label: 'Single-Document Mode',
    isToggled: () => shell.mode === 'single-document',
    execute: () => {
      const args =
        shell.mode === 'multiple-document'
          ? { mode: 'single-document' }
          : { mode: 'multiple-document' };
      return app.commands.execute(CommandIDs.setMode, args);
    }
  });

  if (palette) {
    palette.addItem({ command: CommandIDs.activateNextTab, category });
    palette.addItem({ command: CommandIDs.activatePreviousTab, category });
    palette.addItem({ command: CommandIDs.activateNextTabBar, category });
    palette.addItem({ command: CommandIDs.activatePreviousTabBar, category });
    palette.addItem({ command: CommandIDs.close, category });
    palette.addItem({ command: CommandIDs.closeAll, category });
    palette.addItem({ command: CommandIDs.closeOtherTabs, category });
    palette.addItem({ command: CommandIDs.closeRightTabs, category });
    palette.addItem({ command: CommandIDs.toggleLeftArea, category });
    palette.addItem({ command: CommandIDs.toggleRightArea, category });
    palette.addItem({ command: CommandIDs.togglePresentationMode, category });
    palette.addItem({ command: CommandIDs.toggleMode, category });
  }
}

/**
 * The default JupyterLab application shell.
 */
const shell: JupyterFrontEndPlugin<ILabShell> = {
  id: '@jupyterlab/application-extension:shell',
  activate: (app: JupyterFrontEnd) => {
    if (!(app.shell instanceof LabShell)) {
      throw new Error(`${shell.id} did not find a LabShell instance.`);
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
  id: '@jupyterlab/apputils-extension:paths',
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
  autoStart: true,
  requires: [ILabShell],
  optional: [ILayoutRestorer],
  provides: IPropertyInspectorProvider,
  activate: (
    app: JupyterFrontEnd,
    labshell: ILabShell,
    restorer: ILayoutRestorer | null
  ) => {
    const widget = new SideBarPropertyInspectorProvider(labshell);
    widget.title.icon = buildIcon;
    widget.title.caption = 'Property Inspector';
    widget.id = 'jp-property-inspector';
    labshell.add(widget, 'left');
    if (restorer) {
      restorer.add(widget, 'jp-property-inspector');
    }
    return widget;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  main,
  layout,
  router,
  tree,
  notfound,
  busy,
  sidebar,
  shell,
  status,
  info,
  paths,
  propertyInspector
];

export default plugins;
