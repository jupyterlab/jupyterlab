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
   * A signal emitted when the router routes a route.
   */
  readonly routed: ISignal<IRouter, IRouter.ILocation>;

  /**
   * If a matching rule's command resolves with the `stop` token during routing,
   * no further matches will execute.
   */
  readonly stop: Token<void>;

  /**
   * Returns the parsed current URL of the application.
   */
  current(): IRouter.ILocation;

  /**
   * Navigate to a new path within the application.
   *
   * @param path - The new path or empty string if redirecting to root.
   *
   * @param options - The navigation options.
   */
  navigate(path: string, options?: IRouter.INavigateOptions): void;

  /**
   * Register a rule that maps a path pattern to a command.
   *
   * @param options - The route registration options.
   *
   * @returns A disposable that removes the registered rule from the router.
   */
  register(options: IRouter.IRegisterOptions): IDisposable;

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
     * The path that matched a routing pattern.
     */
    path: string;

    /**
     * The request being routed with the router `base` omitted.
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
  interface INavigateOptions {
    /**
     * Whether the navigation should generate an HTML history `popstate` event.
     */
    silent?: boolean;

    /**
     * An optional promise that must resolve before navigation happens.
     */
    when?: Promise<any>;
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
   * If a matching rule's command resolves with the `stop` token during routing,
   * no further matches will execute.
   */
  readonly stop = new Token<void>('@jupyterlab/application:Router#stop');

  /**
   * A signal emitted when the router routes a route.
   */
  get routed(): ISignal<this, IRouter.ILocation> {
    return this._routed;
  }

  /**
   * Returns the parsed current URL of the application.
   */
  current(): IRouter.ILocation {
    const { base } = this;
    const parsed = URLExt.parse(window.location.href);
    const { search } = parsed;
    const path = parsed.pathname.replace(base, '');
    const request = path + search;

    return { path, request,  search };
  }

  /**
   * Navigate to a new path within the application.
   *
   * @param path - The new path or empty string if redirecting to root.
   *
   * @param options - The navigation options.
   */
  navigate(path: string, options: IRouter.INavigateOptions = { }): void {
    const url = path ? URLExt.join(this.base, path) : this.base;
    const { history } = window;
    const { silent, when} = options;

    (when || Promise.resolve(undefined)).then(() => {
      if (silent) {
        history.replaceState({ }, '', url);
      } else {
        history.pushState({ }, '', url);
      }
    });
  }

  /**
   * Register to route a path pattern to a command.
   *
   * @param options - The route registration options.
   *
   * @returns A disposable that removes the registered rul from the router.
   */
  register(options: IRouter.IRegisterOptions): IDisposable {
    const { command, pattern } = options;
    const rank = 'rank' in options ? options.rank : 100;
    const rules = this._rules;

    rules.set(pattern, { command, rank });

    return new DisposableDelegate(() => { rules.delete(pattern); });
  }

  /**
   * Route a specific path to an action.
   *
   * #### Notes
   * If a pattern is matched, its command will be invoked with arguments that
   * match the `IRouter.ILocation` interface.
   */
  route(): void {
    const { commands, stop } = this;
    const current = this.current();
    const { request } = current;
    const matches: Private.Rule[] = [];

    // Collect all rules that match the URL.
    this._rules.forEach((rule, pattern) => {
      if (request.match(pattern)) {
        matches.push(rule);
      }
    });

    // Order the matching rules by rank and enqueue them.
    const queue = matches.sort((a, b) => a.rank - b.rank);

    // Process one enqueued promise at a time.
    const next = () => {
      if (!queue.length) {
        this._routed.emit(current);
        return;
      }

      const { command } = queue.shift();

      commands.execute(command, current).then(result => {
        if (result === stop) {
          queue.length = 0;
          console.log(`Routing ${request} was short-circuited by ${command}`);
        }
      }).catch(reason => {
        console.warn(`Routing ${request} to ${command} failed`, reason);
      }).then(() => { next(); });
    };

    next();
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
