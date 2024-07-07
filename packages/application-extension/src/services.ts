// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { type JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IServiceManager, ServiceManager } from '@jupyterlab/services';

export const services: JupyterFrontEndPlugin<ServiceManager.IManager> = {
  id: '@jupyterlab/application-extension:services',
  description: 'Provides the interfaces to the Jupyter Server REST API.',
  provides: IServiceManager,
  activate: (): ServiceManager.IManager => {
    return new ServiceManager();
  }
};
