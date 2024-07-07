// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IConnectionStatus,
  type JupyterFrontEnd,
  type JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  type Contents,
  IDefaultDrive,
  IServerSettings,
  IServiceManager,
  ServerConnection,
  ServiceManager
} from '@jupyterlab/services';

export const services: JupyterFrontEndPlugin<ServiceManager.IManager> = {
  id: '@jupyterlab/application-extension:services',
  description: 'Provides the interfaces to the Jupyter Server REST API.',
  optional: [IDefaultDrive, IServerSettings, IConnectionStatus],
  provides: IServiceManager,
  activate: (
    app: JupyterFrontEnd,
    defaultDrive: Contents.IDrive | null,
    serverSettings: ServerConnection.ISettings | null,
    status: IConnectionStatus | null
  ): ServiceManager.IManager => {
    return new ServiceManager({
      defaultDrive: defaultDrive ?? undefined,
      serverSettings: serverSettings ?? undefined,
      standby: () => {
        return !status?.isConnected || 'when-hidden';
      }
    });
  }
};
