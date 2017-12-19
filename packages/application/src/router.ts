/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  Token
} from '@phosphor/coreutils';


/* tslint:disable */
/**
 * The URL Router token.
 */
export
const IRouter = new Token<IRouter>('@jupyterlab/application:IRouter');
/* tslint:enable */


/**
 * A static class that routes URLs within the application.
 */
export
interface IRouter {
}


/**
 * A static class that routes URLs within the application.
 */
export
class Router implements IRouter {
  constructor() {
    console.log('A router instance has been created.', PageConfig.getBaseUrl());
  }
}
