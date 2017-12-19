/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

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
  /**
   * Create a URL router.
   */
  constructor(options: Router.IOptions) {
    console.log('A router instance has been created.', options.base);
  }
}


/**
 * A namespace for `Router` class statics.
 */
export
namespace Router {
  /**
   * The options for instantiating a JupyterLab URL router.
   */
  export
  interface IOptions {
    /**
     * The base URL for the router.
     */
    base: string;
  }
}
