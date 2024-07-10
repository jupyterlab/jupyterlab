// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { Contents } from './contents';
import { type ServiceManager } from './manager';
import { ServerConnection } from '.';

/**
 * The default drive token for the contents manager.
 */
export const IDefaultDrive = new Token<Contents.IDrive>(
  '@jupyterlab/services:IDefaultDrive',
  'A service providing the default drive for contents.'
);

/**
 * The server connection settings token.
 */
export const IServerSettings = new Token<ServerConnection.ISettings>(
  '@jupyterlab/services:IServerSettings',
  'A service providing the connection settings with the server.'
);

/**
 * The service manager token used if a plugin replaces the default manager.
 */
export const IServiceManager = new Token<ServiceManager.IManager>(
  '@jupyterlab/services:IServiceManager',
  'A service to interact with the Jupyter Server REST API.'
);
