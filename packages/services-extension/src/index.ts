// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager, ServiceManager
} from '@jupyterlab/services';

import {
  JupyterLabPlugin
} from '@jupyterlab/application';


/**
 * The default services provider.
 */
const plugin: JupyterLabPlugin<IServiceManager> = {
  id: 'jupyter.services.services',
  provides: IServiceManager,
  activate: (): IServiceManager => new ServiceManager()
};


/**
 * Export the plugin as default.
 */
export default plugin;
