// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IServerSettings, ServerConnection } from '@jupyterlab/services';
import type { IPlugin } from '@lumino/coreutils';

export const serverSettings: IPlugin<null, ServerConnection.ISettings> = {
  id: '@jupyterlab/application-extension:server-settings',
  description: 'Provides the server connections settings.',
  provides: IServerSettings,
  activate: (): ServerConnection.ISettings => {
    return ServerConnection.makeSettings();
  }
};
