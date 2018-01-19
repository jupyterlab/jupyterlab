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
  readonly routed: ISignal<IRouter, IRouter.ICommandArgs>;

  /**
   * If a matching rule's command resolves with the `stop` token during routing,
   * no further matches will execute.
   */
  readonly stop: Token<void>;

  /**
   * Register a rule that maps a path pattern to a command.
   *
   * @param options - The route registration options.
   *
   * @returns A disposable that removes the registered rule from the router.
   */
  register(options: IRouter.IRegisterArgs): IDisposable;

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

  /**
   * The specification for registering a route with the router.
   */
  export
  interface IRegisterArgs {
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
  readonly stop = new Token<void>('Router#stop');

  /**
   * A signal emitted when the router routes a route.
   */
  get routed(): ISignal<this, IRouter.ICommandArgs> {
    return this._routed;
  }

  /**
   * Register to route a path pattern to a command.
   *
   * @param options - The route registration options.
   *
   * @returns A disposable that removes the registered rul from the router.
   */
  register(options: IRouter.IRegisterArgs): IDisposable {
    const { command, pattern } = options;
    const rank = 'rank' in options ? options.rank : 100;
    const rules = this._rules;

    rules.set(pattern, { command, rank });

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
    const { commands, stop } = this;
    const parsed = URLExt.parse(url.replace(this.base, ''));
    const args = { path: parsed.pathname, search: parsed.search };
    const matches: Private.Rule[] = [];

    // Collect all rules that match the URL.
    this._rules.forEach((rule, pattern) => {
      if (parsed.pathname.match(pattern)) {
        matches.push(rule);
      }
    });

    // Order the matching rules by rank and enqueue them.
    const queue = matches.sort((a, b) => a.rank - b.rank);

    // Process one enqueued promise at a time.
    const next = () => {
      if (!queue.length) {
        this._routed.emit(args);
        return;
      }

      const { command } = queue.shift();

      commands.execute(command, args).then(result => {
        if (result === stop) {
          queue.length = 0;
          console.log(`Routing ${url} was short-circuited by ${command}`);
        }
      }).catch(reason => {
        console.warn(`Routing ${url} to ${command} failed`, reason);
      }).then(() => { next(); });
    };

    next();
  }

  private _routed = new Signal<this, IRouter.ICommandArgs>(this);
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
