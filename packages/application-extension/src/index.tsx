// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConnectionLost,
  IConnectionLost,
  ILabShell,
  ILabStatus,
  ILayoutRestorer,
  IRouter,
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

import {
  PathExt,
  IStateDB,
  ISettingRegistry,
  URLExt
} from '@jupyterlab/coreutils';

import { each, iter, toArray } from '@phosphor/algorithm';

import { Widget, DockLayout } from '@phosphor/widgets';

import * as React from 'react';

/**
 * The command IDs used by the application plugin.
 */
namespace CommandIDs {
  export const activateNextTab: string = 'application:activate-next-tab';

  export const activatePreviousTab: string =
    'application:activate-previous-tab';

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
  requires: [ICommandPalette, IConnectionLost, IRouter, IWindowResolver],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    connectionLost: IConnectionLost,
    router: IRouter,
    resolver: IWindowResolver
  ) => {
    if (!(app instanceof JupyterLab)) {
      throw new Error(`${main.id} must be activated in JupyterLab.`);
    }

    // Requiring the window resolver guarantees that the application extension
    // only loads if there is a viable window name. Otherwise, the application
    // will short-circuit and ask the user to navigate away.
    const workspace = resolver.name;

    console.log(`Starting application in workspace: "${workspace}"`);

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
    // connection lost token.
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
              Dialog.warnButton({ label: 'RELOAD' })
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
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'BUILD' })]
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
    const restorer = new LayoutRestorer({ first, registry, state });

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
 * The tree route handler provider.
 */
const tree: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:tree',
  autoStart: true,
  requires: [JupyterFrontEnd.IPaths, IRouter, IWindowResolver],
  activate: (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter,
    resolver: IWindowResolver
  ) => {
    const { commands } = app;
    const treePattern = new RegExp(`^${paths.urls.tree}([^?]+)`);
    const workspacePattern = new RegExp(
      `^${paths.urls.workspaces}[^?\/]+/tree/([^?]+)`
    );

    commands.addCommand(CommandIDs.tree, {
      execute: async (args: IRouter.ILocation) => {
        const treeMatch = args.path.match(treePattern);
        const workspaceMatch = args.path.match(workspacePattern);
        const match = treeMatch || workspaceMatch;
        const path = decodeURI(match[1]);
        // const { page, workspaces } = info.urls;
        const workspace = PathExt.basename(resolver.name);
        const url =
          (workspaceMatch
            ? URLExt.join(paths.urls.workspaces, workspace)
            : paths.urls.page) +
          args.search +
          args.hash;
        const immediate = true;

        // Remove the tree portion of the URL leaving the rest intact.
        router.navigate(url);

        try {
          await commands.execute('filebrowser:navigate', { path });
          await commands.execute('apputils:save-statedb', { immediate });
        } catch (error) {
          console.warn('Tree routing failed.', error);
        }
      }
    });

    router.register({ command: CommandIDs.tree, pattern: treePattern });
    router.register({ command: CommandIDs.tree, pattern: workspacePattern });
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
        newFavicon.parentNode.replaceChild(newFavicon, newFavicon);
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
        // First, try to find the right panel based on the
        // application context menu click,
        // If we can't find it there, look for use the active
        // left/right widgets.
        const contextNode: HTMLElement = app.contextMenuHitTest(
          node => !!node.dataset.id
        );
        let id: string;
        let side: 'left' | 'right';
        if (contextNode) {
          id = contextNode.dataset['id'];
          const leftPanel = document.getElementById('jp-left-stack');
          const node = document.getElementById(id);
          if (leftPanel && node && leftPanel.contains(node)) {
            side = 'right';
          } else {
            side = 'left';
          }
        } else if (document.body.dataset.leftSidebarWidget) {
          id = document.body.dataset.leftSidebarWidget;
          side = 'right';
        } else if (document.body.dataset.rightSidebarWidget) {
          id = document.body.dataset.rightSidebarWidget;
          side = 'left';
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
      selector: '.jp-SideBar .p-TabBar-tab',
      rank: 500
    });
  },
  requires: [ISettingRegistry, ILabShell],
  autoStart: true
};

/**
 * Add the main application commands.
 */
function addCommands(app: JupyterLab, palette: ICommandPalette): void {
  const { commands, contextMenu, shell } = app;
  const category = 'Main Area';

  // Returns the widget associated with the most recent contextmenu event.
  const contextMenuWidget = (): Widget => {
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
        let value: DockLayout.AreaConfig | null = null;
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
    if (mainArea.mode !== 'multiple-document') {
      return null;
    }
    let area = mainArea.dock.main;
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
  palette.addItem({ command: CommandIDs.activateNextTab, category });

  commands.addCommand(CommandIDs.activatePreviousTab, {
    label: 'Activate Previous Tab',
    execute: () => {
      shell.activatePreviousTab();
    }
  });
  palette.addItem({ command: CommandIDs.activatePreviousTab, category });

  commands.addCommand(CommandIDs.close, {
    label: () => 'Close Tab',
    isEnabled: () =>
      !!shell.currentWidget && !!shell.currentWidget.title.closable,
    execute: () => {
      if (shell.currentWidget) {
        shell.currentWidget.close();
      }
    }
  });
  palette.addItem({ command: CommandIDs.close, category });
  contextMenu.addItem({
    command: CommandIDs.close,
    selector: '.p-TabBar-tab',
    rank: 4
  });

  commands.addCommand(CommandIDs.closeAll, {
    label: 'Close All Tabs',
    execute: () => {
      shell.closeAll();
    }
  });
  palette.addItem({ command: CommandIDs.closeAll, category });

  commands.addCommand(CommandIDs.closeOtherTabs, {
    label: () => `Close Other Tabs`,
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
  palette.addItem({ command: CommandIDs.closeOtherTabs, category });
  contextMenu.addItem({
    command: CommandIDs.closeOtherTabs,
    selector: '.p-TabBar-tab',
    rank: 4
  });

  commands.addCommand(CommandIDs.closeRightTabs, {
    label: () => `Close Tabs to Right`,
    isEnabled: () =>
      contextMenuWidget() && widgetsRightOf(contextMenuWidget()).length > 0,
    execute: () => {
      const widget = contextMenuWidget();
      if (!widget) {
        return;
      }
      closeWidgets(widgetsRightOf(widget));
    }
  });
  palette.addItem({ command: CommandIDs.closeRightTabs, category });
  contextMenu.addItem({
    command: CommandIDs.closeRightTabs,
    selector: '.p-TabBar-tab',
    rank: 5
  });

  app.commands.addCommand(CommandIDs.toggleLeftArea, {
    label: args => 'Show Left Sidebar',
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
  palette.addItem({ command: CommandIDs.toggleLeftArea, category });

  app.commands.addCommand(CommandIDs.toggleRightArea, {
    label: args => 'Show Right Sidebar',
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
  palette.addItem({ command: CommandIDs.toggleRightArea, category });

  app.commands.addCommand(CommandIDs.togglePresentationMode, {
    label: args => 'Presentation Mode',
    execute: () => {
      shell.presentationMode = !shell.presentationMode;
    },
    isToggled: () => shell.presentationMode,
    isVisible: () => true
  });
  palette.addItem({ command: CommandIDs.togglePresentationMode, category });

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
  palette.addItem({ command: CommandIDs.toggleMode, category });
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
 * The default JupyterLab connection lost provider. This may be overridden
 * to provide custom behavior when a connection to the server is lost.
 */
const connectionlost: JupyterFrontEndPlugin<IConnectionLost> = {
  id: '@jupyterlab/apputils-extension:connectionlost',
  activate: (app: JupyterFrontEnd): IConnectionLost => {
    return ConnectionLost;
  },
  autoStart: true,
  provides: IConnectionLost
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
  connectionlost
];

export default plugins;
