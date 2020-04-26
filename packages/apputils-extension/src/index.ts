/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  Dialog,
  ICommandPalette,
  ISessionContextDialogs,
  ISplashScreen,
  IWindowResolver,
  WindowResolver,
  Printing,
  sessionContextDialogs
} from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { IStateDB, StateDB } from '@jupyterlab/statedb';

import { jupyterFaviconIcon } from '@jupyterlab/ui-components';

import { PromiseDelegate } from '@lumino/coreutils';

import { DisposableDelegate } from '@lumino/disposable';

import { Debouncer, Throttler } from '@lumino/polling';

import { Palette } from './palette';

import { settingsPlugin } from './settingsplugin';

import { themesPlugin, themesPaletteMenuPlugin } from './themeplugins';

/**
 * The interval in milliseconds before recover options appear during splash.
 */
const SPLASH_RECOVER_TIMEOUT = 12000;

/**
 * The command IDs used by the apputils plugin.
 */
namespace CommandIDs {
  export const loadState = 'apputils:load-statedb';

  export const print = 'apputils:print';

  export const reset = 'apputils:reset';

  export const resetOnLoad = 'apputils:reset-on-load';

  export const runFirstEnabled = 'apputils:run-first-enabled';
}

/**
 * The default command palette extension.
 */
const palette: JupyterFrontEndPlugin<ICommandPalette> = {
  activate: Palette.activate,
  id: '@jupyterlab/apputils-extension:palette',
  provides: ICommandPalette,
  autoStart: true
};

/**
 * The default command palette's restoration extension.
 *
 * #### Notes
 * The command palette's restoration logic is handled separately from the
 * command palette provider extension because the layout restorer dependency
 * causes the command palette to be unavailable to other extensions earlier
 * in the application load cycle.
 */
const paletteRestorer: JupyterFrontEndPlugin<void> = {
  activate: Palette.restore,
  id: '@jupyterlab/apputils-extension:palette-restorer',
  requires: [ILayoutRestorer],
  autoStart: true
};

/**
 * The default window name resolver provider.
 */
const resolver: JupyterFrontEndPlugin<IWindowResolver> = {
  id: '@jupyterlab/apputils-extension:resolver',
  autoStart: true,
  provides: IWindowResolver,
  requires: [JupyterFrontEnd.IPaths, IRouter],
  activate: async (
    _: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter
  ) => {
    const { hash, path, search } = router.current;
    const query = URLExt.queryStringToObject(search || '');
    const solver = new WindowResolver();
    const { urls } = paths;
    const match = path.match(new RegExp(`^${urls.workspaces}\/([^?\/]+)`));
    const workspace = (match && decodeURIComponent(match[1])) || '';
    const candidate = Private.candidate(paths, workspace);
    const rest = workspace
      ? path.replace(new RegExp(`^${urls.workspaces}\/${workspace}`), '')
      : path.replace(new RegExp(`^${urls.app}\/?`), '');
    try {
      await solver.resolve(candidate);
      return solver;
    } catch (error) {
      // Window resolution has failed so the URL must change. Return a promise
      // that never resolves to prevent the application from loading plugins
      // that rely on `IWindowResolver`.
      return new Promise<IWindowResolver>(() => {
        const { base, workspaces } = paths.urls;
        const pool =
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const random = pool[Math.floor(Math.random() * pool.length)];
        const path = URLExt.join(base, workspaces, `auto-${random}`, rest);

        // Clone the originally requested workspace after redirecting.
        query['clone'] = workspace;

        const url = path + URLExt.objectToQueryString(query) + (hash || '');
        router.navigate(url, { hard: true });
      });
    }
  }
};

/**
 * The default splash screen provider.
 */
const splash: JupyterFrontEndPlugin<ISplashScreen> = {
  id: '@jupyterlab/apputils-extension:splash',
  autoStart: true,
  provides: ISplashScreen,
  activate: app => {
    const { commands, restored } = app;

    // Create splash element and populate it.
    const splash = document.createElement('div');
    const galaxy = document.createElement('div');
    const logo = document.createElement('div');

    splash.id = 'jupyterlab-splash';
    galaxy.id = 'galaxy';
    logo.id = 'main-logo';

    jupyterFaviconIcon.element({
      container: logo,

      stylesheet: 'splash'
    });

    galaxy.appendChild(logo);
    ['1', '2', '3'].forEach(id => {
      const moon = document.createElement('div');
      const planet = document.createElement('div');

      moon.id = `moon${id}`;
      moon.className = 'moon orbit';
      planet.id = `planet${id}`;
      planet.className = 'planet';

      moon.appendChild(planet);
      galaxy.appendChild(moon);
    });

    splash.appendChild(galaxy);

    // Create debounced recovery dialog function.
    let dialog: Dialog<unknown> | null;
    const recovery = new Throttler(
      async () => {
        if (dialog) {
          return;
        }

        dialog = new Dialog({
          title: 'Loading...',
          body: `The loading screen is taking a long time.
          Would you like to clear the workspace or keep waiting?`,
          buttons: [
            Dialog.cancelButton({ label: 'Keep Waiting' }),
            Dialog.warnButton({ label: 'Clear Workspace' })
          ]
        });

        try {
          const result = await dialog.launch();
          dialog.dispose();
          dialog = null;
          if (result.button.accept && commands.hasCommand(CommandIDs.reset)) {
            return commands.execute(CommandIDs.reset);
          }

          // Re-invoke the recovery timer in the next frame.
          requestAnimationFrame(() => {
            // Because recovery can be stopped, handle invocation rejection.
            void recovery.invoke().catch(_ => undefined);
          });
        } catch (error) {
          /* no-op */
        }
      },
      { limit: SPLASH_RECOVER_TIMEOUT, edge: 'trailing' }
    );

    // Return ISplashScreen.
    let splashCount = 0;
    return {
      show: (light = true) => {
        splash.classList.remove('splash-fade');
        splash.classList.toggle('light', light);
        splash.classList.toggle('dark', !light);
        splashCount++;
        document.body.appendChild(splash);

        // Because recovery can be stopped, handle invocation rejection.
        void recovery.invoke().catch(_ => undefined);

        return new DisposableDelegate(async () => {
          await restored;
          if (--splashCount === 0) {
            void recovery.stop();

            if (dialog) {
              dialog.dispose();
              dialog = null;
            }

            splash.classList.add('splash-fade');
            window.setTimeout(() => {
              document.body.removeChild(splash);
            }, 200);
          }
        });
      }
    };
  }
};

const print: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:print',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    app.commands.addCommand(CommandIDs.print, {
      label: 'Print...',
      isEnabled: () => {
        const widget = app.shell.currentWidget;
        return Printing.getPrintFunction(widget) !== null;
      },
      execute: async () => {
        const widget = app.shell.currentWidget;
        const printFunction = Printing.getPrintFunction(widget);
        if (printFunction) {
          await printFunction();
        }
      }
    });
  }
};

/**
 * The default state database for storing application state.
 *
 * #### Notes
 * If this extension is loaded with a window resolver, it will automatically add
 * state management commands, URL support for `clone` and `reset`, and workspace
 * auto-saving. Otherwise, it will return a simple in-memory state database.
 */
const state: JupyterFrontEndPlugin<IStateDB> = {
  id: '@jupyterlab/apputils-extension:state',
  autoStart: true,
  provides: IStateDB,
  requires: [JupyterFrontEnd.IPaths, IRouter],
  optional: [ISplashScreen, IWindowResolver],
  activate: (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter,
    splash: ISplashScreen | null,
    resolver: IWindowResolver | null
  ) => {
    if (resolver === null) {
      return new StateDB();
    }

    let resolved = false;
    const { commands, serviceManager } = app;
    const { workspaces } = serviceManager;
    const workspace = resolver.name;
    const transform = new PromiseDelegate<StateDB.DataTransform>();
    const db = new StateDB({ transform: transform.promise });
    const save = new Debouncer(async () => {
      const id = workspace;
      const metadata = { id };
      const data = await db.toJSON();
      await workspaces.save(id, { data, metadata });
    });

    // Any time the local state database changes, save the workspace.
    db.changed.connect(() => void save.invoke(), db);

    commands.addCommand(CommandIDs.loadState, {
      execute: async (args: IRouter.ILocation) => {
        // Since the command can be executed an arbitrary number of times, make
        // sure it is safe to call multiple times.
        if (resolved) {
          return;
        }

        const { hash, path, search } = args;
        const { urls } = paths;
        const query = URLExt.queryStringToObject(search || '');
        const clone =
          typeof query['clone'] === 'string'
            ? query['clone'] === ''
              ? URLExt.join(urls.base, urls.app)
              : URLExt.join(urls.base, urls.workspaces, query['clone'])
            : null;
        const source = clone || workspace || null;

        if (source === null) {
          console.error(`${CommandIDs.loadState} cannot load null workspace.`);
          return;
        }

        try {
          const saved = await workspaces.fetch(source);

          // If this command is called after a reset, the state database
          // will already be resolved.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'overwrite', contents: saved.data });
          }
        } catch ({ message }) {
          console.warn(`Fetching workspace "${workspace}" failed.`, message);

          // If the workspace does not exist, cancel the data transformation
          // and save a workspace with the current user state data.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'cancel', contents: null });
          }
        }

        if (source === clone) {
          // Maintain the query string parameters but remove `clone`.
          delete query['clone'];

          const url = path + URLExt.objectToQueryString(query) + hash;
          const cloned = save.invoke().then(() => router.stop);

          // After the state has been cloned, navigate to the URL.
          void cloned.then(() => {
            router.navigate(url);
          });

          return cloned;
        }

        // After the state database has finished loading, save it.
        await save.invoke();
      }
    });

    commands.addCommand(CommandIDs.reset, {
      label: 'Reset Application State',
      execute: async () => {
        await db.clear();
        await save.invoke();
        router.reload();
      }
    });

    commands.addCommand(CommandIDs.resetOnLoad, {
      execute: (args: IRouter.ILocation) => {
        const { hash, path, search } = args;
        const query = URLExt.queryStringToObject(search || '');
        const reset = 'reset' in query;
        const clone = 'clone' in query;

        if (!reset) {
          return;
        }

        // If a splash provider exists, launch the splash screen.
        const loading = splash
          ? splash.show()
          : new DisposableDelegate(() => undefined);

        // If the state database has already been resolved, resetting is
        // impossible without reloading.
        if (resolved) {
          return router.reload();
        }

        // Empty the state database.
        resolved = true;
        transform.resolve({ type: 'clear', contents: null });

        // Maintain the query string parameters but remove `reset`.
        delete query['reset'];

        const url = path + URLExt.objectToQueryString(query) + hash;
        const cleared = db
          .clear()
          .then(() => save.invoke())
          .then(() => router.stop);

        // After the state has been reset, navigate to the URL.
        if (clone) {
          void cleared.then(() => {
            router.navigate(url, { hard: true });
          });
        } else {
          void cleared.then(() => {
            router.navigate(url);
            loading.dispose();
          });
        }

        return cleared;
      }
    });

    router.register({
      command: CommandIDs.loadState,
      pattern: /.?/,
      rank: 30 // High priority: 30:100.
    });

    router.register({
      command: CommandIDs.resetOnLoad,
      pattern: /(\?reset|\&reset)($|&)/,
      rank: 20 // High priority: 20:100.
    });

    return db;
  }
};

/**
 * The default session context dialogs extension.
 */
const sessionDialogs: JupyterFrontEndPlugin<ISessionContextDialogs> = {
  id: '@jupyterlab/apputils-extension:sessionDialogs',
  provides: ISessionContextDialogs,
  autoStart: true,
  activate: () => {
    return sessionContextDialogs;
  }
};

/**
 * Utility commands
 */
const utilityCommands: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:utilityCommands',
  autoStart: true,
  activate: app => {
    const { commands } = app;
    commands.addCommand(CommandIDs.runFirstEnabled, {
      label: 'Run First Enabled Command',
      execute: args => {
        const commands: string[] = args.commands as string[];
        const commandArgs: any = args.args;
        const argList = Array.isArray(args);
        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i];
          const arg = argList ? commandArgs[i] : commandArgs;
          if (app.commands.isEnabled(cmd, arg)) {
            return app.commands.execute(cmd, arg);
          }
        }
      }
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  palette,
  paletteRestorer,
  print,
  resolver,
  settingsPlugin,
  state,
  splash,
  sessionDialogs,
  themesPlugin,
  themesPaletteMenuPlugin,
  utilityCommands
];
export default plugins;

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Generate a workspace name candidate.
   *
   * @param workspace - A potential workspace name parsed from the URL.
   *
   * @returns A workspace name candidate.
   */
  export function candidate(
    { urls }: JupyterFrontEnd.IPaths,
    workspace = ''
  ): string {
    return workspace
      ? URLExt.join(urls.workspaces, workspace)
      : URLExt.join(urls.app);
  }
}
