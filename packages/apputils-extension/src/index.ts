/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer, IRouter, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, ISplashScreen, IThemeManager, IWindowResolver,
  ThemeManager, WindowResolver
} from '@jupyterlab/apputils';

import {
  DataConnector, ISettingRegistry, IStateDB, PageConfig, SettingRegistry,
  StateDB, URLExt
} from '@jupyterlab/coreutils';

import {
  IMainMenu
} from '@jupyterlab/mainmenu';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Menu
} from '@phosphor/widgets';

import {
  activatePalette, restorePalette
} from './palette';

import {
  createRedirectForm
} from './redirect';

import '../style/index.css';


/**
 * The interval in milliseconds that calls to save a workspace are debounced
 * to allow for multiple quickly executed state changes to result in a single
 * workspace save operation.
 */
const WORKSPACE_SAVE_DEBOUNCE_INTERVAL = 750;

/**
 * The interval in milliseconds before recover options appear during splash.
 */
const SPLASH_RECOVER_TIMEOUT = 12000;


/**
 * The command IDs used by the apputils plugin.
 */
namespace CommandIDs {
  export
  const changeTheme = 'apputils:change-theme';

  export
  const loadState = 'apputils:load-statedb';

  export
  const recoverState = 'apputils:recover-statedb';

  export
  const reset = 'apputils:reset';

  export
  const resetOnLoad = 'apputils:reset-on-load';

  export
  const saveState = 'apputils:save-statedb';
}


/**
 * The routing regular expressions used by the apputils plugin.
 */
namespace Patterns {
  export
  const cloneState = /[?&]clone([=&]|$)/;

  export
  const loadState = /^\/workspaces\/([^?\/]+)/;

  export
  const resetOnLoad = /(\?reset|\&reset)($|&)/;
}


/**
 * A data connector to access plugin settings.
 */
class SettingsConnector extends DataConnector<ISettingRegistry.IPlugin, string> {
  /**
   * Create a new settings connector.
   */
  constructor(manager: ServiceManager) {
    super();
    this._manager = manager;
  }

  /**
   * Retrieve a saved bundle from the data connector.
   */
  fetch(id: string): Promise<ISettingRegistry.IPlugin> {
    return this._manager.settings.fetch(id).then(data => {
      // Replace the server ID with the original unmodified version.
      data.id = id;

      return data;
    });
  }

  /**
   * Save the user setting data in the data connector.
   */
  save(id: string, raw: string): Promise<void> {
    return this._manager.settings.save(id, raw);
  }

  private _manager: ServiceManager;
}


/**
 * The default commmand palette extension.
 */
const palette: JupyterLabPlugin<ICommandPalette> = {
  activate: activatePalette,
  id: '@jupyterlab/apputils-extension:palette',
  provides: ICommandPalette,
  autoStart: true
};


/**
 * The default commmand palette's restoration extension.
 *
 * #### Notes
 * The command palette's restoration logic is handled separately from the
 * command palette provider extension because the layout restorer dependency
 * causes the command palette to be unavailable to other extensions earlier
 * in the application load cycle.
 */
const paletteRestorer: JupyterLabPlugin<void> = {
  activate: restorePalette,
  id: '@jupyterlab/apputils-extension:palette-restorer',
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * The default setting registry provider.
 */
const settings: JupyterLabPlugin<ISettingRegistry> = {
  id: '@jupyterlab/apputils-extension:settings',
  activate: (app: JupyterLab): ISettingRegistry => {
    const connector = new SettingsConnector(app.serviceManager);

    return new SettingRegistry({ connector });
  },
  autoStart: true,
  provides: ISettingRegistry
};


/**
 * The default theme manager provider.
 */
const themes: JupyterLabPlugin<IThemeManager> = {
  id: '@jupyterlab/apputils-extension:themes',
  requires: [ISettingRegistry, ISplashScreen],
  optional: [ICommandPalette, IMainMenu],
  activate: (app: JupyterLab, settings: ISettingRegistry, splash: ISplashScreen, palette: ICommandPalette | null, mainMenu: IMainMenu | null): IThemeManager => {
    const host = app.shell;
    const commands = app.commands;
    const url = app.info.urls.themes;
    const key = themes.id;
    const manager = new ThemeManager({ key, host, settings, splash, url });

    // Keep a synchronously set reference to the current theme,
    // since the asynchronous setting of the theme in `changeTheme`
    // can lead to an incorrect toggle on the currently used theme.
    let currentTheme: string;

    commands.addCommand(CommandIDs.changeTheme, {
      label: args => {
        const theme = args['theme'] as string;
        return  args['isPalette'] ? `Use ${theme} Theme` : theme;
      },
      isToggled: args => args['theme'] === currentTheme,
      execute: args => {
        const theme = args['theme'] as string;
        if (theme === manager.theme) {
          return;
        }
        currentTheme = theme;
        manager.setTheme(theme);
        commands.notifyCommandChanged(CommandIDs.changeTheme);
      }
    });

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
      mainMenu.settingsMenu.addGroup([{
        type: 'submenu' as Menu.ItemType, submenu: themeMenu
      }], 0);
    }

    // If we have a command palette, add theme switching options to it.
    if (palette) {
      app.restored.then(() => {
        const category = 'Settings';
        const command = CommandIDs.changeTheme;
        const isPalette = true;
        currentTheme = manager.theme;

        manager.themes.forEach(theme => {
          palette.addItem({ command, args: { isPalette, theme }, category });
        });
      });
    }

    return manager;
  },
  autoStart: true,
  provides: IThemeManager
};


/**
 * The default window name resolver provider.
 */
const resolver: JupyterLabPlugin<IWindowResolver> = {
  id: '@jupyterlab/apputils-extension:resolver',
  autoStart: true,
  provides: IWindowResolver,
  requires: [IRouter],
  activate: (app: JupyterLab, router: IRouter) => {
    const candidate = Private.getWorkspace(router) || '';
    const resolver = new WindowResolver();

    return resolver.resolve(candidate)
      .catch(reason => {
        console.warn('Window resolution failed:', reason);

        return Private.redirect(router);
      })
      .then(() => {
        PageConfig.setOption('workspace', resolver.name);

        return resolver;
      });
  }
};


/**
 * The default splash screen provider.
 */
const splash: JupyterLabPlugin<ISplashScreen> = {
  id: '@jupyterlab/apputils-extension:splash',
  autoStart: true,
  provides: ISplashScreen,
  activate: app => {
    return {
      show: () => {
        const { commands, restored } = app;

        return Private.showSplash(restored, commands, CommandIDs.reset);
      }
    };
  }
};


/**
 * The default state database for storing application state.
 */
const state: JupyterLabPlugin<IStateDB> = {
  id: '@jupyterlab/apputils-extension:state',
  autoStart: true,
  provides: IStateDB,
  requires: [IRouter, IWindowResolver, ISplashScreen],
  activate: (app: JupyterLab, router: IRouter, resolver: IWindowResolver, splash: ISplashScreen) => {
    let debouncer: number;
    let resolved = false;

    const { commands, info, serviceManager } = app;
    const { workspaces } = serviceManager;
    const transform = new PromiseDelegate<StateDB.DataTransform>();
    const state = new StateDB({
      namespace: info.namespace,
      transform: transform.promise,
      windowName: resolver.name
    });

    commands.addCommand(CommandIDs.recoverState, {
      execute: () => {
        const immediate = true;
        const silent = true;

        // Clear the state silently so that the state changed signal listener
        // will not be triggered as it causes a save state.
        return state.clear(silent)
          .then(() => commands.execute(CommandIDs.saveState, { immediate }));
      }
    });

    // Conflate all outstanding requests to the save state command that happen
    // within the `WORKSPACE_SAVE_DEBOUNCE_INTERVAL` into a single promise.
    let conflated: PromiseDelegate<void> | null = null;

    commands.addCommand(CommandIDs.saveState, {
      label: () => `Save Workspace (${Private.getWorkspace(router)})`,
      isEnabled: () => !!Private.getWorkspace(router),
      execute: args => {
        const workspace = Private.getWorkspace(router);

        if (!workspace) {
          return;
        }

        const timeout = args.immediate ? 0 : WORKSPACE_SAVE_DEBOUNCE_INTERVAL;
        const id = workspace;
        const metadata = { id };

        // Only instantiate a new conflated promise if one is not outstanding.
        if (!conflated) {
          conflated = new PromiseDelegate<void>();
        }

        if (debouncer) {
          window.clearTimeout(debouncer);
        }

        debouncer = window.setTimeout(() => {
          // Prevent a race condition between the timeout and saving.
          if (!conflated) {
            return;
          }

          state.toJSON()
            .then(data => workspaces.save(id, { data, metadata }))
            .then(() => {
              conflated.resolve(undefined);
              conflated = null;
            })
            .catch(reason => {
              conflated.reject(reason);
              conflated = null;
            });
        }, timeout);

        return conflated.promise;
      }
    });

    const listener = (sender: any, change: StateDB.Change) => {
      commands.execute(CommandIDs.saveState);
    };

    commands.addCommand(CommandIDs.loadState, {
      execute: (args: IRouter.ILocation) => {
        // Since the command can be executed an arbitrary number of times, make
        // sure it is safe to call multiple times.
        if (resolved) {
          return;
        }

        const { hash, path, search } = args;
        const workspace = Private.getWorkspace(router);
        const query = URLExt.queryStringToObject(search || '');
        const clone = query['clone'];
        const source = typeof clone === 'string' ? clone : workspace;

        let promise: Promise<any>;

        // If the default /lab workspace is being cloned, copy it out of local
        // storage instead of making a round trip to the server because it
        // does not exist on the server.
        if (source === clone && source === '') {
          const prefix = `${source}:${info.namespace}:`;
          const mask = (key: string) => key.replace(prefix, '');
          const contents = StateDB.toJSON(prefix, mask);

          resolved = true;
          transform.resolve({ type: 'overwrite', contents });
          promise = Promise.resolve();
        }


        // If there is no promise, fetch the source and overwrite the database.
        promise = promise || workspaces.fetch(source).then(saved => {
          // If this command is called after a reset, the state database will
          // already be resolved.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'overwrite', contents: saved.data });
          }
        }).catch(reason => {
          console.warn(`Fetching workspace (${workspace}) failed:`, reason);

          // If the workspace does not exist, cancel the data transformation and
          // save a workspace with the current user state data.
          if (!resolved) {
            resolved = true;
            transform.resolve({ type: 'cancel', contents: null });
          }
        }).then(() => {
          // Any time the local state database changes, save the workspace.
          if (workspace) {
            state.changed.connect(listener, state);
          }
        });

        return promise.catch(reason => {
          console.warn(`${CommandIDs.loadState} failed:`, reason);
        }).then(() => {
          const immediate = true;

          if (source === clone) {
            // Maintain the query string parameters but remove `clone`.
            delete query['clone'];

            const url = path + URLExt.objectToQueryString(query) + hash;
            const cloned = commands.execute(CommandIDs.saveState, { immediate })
              .then(() => router.stop);

            // After the state has been cloned, navigate to the URL.
            cloned.then(() => { router.navigate(url, { silent: true }); });

            return cloned;
          }

          // After the state database has finished loading, save it.
          return commands.execute(CommandIDs.saveState, { immediate });
        });
      }
    });
    // Both the load state and clone state patterns should trigger the load
    // state command if the URL matches one of them, but cloning a workspace
    // outranks loading it because it is an explicit user action.
    router.register({
      command: CommandIDs.loadState, pattern: Patterns.cloneState,
      rank: 20 // Set loading rank at a higher priority than the default 100.
    });
    router.register({
      command: CommandIDs.loadState, pattern: Patterns.loadState,
      rank: 30 // Set loading rank at a higher priority than the default 100.
    });

    commands.addCommand(CommandIDs.reset, {
      label: 'Reset Application State',
      execute: () => {
        commands.execute(CommandIDs.recoverState)
          .then(() => { router.reload(); })
          .catch(() => { router.reload(); });
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

        const loading = splash.show();

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
        const cleared = commands.execute(CommandIDs.recoverState)
          .then(() => router.stop); // Stop routing before new route navigation.

        // After the state has been reset, navigate to the URL.
        if (clone) {
          cleared.then(() => { router.navigate(url, { silent, hard }); });
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
      command: CommandIDs.resetOnLoad,
      pattern: Patterns.resetOnLoad,
      rank: 10 // Set reset rank at a higher priority than the default 100.
    });

    const fallthrough = () => {
      // If the state database is still unresolved after the first URL has been
      // routed, leave it intact.
      if (!resolved) {
        resolved = true;
        transform.resolve({ type: 'cancel', contents: null });
      }
      router.routed.disconnect(fallthrough, state);
    };

    router.routed.connect(fallthrough, state);

    return state;
  }
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  palette, paletteRestorer, resolver, settings, state, splash, themes
];
export default plugins;


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Returns the workspace name from the URL, if it exists.
   */
  export
  function getWorkspace(router: IRouter): string {
    const match = router.current.path.match(Patterns.loadState);

    return match && decodeURIComponent(match[1]) || '';
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

    dialog.launch().then(result => {
      if (result.button.accept) {
        return fn();
      }

      dialog.dispose();
      dialog = null;

      debouncer = window.setTimeout(() => {
        recover(fn);
      }, SPLASH_RECOVER_TIMEOUT);
    }).catch(() => { /* no-op */ });
  }

  /**
   * Allows the user to clear state if splash screen takes too long.
   */
  export
  function redirect(router: IRouter, warn = false): Promise<void> {
    const form = createRedirectForm(warn);
    const dialog = new Dialog({
      title: 'Please use a different workspace.',
      body: form,
      focusNodeSelector: 'input',
      buttons: [Dialog.okButton({ label: 'Switch Workspace' })]
    });

    return dialog.launch().then(result => {
      dialog.dispose();

      if (result.value) {
        const url = `workspaces/${result.value}`;

        // Navigate to a new workspace URL and abandon this session altogether.
        router.navigate(url, { hard: true, silent: true });

        // This promise will never resolve because the application navigates
        // away to a new location. It only exists to satisfy the return type
        // of the `redirect` function.
        return new Promise<void>(() => { /* no-op */ });
      }

      return redirect(router, true);
    });
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
   * @param recovery - A command that recovers from a hanging splash.
   */
  export
  function showSplash(ready: Promise<any>, commands: CommandRegistry, recovery: string): IDisposable {
    splash.classList.remove('splash-fade');
    splashCount++;

    if (debouncer) {
      window.clearTimeout(debouncer);
    }
    debouncer = window.setTimeout(() => {
      if (commands.hasCommand(recovery)) {
        recover(() => { commands.execute(recovery); });
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
          window.setTimeout(() => { document.body.removeChild(splash); }, 500);
        }
      });
    });
  }
}

