// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  createServiceManager
} from 'jupyter-js-services';

import {
  JupyterLabPlugin
} from '../application';

import {
  IServiceManager
} from './';


/**
 * The default services provider.
 */
export
const servicesProvider: JupyterLabPlugin<IServiceManager> = {
  id: 'jupyter.services.services',
  provides: IServiceManager,
  activate: (): Promise<IServiceManager> => {
    return createServiceManager() as Promise<IServiceManager>;
  }
};
