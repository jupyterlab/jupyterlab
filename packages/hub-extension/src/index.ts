/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module hub-extension
 */

import {
  ConnectionLost,
  IConnectionLost,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab
} from '@jupyterlab/application';
import { Dialog, ICommandPalette, showDialog } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection, ServiceManager } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';

/**
 * The command IDs used by the plugin.
 */
export namespace CommandIDs {
  export const controlPanel: string = 'hub:control-panel';

  export const logout: string = 'hub:logout';

  export const restart: string = 'hub:restart';
}

/**
 * Activate the jupyterhub extension.
 */
function activateHubExtension(
  app: JupyterFrontEnd,
  paths: JupyterFrontEnd.IPaths,
  translator: ITranslator,
  palette: ICommandPalette | null
): void {
  const trans = translator.load('jupyterlab');
  const hubHost = paths.urls.hubHost || '';
  const hubPrefix = paths.urls.hubPrefix || '';
  const hubUser = paths.urls.hubUser || '';
  const hubServerName = paths.urls.hubServerName || '';
  const baseUrl = paths.urls.base;

  // Bail if not running on JupyterHub.
  if (!hubPrefix) {
    return;
  }

  console.debug('hub-extension: Found configuration ', {
    hubHost: hubHost,
    hubPrefix: hubPrefix
  });

  // If hubServerName is set, use JupyterHub 1.0 URL.
  const spawnBase = URLExt.join(hubPrefix, 'spawn');
  let restartUrl = hubHost + spawnBase;
  if (hubServerName) {
    const suffix = URLExt.join(spawnBase, hubUser, hubServerName);
    if (!suffix.startsWith(spawnBase)) {
      throw new Error('Can only be used for spawn requests');
    }
    restartUrl = hubHost + suffix;
  }

  const { commands } = app;

  commands.addCommand(CommandIDs.restart, {
    label: trans.__('Restart Server'),
    caption: trans.__('Request that the Hub restart this server'),
    execute: () => {
      window.open(restartUrl, '_blank');
    }
  });

  commands.addCommand(CommandIDs.controlPanel, {
    label: trans.__('Hub Control Panel'),
    caption: trans.__('Open the Hub control panel in a new browser tab'),
    execute: () => {
      window.open(hubHost + URLExt.join(hubPrefix, 'home'), '_blank');
    }
  });

  commands.addCommand(CommandIDs.logout, {
    label: trans.__('Log Out'),
    caption: trans.__('Log out of the Hub'),
    execute: () => {
      window.location.href = hubHost + URLExt.join(baseUrl, 'logout');
    }
  });

  // Add palette items.
  if (palette) {
    const category = trans.__('Hub');
    palette.addItem({ category, command: CommandIDs.controlPanel });
    palette.addItem({ category, command: CommandIDs.logout });
  }
}

/**
 * Initialization data for the hub-extension.
 */
const hubExtension: JupyterFrontEndPlugin<void> = {
  activate: activateHubExtension,
  id: '@jupyterlab/hub-extension:plugin',
  description: 'Registers commands related to the hub server',
  requires: [JupyterFrontEnd.IPaths, ITranslator],
  optional: [ICommandPalette],
  autoStart: true
};

/**
 * Plugin to load menu description based on settings file
 */
const hubExtensionMenu: JupyterFrontEndPlugin<void> = {
  activate: () => void 0,
  id: '@jupyterlab/hub-extension:menu',
  description: 'Adds hub related commands to the menu.',
  autoStart: true
};

/**
 * The default JupyterLab connection lost provider. This may be overridden
 * to provide custom behavior when a connection to the server is lost.
 *
 * If the application is being deployed within a JupyterHub context,
 * this will provide a dialog that prompts the user to restart the server.
 * Otherwise, it shows an error dialog.
 */
const connectionlost: JupyterFrontEndPlugin<IConnectionLost> = {
  id: '@jupyterlab/hub-extension:connectionlost',
  description:
    'Provides a service to be notified when the connection to the hub server is lost.',
  requires: [JupyterFrontEnd.IPaths, ITranslator],
  optional: [JupyterLab.IInfo],
  activate: (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    translator: ITranslator,
    info: JupyterLab.IInfo | null
  ): IConnectionLost => {
    const trans = translator.load('jupyterlab');
    const hubPrefix = paths.urls.hubPrefix || '';
    const baseUrl = paths.urls.base;

    // Return the default error message if not running on JupyterHub.
    if (!hubPrefix) {
      return ConnectionLost;
    }

    // If we are running on JupyterHub, return a dialog
    // that prompts the user to restart their server.
    let showingError = false;
    const onConnectionLost: IConnectionLost = async (
      manager: ServiceManager.IManager,
      err: ServerConnection.NetworkError
    ): Promise<void> => {
      if (showingError) {
        return;
      }

      showingError = true;
      if (info) {
        info.isConnected = false;
      }

      const result = await showDialog({
        title: trans.__('Server unavailable or unreachable'),
        body: trans.__(
          'Your server at %1 is not running.\nWould you like to restart it?',
          baseUrl
        ),
        buttons: [
          Dialog.okButton({ label: trans.__('Restart') }),
          Dialog.cancelButton({ label: trans.__('Dismiss') })
        ]
      });

      if (info) {
        info.isConnected = true;
      }
      showingError = false;

      if (result.button.accept) {
        await app.commands.execute(CommandIDs.restart);
      }
    };
    return onConnectionLost;
  },
  autoStart: true,
  provides: IConnectionLost
};

export default [
  hubExtension,
  hubExtensionMenu,
  connectionlost
] as JupyterFrontEndPlugin<any>[];
