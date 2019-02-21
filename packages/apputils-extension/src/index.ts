/*-----------------------------------------------------------------------------
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
  ISplashScreen,
  IThemeManager,
  IWindowResolver,
  ThemeManager,
  WindowResolver
} from '@jupyterlab/apputils';

import {
  ISettingRegistry,
  IStateDB,
  SettingRegistry,
  StateDB,
  URLExt
} from '@jupyterlab/coreutils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { CommandRegistry } from '@phosphor/commands';

import { PromiseDelegate } from '@phosphor/coreutils';

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

import { Menu } from '@phosphor/widgets';

import { Palette } from './palette';

import { createRedirectForm } from './redirect';

import '../style/index.css';

/**
 * The interval in milliseconds that calls to save a workspace are debounced
 * to allow for multiple quickly executed state changes to result in a single
 * workspace save operation.
 */
const WORKSPACE_SAVE_DEBOUNCE_INTERVAL = 750;

/**
 * The query string parameter indicating that a workspace name should be
 * automatically generated if the current request collides with an open session.
 */
const WORKSPACE_RESOLVE = 'resolve-workspace';

/**
 * The interval in milliseconds before recover options appear during splash.
 */
const SPLASH_RECOVER_TIMEOUT = 12000;

/**
 * The command IDs used by the apputils plugin.
 */
namespace CommandIDs {
  export const changeTheme = 'apputils:change-theme';

  export const loadState = 'apputils:load-statedb';

  export const recoverState = 'apputils:recover-statedb';

  export const reset = 'apputils:reset';

  export const resetOnLoad = 'apputils:reset-on-load';

  export const saveState = 'apputils:save-statedb';
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
 * The default setting registry provider.
 */
const settings: JupyterFrontEndPlugin<ISettingRegistry> = {
  id: '@jupyterlab/apputils-extension:settings',
  activate: async (app: JupyterFrontEnd): Promise<ISettingRegistry> => {
    const connector = app.serviceManager.settings;
    const plugins = (await connector.list()).values;

    return new SettingRegistry({ connector, plugins });
  },
  autoStart: true,
  provides: ISettingRegistry
};

/**
 * The default theme manager provider.
 */
const themes: JupyterFrontEndPlugin<IThemeManager> = {
  id: '@jupyterlab/apputils-extension:themes',
  requires: [ISettingRegistry, JupyterFrontEnd.IPaths],
  optional: [ISplashScreen],
  activate: (
    app: JupyterFrontEnd,
    settings: ISettingRegistry,
    paths: JupyterFrontEnd.IPaths,
    splash: ISplashScreen | null
  ): IThemeManager => {
    const host = app.shell;
    const commands = app.commands;
    const url = URLExt.join(paths.urls.base, paths.urls.themes);
    const key = themes.id;
    const manager = new ThemeManager({ key, host, settings, splash, url });

    // Keep a synchronously set reference to the current theme,
    // since the asynchronous setting of the theme in `changeTheme`
    // can lead to an incorrect toggle on the currently used theme.
    let currentTheme: string;

    // Set data attributes on the application shell for the current theme.
    manager.themeChanged.connect((sender, args) => {
      currentTheme = args.newValue;
      app.shell.dataset.themeLight = String(manager.isLight(currentTheme));
      app.shell.dataset.themeName = currentTheme;
      commands.notifyCommandChanged(CommandIDs.changeTheme);
    });

    commands.addCommand(CommandIDs.changeTheme, {
      label: args => {
        const theme = args['theme'] as string;
        return args['isPalette'] ? `Use ${theme} Theme` : theme;
      },
      isToggled: args => args['theme'] === currentTheme,
      execute: args => {
        const theme = args['theme'] as string;
        if (theme === manager.theme) {
          return;
        }
        manager.setTheme(theme);
      }
    });

    return manager;
  },
  autoStart: true,
  provides: IThemeManager
};

/**
 * The default theme manager's UI command palette and main menu functionality.
 *
 * #### Notes
 * This plugin loads separately from the theme manager plugin in order to
 * prevent blocking of the theme manager while it waits for the command palette
 * and main menu to become available.
 */
const themesPaletteMenu: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:themes-palette-menu',
  requires: [IThemeManager],
  optional: [ICommandPalette, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    manager: IThemeManager,
    palette: ICommandPalette | null,
    mainMenu: IMainMenu | null
  ): void => {
    const commands = app.commands;

    // If we have a main menu, add the theme manager to the settings menu.
    if (mainMenu) {
      const themeMenu = new Menu({ commands });
      themeMenu.title.label = 'JupyterLab Theme';
      app.restored.then(() => {
        const command = CommandIDs.changeTheme;
        const isPalette = false;

        manager.themes.forEach(theme => {
          themeMenu.addItem({ command, args: { isPalette, theme } });
        });
      });
      mainMenu.settingsMenu.addGroup(
        [
          {
            type: 'submenu' as Menu.ItemType,
            submenu: themeMenu
          }
        ],
        0
      );
    }

    // If we have a command palette, add theme switching options to it.
    if (palette) {
      app.restored.then(() => {
        const category = 'Settings';
        const command = CommandIDs.changeTheme;
        const isPalette = true;

        manager.themes.forEach(theme => {
          palette.addItem({ command, args: { isPalette, theme }, category });
        });
      });
    }
  },
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
    const match = path.match(new RegExp(`^${paths.urls.workspaces}([^?\/]+)`));
    const workspace = (match && decodeURIComponent(match[1])) || '';
    const candidate = Private.candidate(paths, workspace);

    try {
      await solver.resolve(candidate);
    } catch (error) {
      // Window resolution has failed so the URL must change. Return a promise
      // that never resolves to prevent the application from loading plugins
      // that rely on `IWindowResolver`.
      return new Promise<IWindowResolver>(() => {
        // If the user has requested workspace resolution create a new one.
        if (WORKSPACE_RESOLVE in query) {
          const { base, workspaces } = paths.urls;
          const pool =
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          const random = pool[Math.floor(Math.random() * pool.length)];
          const path = URLExt.join(base, workspaces, `auto-${random}`);

          // Clone the originally requested workspace after redirecting.
          query['clone'] = workspace;

          // Change the URL and trigger a hard reload to re-route.
          const url = path + URLExt.objectToQueryString(query) + (hash || '');
          router.navigate(url, { hard: true, silent: true });
          return;
        }

        // Launch a dialog to ask the user for a new workspace name.
        console.warn('Window resolution failed:', error);
        Private.redirect(router, paths, workspace);
      });
    }

    // If the user has requested workspace resolution remove the query param.
    if (WORKSPACE_RESOLVE in query) {
      delete query[WORKSPACE_RESOLVE];

      // Silently scrub the URL.
      const url = path + URLExt.objectToQueryString(query) + (hash || '');
      router.navigate(url, { silent: true });
    }

    return solver;
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
    return {
      show: (light = true) => {
        const { commands, restored } = app;

        return Private.showSplash(restored, commands, CommandIDs.reset, light);
      }
    };
  }
};

/**
 * The default state database for storing application state.
 */
const state: JupyterFrontEndPlugin<IStateDB> = {
  id: '@jupyterlab/apputils-extension:state',
  autoStart: true,
  provides: IStateDB,
  requires: [JupyterFrontEnd.IPaths, IRouter, IWindowResolver],
  optional: [ISplashScreen],
  activate: (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter,
    resolver: IWindowResolver,
    splash: ISplashScreen | null
  ) => {
    let debouncer: number;
    let resolved = false;

    const { commands, serviceManager } = app;
    const { workspaces } = serviceManager;
    const workspace = resolver.name;
    const transform = new PromiseDelegate<StateDB.DataTransform>();
    const db = new StateDB({
      namespace: app.namespace,
      transform: transform.promise,
      windowName: workspace
    });

    commands.addCommand(CommandIDs.recoverState, {
      execute: async ({ global }) => {
        const immediate = true;
        const silent = true;

        // Clear the state silently so that the state changed signal listener
        // will not be triggered as it causes a save state.
        await db.clear(silent);

        // If the user explictly chooses to recover state, all of local storage
        // should be cleared.
        if (global) {
          try {
            window.localStorage.clear();
            console.log('Cleared local storage');
          } catch (error) {
            console.warn('Clearing local storage failed.', error);

            // To give the user time to see the console warning before redirect,
            // do not set the `immediate` flag.
            return commands.execute(CommandIDs.saveState);
          }
        }

        return commands.execute(CommandIDs.saveState, { immediate });
      }
    });

    // Conflate all outstanding requests to the save state command that happen
    // within the `WORKSPACE_SAVE_DEBOUNCE_INTERVAL` into a single promise.
    let conflated: PromiseDelegate<void> | null = null;

    commands.addCommand(CommandIDs.saveState, {
      label: () => `Save Workspace (${workspace})`,
      execute: ({ immediate }) => {
        const timeout = immediate ? 0 : WORKSPACE_SAVE_DEBOUNCE_INTERVAL;
        const id = workspace;
        const metadata = { id };

        // Only instantiate a new conflated promise if one is not outstanding.
        if (!conflated) {
          conflated = new PromiseDelegate<void>();
        }

        if (debouncer) {
          window.clearTimeout(debouncer);
        }

        debouncer = window.setTimeout(async () => {
          // Prevent a race condition between the timeout and saving.
          if (!conflated) {
            return;
          }

          const data = await db.toJSON();

          try {
            await workspaces.save(id, { data, metadata });
            conflated.resolve(undefined);
          } catch (error) {
            conflated.reject(error);
          }
          conflated = null;
        }, timeout);

        return conflated.promise;
      }
    });

    const listener = (sender: any, change: StateDB.Change) => {
      commands.execute(CommandIDs.saveState);
    };

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
              ? urls.defaultWorkspace
              : URLExt.join(urls.base, urls.workspaces, query['clone'])
            : null;
        const source = clone || workspace;

        try {
          const saved = await workspaces.fetch(source);

          // If this command is called after a reset, the state database
          // will already be resolved.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'overwrite', contents: saved.data });
          }
        } catch (error) {
          console.warn(`Fetching workspace (${workspace}) failed:`, error);

          // If the workspace does not exist, cancel the data transformation
          // and save a workspace with the current user state data.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'cancel', contents: null });
          }
        }

        // Any time the local state database changes, save the workspace.
        if (workspace) {
          db.changed.connect(
            listener,
            db
          );
        }

        const immediate = true;

        if (source === clone) {
          // Maintain the query string parameters but remove `clone`.
          delete query['clone'];

          const url = path + URLExt.objectToQueryString(query) + hash;
          const cloned = commands
            .execute(CommandIDs.saveState, { immediate })
            .then(() => router.stop);

          // After the state has been cloned, navigate to the URL.
          cloned.then(() => {
            router.navigate(url, { silent: true });
          });

          return cloned;
        }

        // After the state database has finished loading, save it.
        return commands.execute(CommandIDs.saveState, { immediate });
      }
    });

    commands.addCommand(CommandIDs.reset, {
      label: 'Reset Application State',
      execute: async () => {
        const global = true;

        try {
          await commands.execute(CommandIDs.recoverState, { global });
        } catch (error) {
          /* Ignore failures and redirect. */
        }
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

        const silent = true;
        const hard = true;
        const url = path + URLExt.objectToQueryString(query) + hash;
        const cleared = commands
          .execute(CommandIDs.recoverState)
          .then(() => router.stop); // Stop routing before new route navigation.

        // After the state has been reset, navigate to the URL.
        if (clone) {
          cleared.then(() => {
            router.navigate(url, { silent, hard });
          });
        } else {
          cleared.then(() => {
            router.navigate(url, { silent });
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

    // Clean up state database when the window unloads.
    window.addEventListener('beforeunload', () => {
      const silent = true;

      db.clear(silent).catch(() => {
        /* no-op */
      });
    });

    return db;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  palette,
  paletteRestorer,
  resolver,
  settings,
  state,
  splash,
  themes,
  themesPaletteMenu
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
    paths: JupyterFrontEnd.IPaths,
    workspace = ''
  ): string {
    return workspace
      ? URLExt.join(paths.urls.base, paths.urls.workspaces, workspace)
      : paths.urls.defaultWorkspace;
  }

  /**
   * Create a splash element.
   */
  function createSplash(): HTMLElement {
    const splash = document.createElement('div');
    const galaxy = document.createElement('div');
    const logo = document.createElement('div');

    splash.id = 'jupyterlab-splash';
    galaxy.id = 'galaxy';
    logo.id = 'main-logo';

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

    return splash;
  }

  /**
   * A debouncer for recovery attempts.
   */
  let debouncer = 0;

  /**
   * The recovery dialog.
   */
  let dialog: Dialog<any>;

  /**
   * Allows the user to clear state if splash screen takes too long.
   */
  function recover(fn: () => void): void {
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

    dialog
      .launch()
      .then(result => {
        if (result.button.accept) {
          return fn();
        }

        dialog.dispose();
        dialog = null;

        debouncer = window.setTimeout(() => {
          recover(fn);
        }, SPLASH_RECOVER_TIMEOUT);
      })
      .catch(() => {
        /* no-op */
      });
  }

  /**
   * Allows the user to clear state if splash screen takes too long.
   */
  export async function redirect(
    router: IRouter,
    paths: JupyterFrontEnd.IPaths,
    workspace: string,
    warn = false
  ): Promise<void> {
    const form = createRedirectForm(warn);
    const dialog = new Dialog({
      title: 'Please use a different workspace.',
      body: form,
      focusNodeSelector: 'input',
      buttons: [Dialog.okButton({ label: 'Switch Workspace' })]
    });
    const result = await dialog.launch();

    dialog.dispose();
    if (!result.value) {
      return redirect(router, paths, workspace, true);
    }

    // Navigate to a new workspace URL and abandon this session altogether.
    const page = paths.urls.page;
    const workspaces = paths.urls.workspaces;
    const prefix = (workspace ? workspaces : page).length + workspace.length;
    const rest = router.current.request.substring(prefix);
    const url = URLExt.join(workspaces, result.value, rest);

    router.navigate(url, { hard: true, silent: true });

    // This promise will never resolve because the application navigates
    // away to a new location. It only exists to satisfy the return type
    // of the `redirect` function.
    return new Promise<void>(() => undefined);
  }

  /**
   * The splash element.
   */
  const splash = createSplash();

  /**
   * The splash screen counter.
   */
  let splashCount = 0;

  /**
   * Show the splash element.
   *
   * @param ready - A promise that must be resolved before splash disappears.
   *
   * @param commands - The application's command registry.
   *
   * @param recovery - A command that recovers from a hanging splash.
   *
   * @param light - A flag indicating whether the theme is light or dark.
   */
  export function showSplash(
    ready: Promise<any>,
    commands: CommandRegistry,
    recovery: string,
    light: boolean
  ): IDisposable {
    splash.classList.remove('splash-fade');
    splash.classList.toggle('light', light);
    splash.classList.toggle('dark', !light);
    splashCount++;

    if (debouncer) {
      window.clearTimeout(debouncer);
    }
    debouncer = window.setTimeout(() => {
      if (commands.hasCommand(recovery)) {
        recover(() => {
          commands.execute(recovery);
        });
      }
    }, SPLASH_RECOVER_TIMEOUT);

    document.body.appendChild(splash);

    return new DisposableDelegate(() => {
      ready.then(() => {
        if (--splashCount === 0) {
          if (debouncer) {
            window.clearTimeout(debouncer);
            debouncer = 0;
          }

          if (dialog) {
            dialog.dispose();
            dialog = null;
          }

          splash.classList.add('splash-fade');
          window.setTimeout(() => {
            document.body.removeChild(splash);
          }, 500);
        }
      });
    });
  }
}
