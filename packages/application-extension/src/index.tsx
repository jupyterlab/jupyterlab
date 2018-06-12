// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin, ILayoutRestorer, IRouter, LayoutRestorer, Router
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, IWindowResolver, showDialog, showErrorMessage
} from '@jupyterlab/apputils';

import {
  IStateDB, PageConfig
} from '@jupyterlab/coreutils';

import * as React from 'react';


/**
 * The command IDs used by the application plugin.
 */
namespace CommandIDs {
  export
  const activateNextTab: string = 'application:activate-next-tab';

  export
  const activatePreviousTab: string = 'application:activate-previous-tab';

  export
  const closeAll: string = 'application:close-all';

  export
  const setMode: string = 'application:set-mode';

  export
  const toggleMode: string = 'application:toggle-mode';

  export
  const toggleLeftArea: string = 'application:toggle-left-area';

  export
  const toggleRightArea: string = 'application:toggle-right-area';

  export
  const togglePresentationMode: string = 'application:toggle-presentation-mode';

  export
  const tree: string = 'router:tree';
}


/**
 * The routing regular expressions used by the application plugin.
 */
namespace Patterns {
  export
  const tree = /[^?]*(\/tree\/([^?]+))/;
}


/**
 * The main extension.
 */
const main: JupyterLabPlugin<void> = {
  id: '@jupyterlab/application-extension:main',
  requires: [ICommandPalette, IRouter, IWindowResolver],
  activate: (app: JupyterLab, palette: ICommandPalette, router: IRouter, resolver: IWindowResolver) => {
    // Requiring the window resolver guarantees that the application extension
    // only loads if there is a viable window name. Otherwise, the application
    // will short-circuit and ask the user to navigate away.
    const workspace = resolver.name ? `"${resolver.name}"` : '[default: /lab]';

    console.log(`Starting application in workspace: ${workspace}`);

    // If there were errors registering plugins, tell the user.
    if (app.registerPluginErrors.length !== 0) {
      const body = (
        <pre>
          {app.registerPluginErrors.map(e => e.message).join('\n')}
        </pre>
      );

      showErrorMessage('Error Registering Plugins', { message: body });
    }

    addCommands(app, palette);

    // If the application shell layout is modified,
    // trigger a refresh of the commands.
    app.shell.layoutModified.connect(() => {
      app.commands.notifyCommandChanged();
    });

    const builder = app.serviceManager.builder;
    const build = () => {
      return builder.build().then(() => {
        return showDialog({
          title: 'Build Complete',
          body: 'Build successfully completed, reload page?',
          buttons: [Dialog.cancelButton(),
                    Dialog.warnButton({ label: 'RELOAD' })]
        });
      }).then(result => {
        if (result.button.accept) {
          router.reload();
        }
      }).catch(err => {
        showErrorMessage('Build Failed', { message: <pre>{err.message}</pre> });
      });
    };

    if (builder.isAvailable && builder.shouldCheck) {
      builder.getStatus().then(response => {
        if (response.status === 'building') {
          return build();
        }

        if (response.status !== 'needed') {
          return;
        }

        const body = (<div>
          <p>
            JupyterLab build is suggested:
            <br />
            <pre>{response.message}</pre>
          </p>
        </div>);

        showDialog({
          title: 'Build Recommended',
          body,
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'BUILD' })]
        }).then(result => result.button.accept ? build() : undefined);
      });
    }

    const message = 'Are you sure you want to exit JupyterLab?\n' +
                    'Any unsaved changes will be lost.';

    // The spec for the `beforeunload` event is implemented differently by
    // the different browser vendors. Consequently, the `event.returnValue`
    // attribute needs to set in addition to a return value being returned.
    // For more information, see:
    // https://developer.mozilla.org/en/docs/Web/Events/beforeunload
    window.addEventListener('beforeunload', event => {
      if (app.isDirty) {
        return (event as any).returnValue = message;
      }
    });
  },
  autoStart: true
};


/**
 * The default layout restorer provider.
 */
const layout: JupyterLabPlugin<ILayoutRestorer> = {
  id: '@jupyterlab/application-extension:layout',
  requires: [IStateDB],
  activate: (app: JupyterLab, state: IStateDB) => {
    const first = app.started;
    const registry = app.commands;
    const restorer = new LayoutRestorer({ first, registry, state });

    restorer.fetch().then(saved => {
      app.shell.restoreLayout(saved);
      app.shell.layoutModified.connect(() => {
        restorer.save(app.shell.saveLayout());
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
const router: JupyterLabPlugin<IRouter> = {
  id: '@jupyterlab/application-extension:router',
  activate: (app: JupyterLab) => {
    const { commands } = app;
    const base = PageConfig.getOption('pageUrl');
    const router = new Router({ base, commands });

    app.started.then(() => {
      // Route the very first request on load.
      router.route();

      // Route all pop state events.
      window.addEventListener('popstate', () => { router.route(); });
    });

    return router;
  },
  autoStart: true,
  provides: IRouter
};


/**
 * The tree route handler provider.
 */
const tree: JupyterLabPlugin<void> = {
  id: '@jupyterlab/application-extension:tree',
  autoStart: true,
  requires: [IRouter],
  activate: (app: JupyterLab, router: IRouter) => {
    const { commands } = app;

    commands.addCommand(CommandIDs.tree, {
      execute: (args: IRouter.ILocation) => {
        const { request } = args;
        const path = decodeURIComponent((args.path.match(Patterns.tree)[2]));
        const url = request.replace(request.match(Patterns.tree)[1], '');
        const immediate = true;

        // Silently remove the tree portion of the URL leaving the rest intact.
        router.navigate(url, { silent: true });

        return commands.execute('filebrowser:navigate-main', { path })
          .then(() => commands.execute('apputils:save-statedb', { immediate }))
          .catch(reason => { console.warn(`Tree routing failed:`, reason); });
      }
    });

    router.register({ command: CommandIDs.tree, pattern: Patterns.tree });
  }
};


/**
 * The default URL not found extension.
 */
const notfound: JupyterLabPlugin<void> = {
  id: '@jupyterlab/application-extension:notfound',
  activate: (app: JupyterLab, router: IRouter) => {
    const bad = PageConfig.getOption('notFoundUrl');
    const base = router.base;
    const message = `
      The path: ${bad} was not found. JupyterLab redirected to: ${base}
    `;

    if (!bad) {
      return;
    }

    // Change the URL back to the base application URL without adding the
    // URL change to the browser history.
    router.navigate('', { silent: true });

    showErrorMessage('Path Not Found', { message });
  },
  requires: [IRouter],
  autoStart: true
};


/**
 * Change the favicon changing based on the busy status;
 */
const busy: JupyterLabPlugin<void> = {
  id: '@jupyterlab/application-extension:faviconbusy',
  activate: async (app: JupyterLab) => {
    app.busySignal.connect((_, isBusy) => {
      const filename = isBusy ? 'favicon-busy-1.ico' : 'favicon.ico';
      const favicon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
      favicon.href = `/static/base/images/${filename}`;
    });
  },
  requires: [],
  autoStart: true,
};


/**
 * Add the main application commands.
 */
function addCommands(app: JupyterLab, palette: ICommandPalette): void {
  const category = 'Main Area';
  let command = CommandIDs.activateNextTab;

  app.commands.addCommand(command, {
    label: 'Activate Next Tab',
    execute: () => { app.shell.activateNextTab(); }
  });
  palette.addItem({ command, category });

  command = CommandIDs.activatePreviousTab;
  app.commands.addCommand(command, {
    label: 'Activate Previous Tab',
    execute: () => { app.shell.activatePreviousTab(); }
  });
  palette.addItem({ command, category });

  command = CommandIDs.closeAll;
  app.commands.addCommand(command, {
    label: 'Close All Widgets',
    execute: () => { app.shell.closeAll(); }
  });
  palette.addItem({ command, category });

  command = CommandIDs.toggleLeftArea;
  app.commands.addCommand(command, {
    label: args => 'Show Left Sidebar',
    execute: () => {
      if (app.shell.leftCollapsed) {
        app.shell.expandLeft();
      } else {
        app.shell.collapseLeft();
        if (app.shell.currentWidget) {
          app.shell.activateById(app.shell.currentWidget.id);
        }
      }
    },
    isToggled: () => !app.shell.leftCollapsed,
    isVisible: () => !app.shell.isEmpty('left')
  });
  palette.addItem({ command, category });

  command = CommandIDs.toggleRightArea;
  app.commands.addCommand(command, {
    label: args => 'Show Right Sidebar',
    execute: () => {
      if (app.shell.rightCollapsed) {
        app.shell.expandRight();
      } else {
        app.shell.collapseRight();
        if (app.shell.currentWidget) {
          app.shell.activateById(app.shell.currentWidget.id);
        }
      }
    },
    isToggled: () => !app.shell.rightCollapsed,
    isVisible: () => !app.shell.isEmpty('right')
  });
  palette.addItem({ command, category });

  command = CommandIDs.togglePresentationMode;
  app.commands.addCommand(command, {
    label: args => 'Presentation Mode',
    execute: () => {
      app.shell.presentationMode = !app.shell.presentationMode;
    },
    isToggled: () => app.shell.presentationMode,
    isVisible: () => true
  });
  palette.addItem({ command, category });

  command = CommandIDs.setMode;
  app.commands.addCommand(command, {
    isVisible: args => {
      const mode = args['mode'] as string;
      return mode === 'single-document' || mode === 'multiple-document';
    },
    execute: args => {
      const mode = args['mode'] as string;
      if (mode === 'single-document' || mode === 'multiple-document') {
        app.shell.mode = mode;
        return;
      }
      throw new Error(`Unsupported application shell mode: ${mode}`);
    }
  });

  command = CommandIDs.toggleMode;
  app.commands.addCommand(command, {
    label: 'Single-Document Mode',
    isToggled: () => app.shell.mode === 'single-document',
    execute: () => {
      const args = app.shell.mode === 'multiple-document' ?
        { mode: 'single-document' } : { mode: 'multiple-document' };
      return app.commands.execute(CommandIDs.setMode, args);
    }
  });
  palette.addItem({ command, category });
}


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  main, layout, router, tree, notfound, busy
];

export default plugins;
