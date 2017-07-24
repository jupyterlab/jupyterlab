/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu, MainMenu
} from '@jupyterlab/apputils';

import {
  IDataConnector, ISettingRegistry, IStateDB, SettingRegistry, StateDB
} from '@jupyterlab/coreutils';

import {
  IServiceManager, ServerConnection
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  activatePalette
} from './palette';


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
function newConnector(manager: IServiceManager): IDataConnector<ISettingRegistry.IPlugin, JSONObject> {
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
  activate: (app: JupyterLab, services: IServiceManager): ISettingRegistry => {
    return new SettingRegistry({ connector: newConnector(services) });
  },
  autoStart: true,
  provides: ISettingRegistry,
  requires: [IServiceManager]
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
  stateDBPlugin
];
export default plugins;

