/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu, MainMenu, IThemeManager, ThemeManager,
  ISplashScreen
} from '@jupyterlab/apputils';

import {
  IDataConnector, ISettingRegistry, IStateDB, SettingRegistry, StateDB
} from '@jupyterlab/coreutils';

import {
  ServiceManager, ServerConnection
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Widget
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
};


/**
 * Convert an API `XMLHTTPRequest` error to a simple error.
 */
function apiError(id: string, xhr: XMLHttpRequest): Error {
  let message: string;

  try {
    message = JSON.parse(xhr.response).message;
  } catch (error) {
    message = `Error accessing ${id} HTTP ${xhr.status} ${xhr.statusText}`;
  }

  return new Error(message);
}


/**
 * Create a data connector to access plugin settings.
 */
function newConnector(manager: ServiceManager): IDataConnector<ISettingRegistry.IPlugin, JSONObject> {
  return {
    /**
     * Retrieve a saved bundle from the data connector.
     */
    fetch(id: string): Promise<ISettingRegistry.IPlugin> {
      return manager.settings.fetch(id).catch(reason => {
        throw apiError(id, (reason as ServerConnection.IError).xhr);
      });
    },

    /**
     * Remove a value from the data connector.
     */
    remove(): Promise<void> {
      const message = 'Removing setting resources is not supported.';

      return Promise.reject(new Error(message));
    },

    /**
     * Save the user setting data in the data connector.
     */
    save(id: string, user: JSONObject): Promise<void> {
      return manager.settings.save(id, user).catch(reason => {
        throw apiError(id, (reason as ServerConnection.IError).xhr);
      });
    }
  };
}


/**
 * A service providing an interface to the main menu.
 */
const mainMenuPlugin: JupyterLabPlugin<IMainMenu> = {
  id: 'jupyter.services.main-menu',
  provides: IMainMenu,
  activate: (app: JupyterLab): IMainMenu => {
    let menu = new MainMenu();
    menu.id = 'jp-MainMenu';

    let logo = new Widget();
    logo.addClass('jp-MainAreaPortraitIcon');
    logo.addClass('jp-JupyterIcon');
    logo.id = 'jp-MainLogo';

    app.shell.addToTopArea(logo);
    app.shell.addToTopArea(menu);

    return menu;
  }
};


/**
 * The default commmand palette extension.
 */
const palettePlugin: JupyterLabPlugin<ICommandPalette> = {
  activate: activatePalette,
  id: 'jupyter.services.commandpalette',
  provides: ICommandPalette,
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * The default setting registry provider.
 */
const settingPlugin: JupyterLabPlugin<ISettingRegistry> = {
  id: 'jupyter.services.setting-registry',
  activate: (app: JupyterLab): ISettingRegistry => {
    return new SettingRegistry({ connector: newConnector(app.serviceManager) });
  },
  autoStart: true,
  provides: ISettingRegistry
};



/**
 * The default theme manager provider.
 */
const themePlugin: JupyterLabPlugin<IThemeManager> = {
  id: 'jupyter.services.theme-manger',
  requires: [ISettingRegistry, ISplashScreen],
  activate: (app: JupyterLab, settingRegistry: ISettingRegistry, splash: ISplashScreen): IThemeManager => {
    let baseUrl = app.serviceManager.serverSettings.baseUrl;
    let host = app.shell;
    let when = app.started;
    let manager = new ThemeManager({ baseUrl,  settingRegistry, host, when });
    let disposable = splash.show();
    manager.ready.then(() => {
      setTimeout(() => {
        disposable.dispose();
      }, 2500);
    }, () => {
      disposable.dispose();
    });
    return manager;
  },
  autoStart: true,
  provides: IThemeManager
};


/**
 * The default splash screen provider.
 */
const splashPlugin: JupyterLabPlugin<ISplashScreen> = {
  id: 'jupyter.services.splash-screen',
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
const stateDBPlugin: JupyterLabPlugin<IStateDB> = {
  id: 'jupyter.services.statedb',
  autoStart: true,
  provides: IStateDB,
  activate: (app: JupyterLab) => {
    const state = new StateDB({ namespace: app.info.namespace });
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
  mainMenuPlugin,
  palettePlugin,
  settingPlugin,
  stateDBPlugin,
  splashPlugin,
  themePlugin
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

