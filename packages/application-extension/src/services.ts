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
  IServiceManager,
  ServiceManager
} from '@jupyterlab/services';

export const services: JupyterFrontEndPlugin<ServiceManager.IManager> = {
  id: '@jupyterlab/application-extension:services',
  description: 'Provides the interfaces to the Jupyter Server REST API.',
  optional: [IDefaultDrive, IConnectionStatus],
  provides: IServiceManager,
  activate: (
    app: JupyterFrontEnd,
    defaultDrive: Contents.IDrive | null,
    status: IConnectionStatus | null
  ): ServiceManager.IManager => {
    return new ServiceManager({
      defaultDrive: defaultDrive ?? undefined,
      standby: () => {
        return !status?.isConnected || 'when-hidden';
      }
    });
  }
};
