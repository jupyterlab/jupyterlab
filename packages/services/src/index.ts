// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/coreutils';

import {
  ServiceManager
} from './manager';

export * from './config';
export * from './contents';
export * from './kernel';
export * from './manager';
export * from './nbformat';
export * from './session';
export * from './terminal';

export {
  IAjaxSettings
} from './utils';

import * as utils
  from './utils';

export { utils };


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
