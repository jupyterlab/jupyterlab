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
  ReadonlyJSONObject, Token
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
interface IRouter {
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
   *
   * @param pattern - The regular expression that will be matched against URLs.
   *
   * @param command - The command string that will be invoked upon matching.
   *
   * @returns A disposable that removes the registered rul from the router.
   */
  register(pattern: RegExp, command: string): IDisposable;

  /**
   * Route a specific path to an action.
   *
   * @param url - The URL string that will be routed.
   *
   * #### Notes
   * If a pattern is matched, its command will be invoked with arguments that
   * match the `IRouter.ICommandArgs` interface.
   */
  route(url: string): void;
}


/**
 * A namespace for the `IRouter` specification.
 */
export
namespace IRouter {
  /**
   * The arguments passed into a command execution when a path is routed.
   */
  export
  interface ICommandArgs extends ReadonlyJSONObject {
    /**
     * The path that matched a routing pattern.
     */
    path: string;

    /**
     * The search element, including leading question mark (`'?'`), if any,
     * of the path.
     */
    search: string;
  }
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
   *
   * @param pattern - The regular expression that will be matched against URLs.
   *
   * @param command - The command string that will be invoked upon matching.
   *
   * @returns A disposable that removes the registered rul from the router.
   */
  register(pattern: RegExp, command: string): IDisposable {
    const rules = this._rules;

    rules.set(pattern, command);

    return new DisposableDelegate(() => { rules.delete(pattern); });
  }

  /**
   * Route a specific path to an action.
   *
   * @param url - The URL string that will be routed.
   *
   * #### Notes
   * If a pattern is matched, its command will be invoked with arguments that
   * match the `IRouter.ICommandArgs` interface.
   */
  route(url: string): void {
    const { base } = this;
    const parsed = URLExt.parse(url.replace(base, ''));
    const path = parsed.pathname;
    const search = parsed.search;
    const rules = this._rules;

    rules.forEach((command, pattern) => {
      if (path.match(pattern)) {
        this.commands.execute(command, { path, search });
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
     * The fully qualified base URL for the router.
     */
    base: string;

    /**
     * The command registry used by the router.
     */
    commands: CommandRegistry;
  }
}
