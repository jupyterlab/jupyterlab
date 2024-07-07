// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { type ServiceManager } from './manager';

/**
 * The service manager token used if a plugin replaces the default manager.
 */
export const IServiceManager = new Token<ServiceManager.IManager>(
  '@jupyterlab/services:manager',
  'A service to interact with the Jupyter Server REST API.'
);
