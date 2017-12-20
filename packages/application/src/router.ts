/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  URLExt
} from '@jupyterlab/coreutils';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Token
} from '@phosphor/coreutils';

import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';


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
interface IRouter extends Router {}


/**
 * A static class that routes URLs within the application.
 */
export
class Router {
  /**
   * Create a URL router.
   */
  constructor(options: Router.IOptions) {
    this.base = options.base;
    this.commands = options.commands;
  }

  /**
   * The base URL for the router.
   */
  readonly base: string;

  /**
   * The command registry used by the router.
   */
  readonly commands: CommandRegistry;

  /**
   * Register to route a path pattern to a command.
   */
  register(pattern: RegExp, command: string): IDisposable {
    const rules = this._rules;

    rules.set(pattern, command);

    return new DisposableDelegate(() => { rules.delete(pattern); });
  }

  /**
   * Route a specific path to an action.
   */
  route(url: string): void {
    const { base } = this;
    const parsed = URLExt.parse(url);
    const path = parsed.pathname.indexOf(base) === 0 ?
      parsed.pathname.replace(base, '') : parsed.pathname;
    const rules = this._rules;

    rules.forEach((command, pattern) => {
      if (path.match(pattern)) {
        this.commands.execute(command);
      }
    });
  }

  private _rules = new Map<RegExp, string>();
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

    /**
     * The command registry used by the router.
     */
    commands: CommandRegistry;
  }
}
