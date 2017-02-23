// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Token
} from '@phosphor/application';


/* tslint:disable */
/**
 * The default services provider token.
 */
export
const IServiceManager = new Token<IServiceManager>('jupyter.services.services');
/* tslint:enable */


/**
 * The service manager interface.
 */
export
interface IServiceManager extends ServiceManager.IManager { };
