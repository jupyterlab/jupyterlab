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
  WindowResolver,
  Printing
} from '@jupyterlab/apputils';

import {
  Debouncer,
  IRateLimiter,
  ISettingRegistry,
  IStateDB,
  SettingRegistry,
  StateDB,
  Throttler,
  URLExt
} from '@jupyterlab/coreutils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { PromiseDelegate } from '@phosphor/coreutils';

import { DisposableDelegate } from '@phosphor/disposable';

import { Menu } from '@phosphor/widgets';

import { Palette } from './palette';

import '../style/index.css';

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

  export const print = 'apputils:print';

  export const reset = 'apputils:reset';

  export const resetOnLoad = 'apputils:reset-on-load';
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
      if (
        app.shell.dataset.themeScrollbars !==
        String(manager.themeScrollbars(currentTheme))
      ) {
        app.shell.dataset.themeScrollbars = String(
          manager.themeScrollbars(currentTheme)
        );
      }
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
        return manager.setTheme(theme);
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
      void app.restored.then(() => {
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
      void app.restored.then(() => {
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
    const rest = workspace
      ? path.replace(new RegExp(`^${paths.urls.workspaces}${workspace}`), '')
      : path.replace(new RegExp(`^${paths.urls.page}`), '');

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
        const path = URLExt.join(base, workspaces, `auto-${random}`) + rest;

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
    let dialog: Dialog<any>;
    const recovery: IRateLimiter = new Throttler(async () => {
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
    }, SPLASH_RECOVER_TIMEOUT);

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
              ? URLExt.join(urls.base, urls.page)
              : URLExt.join(urls.base, urls.workspaces, query['clone'])
            : null;
        const source = clone || workspace || null;

        if (source === null) {
          console.error(`${CommandIDs.loadState} cannot load null workspace.`);
          return;
        }

        // Any time the local state database changes, save the workspace.
        db.changed.connect(() => void save.invoke(), db);

        try {
          const saved = await workspaces.fetch(source);

          // If this command is called after a reset, the state database
          // will already be resolved.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'overwrite', contents: saved.data });
          }
        } catch ({ message }) {
          console.log(`Fetching workspace "${workspace}" failed.`, message);

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
        const cleared = db.clear().then(() => router.stop);

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
  themesPaletteMenu,
  print
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
      ? URLExt.join(urls.base, urls.workspaces, workspace)
      : URLExt.join(urls.base, urls.page);
  }
}
