// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { Contents } from './contents';
import { type ServiceManager } from './manager';

/**
 * The service manager token used if a plugin replaces the default manager.
 */
export const IServiceManager = new Token<ServiceManager.IManager>(
  '@jupyterlab/services:IServiceManager',
  'A service to interact with the Jupyter Server REST API.'
);

/**
 * The default drive token for the contents manager.
 */
export const IDefaultDrive = new Token<Contents.IDrive>(
  '@jupyterlab/services:IDefaultDrive',
  'A service providing the default drive for contents.'
);
