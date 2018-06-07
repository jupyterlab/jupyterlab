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
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';


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
   * The parsed current URL of the application.
   */
  readonly current: IRouter.ILocation;

  /**
   * A signal emitted when the router routes a route.
   */
  readonly routed: ISignal<IRouter, IRouter.ILocation>;

  /**
   * If a matching rule's command resolves with the `stop` token during routing,
   * no further matches will execute.
   */
  readonly stop: Token<void>;

  /**
   * Navigate to a new path within the application.
   *
   * @param path - The new path or empty string if redirecting to root.
   *
   * @param options - The navigation options.
   */
  navigate(path: string, options?: IRouter.INavOptions): void;

  /**
   * Register a rule that maps a path pattern to a command.
   *
   * @param options - The route registration options.
   *
   * @returns A disposable that removes the registered rule from the router.
   */
  register(options: IRouter.IRegisterOptions): IDisposable;

  /**
   * Cause a hard reload of the document.
   */
  reload(): void;

  /**
   * Route a specific path to an action.
   *
   * @param url - The URL string that will be routed.
   *
   * #### Notes
   * If a pattern is matched, its command will be invoked with arguments that
   * match the `IRouter.ILocation` interface.
   */
  route(url: string): void;
}


/**
 * A namespace for the `IRouter` specification.
 */
export
namespace IRouter {
  /**
   * The parsed location currently being routed.
   */
  export
  interface ILocation extends ReadonlyJSONObject {
    /**
     * The location hash.
     */
    hash: string;

    /**
     * The path that matched a routing pattern.
     */
    path: string;

    /**
     * The request being routed with the router `base` omitted.
     *
     * #### Notes
     * This field includes the query string and hash, if they exist.
     */
    request: string;

    /**
     * The search element, including leading question mark (`'?'`), if any,
     * of the path.
     */
    search: string;
  }

  /**
   * The options passed into a navigation request.
   */
  export
  interface INavOptions {
    /**
     * Whether the navigation should be hard URL change instead of an HTML
     * history API change.
     */
    hard?: boolean;

    /**
     * Whether the navigation should be added to the browser's history.
     */
    silent?: boolean;
  }

  /**
   * The specification for registering a route with the router.
   */
  export
  interface IRegisterOptions {
    /**
     * The command string that will be invoked upon matching.
     */
    command: string;

    /**
     * The regular expression that will be matched against URLs.
     */
    pattern: RegExp;

    /**
     * The rank order of the registered rule. A lower rank denotes a higher
     * priority. The default rank is `100`.
     */
    rank?: number;
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
   * Returns the parsed current URL of the application.
   */
  get current(): IRouter.ILocation {
    const { base } = this;
    const parsed = URLExt.parse(window.location.href);
    const { search, hash } = parsed;
    const path = parsed.pathname.replace(base, '');
    const request = path + search + hash;

    return { hash, path, request, search };
  }

  /**
   * A signal emitted when the router routes a route.
   */
  get routed(): ISignal<this, IRouter.ILocation> {
    return this._routed;
  }

  /**
   * If a matching rule's command resolves with the `stop` token during routing,
   * no further matches will execute.
   */
  readonly stop = new Token<void>('@jupyterlab/application:Router#stop');

  /**
   * Navigate to a new path within the application.
   *
   * @param path - The new path or empty string if redirecting to root.
   *
   * @param options - The navigation options.
   */
  navigate(path: string, options: IRouter.INavOptions = { }): void {
    const url = path ? URLExt.join(this.base, path) : this.base;
    const { history } = window;
    const { hard, silent } = options;

    if (silent) {
      history.replaceState({ }, '', url);
    } else {
      history.pushState({ }, '', url);
    }

    if (hard) {
      return this.reload();
    }

    // Because a `route()` call may still be in the stack after having received
    // a `stop` token, wait for the next stack frame before calling `route()`.
    requestAnimationFrame(() => { this.route(); });
  }

  /**
   * Register to route a path pattern to a command.
   *
   * @param options - The route registration options.
   *
   * @returns A disposable that removes the registered rule from the router.
   */
  register(options: IRouter.IRegisterOptions): IDisposable {
    const { command, pattern } = options;
    const rank = 'rank' in options ? options.rank : 100;
    const rules = this._rules;

    rules.set(pattern, { command, rank });

    return new DisposableDelegate(() => { rules.delete(pattern); });
  }

  /**
   * Cause a hard reload of the document.
   */
  reload(): void {
    window.location.reload();
  }

  /**
   * Route a specific path to an action.
   *
   * #### Notes
   * If a pattern is matched, its command will be invoked with arguments that
   * match the `IRouter.ILocation` interface.
   */
  route(): void {
    const { commands, current, stop } = this;
    const { request } = current;
    const routed = this._routed;
    const rules = this._rules;
    const matches: Private.Rule[] = [];

    // Collect all rules that match the URL.
    rules.forEach((rule, pattern) => {
      if (request.match(pattern)) {
        matches.push(rule);
      }
    });

    // Order the matching rules by rank and enqueue them.
    const queue = matches.sort((a, b) => b.rank - a.rank);

    // Process each enqueued command sequentially and short-circuit if a promise
    // resolves with the `stop` token.
    (function next() {
      if (!queue.length) {
        routed.emit(current);
        return;
      }

      const { command } = queue.pop();

      commands.execute(command, current).then(result => {
        if (result === stop) {
          queue.length = 0;
          console.log(`Routing ${request} was short-circuited by ${command}`);
        }
        next();
      }).catch(reason => {
        console.warn(`Routing ${request} to ${command} failed`, reason);
        next();
      });
    })();
  }

  private _routed = new Signal<this, IRouter.ILocation>(this);
  private _rules = new Map<RegExp, Private.Rule>();
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


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * The internal representation of a routing rule.
   */
  export
  type Rule = { command: string; rank: number };
}
