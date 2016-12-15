// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  JupyterLabPlugin
} from '../application';

import {
  IServiceManager
} from './';


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
