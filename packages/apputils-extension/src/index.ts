/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IThemeManager, ThemeManager, ISplashScreen
} from '@jupyterlab/apputils';

import {
  DataConnector, ISettingRegistry, IStateDB, SettingRegistry, StateDB
} from '@jupyterlab/coreutils';

import {
  IMainMenu
} from '@jupyterlab/mainmenu';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  each
} from '@phosphor/algorithm';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Menu
} from '@phosphor/widgets';

import {
  activatePalette
} from './palette';

import '../style/index.css';


/**
 * The command IDs used by the apputils plugin.
 */
namespace CommandIDs {
  export
  const clearStateDB = 'apputils:clear-statedb';

  export
  const changeTheme = 'apputils:change-theme';
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
  activate: (app: JupyterLab, settingRegistry: ISettingRegistry, splash: ISplashScreen, palette: ICommandPalette | null, mainMenu: IMainMenu | null): IThemeManager => {
    const host = app.shell;
    const when = app.started;
    const commands = app.commands;

    const manager = new ThemeManager({
      key: themes.id,
      host, settingRegistry,
      url: app.info.urls.themes,
      splash,
      when
    });

    commands.addCommand(CommandIDs.changeTheme, {
      label: args => {
        const theme = args['theme'] as string;
        return  args['isPalette'] ? `Use ${theme} Theme` : theme;
      },
      isToggled: args => args['theme'] === manager.theme,
      execute: args => {
        if (args['theme'] === manager.theme) {
          return;
        }
        manager.setTheme(args['theme'] as string);
      }
    });

    // If we have a main menu, add the theme manager
    // to the settings menu.
    if (mainMenu) {
      const themeMenu = new Menu({ commands });
      themeMenu.title.label = 'JupyterLab Theme';
      manager.ready.then(() => {
        each(manager.themes, theme => {
          themeMenu.addItem({
            command: CommandIDs.changeTheme,
            args: { isPalette: false, theme: theme }
          });
        });
      });
      mainMenu.settingsMenu.addGroup([{
        type: 'submenu' as Menu.ItemType, submenu: themeMenu
      }], 0);
    }

    // If we have a command palette, add theme
    // switching options to it.
    if (palette) {
      const category = 'Settings';
      manager.ready.then(() => {
        each(manager.themes, theme => {
          palette.addItem({
            command: CommandIDs.changeTheme,
            args: { isPalette: true, theme: theme },
            category
          });
        });
      });
    }

    return manager;
  },
  autoStart: true,
  provides: IThemeManager
};


/**
 * The default splash screen provider.
 */
const splash: JupyterLabPlugin<ISplashScreen> = {
  id: '@jupyterlab/apputils-extension:splash',
  autoStart: true,
  provides: ISplashScreen,
  activate: () => {
    return {
      show: () => {
        return Private.showSplash();
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
  activate: (app: JupyterLab) => {
    const state = new StateDB({
      namespace: app.info.namespace,
      when: app.restored.then(() => { /* no-op */ })
    });
    const version = app.info.version;
    const key = 'statedb:version';
    const fetch = state.fetch(key);
    const save = () => state.save(key, { version });
    const reset = () => state.clear().then(save);
    const check = (value: JSONObject) => {
      let old = value && value['version'];
      if (!old || old !== version) {
        const previous = old || 'unknown';
        console.log(`Upgraded: ${previous} to ${version}; Resetting DB.`);
        return reset();
      }
    };

    app.commands.addCommand(CommandIDs.clearStateDB, {
      label: 'Clear Application Restore State',
      execute: () => state.clear()
    });

    return fetch.then(check, reset).then(() => state);
  }
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  palette, settings, state, splash, themes
];
export default plugins;



/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The splash element.
   */
  let splash: HTMLElement | null;

  /**
   * The splash screen counter.
   */
  let splashCount = 0;

  /**
   * Show the splash element.
   */
  export
  function showSplash(): IDisposable {
    if (!splash) {
      splash = document.createElement('div');
      splash.id = 'jupyterlab-splash';

      let galaxy = document.createElement('div');
      galaxy.id = 'galaxy';
      splash.appendChild(galaxy);

      let mainLogo = document.createElement('div');
      mainLogo.id = 'main-logo';

      let planet = document.createElement('div');
      let planet2 = document.createElement('div');
      let planet3 = document.createElement('div');
      planet.className = 'planet';
      planet2.className = 'planet';
      planet3.className = 'planet';

      let moon1 = document.createElement('div');
      moon1.id = 'moon1';
      moon1.className = 'moon orbit';
      moon1.appendChild(planet);

      let moon2 = document.createElement('div');
      moon2.id = 'moon2';
      moon2.className = 'moon orbit';
      moon2.appendChild(planet2);

      let moon3 = document.createElement('div');
      moon3.id = 'moon3';
      moon3.className = 'moon orbit';
      moon3.appendChild(planet3);

      galaxy.appendChild(mainLogo);
      galaxy.appendChild(moon1);
      galaxy.appendChild(moon2);
      galaxy.appendChild(moon3);
    }
    splash.classList.remove('splash-fade');
    document.body.appendChild(splash);
    splashCount++;
    return new DisposableDelegate(() => {
      splashCount = Math.max(splashCount - 1, 0);
      if (splashCount === 0 && splash) {
        splash.classList.add('splash-fade');
        setTimeout(() => {
          document.body.removeChild(splash);
        }, 500);
      }
    });
  }
}

