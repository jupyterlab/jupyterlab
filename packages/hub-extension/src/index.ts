/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { URLExt } from '@jupyterlab/coreutils';

import { IMainMenu } from '@jupyterlab/mainmenu';

/**
 * The command IDs used by the plugin.
 */
export namespace CommandIDs {
  export const controlPanel: string = 'hub:control-panel';

  export const logout: string = 'hub:logout';
}

/**
 * Activate the jupyterhub extension.
 */
function activateHubExtension(
  app: JupyterFrontEnd,
  router: IRouter,
  paths: JupyterFrontEnd.IPaths,
  palette: ICommandPalette,
  mainMenu: IMainMenu
): void {
  const hubHost = paths.urls.hubHost || '';
  const hubPrefix = paths.urls.hubPrefix || '';
  const baseUrl = paths.urls.base;

  // Bail if not running on JupyterHub.
  if (!hubPrefix) {
    return;
  }

  console.log('hub-extension: Found configuration ', {
    hubHost: hubHost,
    hubPrefix: hubPrefix
  });

  const { commands } = app;

  commands.addCommand(CommandIDs.controlPanel, {
    label: 'Hub Control Panel',
    caption: 'Open the Hub control panel in a new browser tab',
    execute: () => {
      window.open(hubHost + URLExt.join(hubPrefix, 'home'), '_blank');
    }
  });

  commands.addCommand(CommandIDs.logout, {
    label: 'Log Out',
    caption: 'Log out of the Hub',
    execute: () => {
      window.location.href = hubHost + URLExt.join(baseUrl, 'logout');
    }
  });

  // Add commands and menu itmes.
  mainMenu.fileMenu.addGroup(
    [{ command: CommandIDs.controlPanel }, { command: CommandIDs.logout }],
    100
  );
  const category = 'Hub';
  palette.addItem({ category, command: CommandIDs.controlPanel });
  palette.addItem({ category, command: CommandIDs.logout });
}

/**
 * Initialization data for the hub-extension.
 */
const hubExtension: JupyterFrontEndPlugin<void> = {
  activate: activateHubExtension,
  id: 'jupyter.extensions.hub-extension',
  requires: [IRouter, JupyterFrontEnd.IPaths, ICommandPalette, IMainMenu],
  autoStart: true
};

export default hubExtension;
