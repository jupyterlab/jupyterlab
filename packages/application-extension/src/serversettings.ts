// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  type JupyterFrontEnd,
  type JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IServerSettings, ServerConnection } from '@jupyterlab/services';

export const serverSettings: JupyterFrontEndPlugin<ServerConnection.ISettings> =
  {
    id: '@jupyterlab/application-extension:server-settings',
    description: 'Provides the server connections settings.',
    provides: IServerSettings,
    activate: (): ServerConnection.ISettings => {
      return ServerConnection.makeSettings();
    }
  };
