// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager, createServiceManager
} from 'jupyter-js-services';


/**
 * The default services provider.
 */
export
const servicesProvider = {
  id: 'jupyter.services.services',
  provides: ServiceManager,
  resolve: () => {
    return createServiceManager() as Promise<ServiceManager>;
  }
};
