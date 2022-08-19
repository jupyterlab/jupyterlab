/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { URLExt } from '@jupyterlab/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { PromiseDelegate, Token } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { IRouter } from './tokens';

/**
 * A static class that routes URLs within the application.
 */
export class Router implements IRouter {
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
    const path = parsed.pathname?.replace(base, '/') ?? '';
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
  navigate(path: string, options: IRouter.INavOptions = {}): void {
    const { base } = this;
    const { history } = window;
    const { hard } = options;
    const old = document.location.href;
    const url =
      path && path.indexOf(base) === 0 ? path : URLExt.join(base, path);

    if (url === old) {
      return hard ? this.reload() : undefined;
    }

    history.pushState({}, '', url);

    if (hard) {
      return this.reload();
    }

    if (!options.skipRouting) {
      // Because a `route()` call may still be in the stack after having received
      // a `stop` token, wait for the next stack frame before calling `route()`.
      requestAnimationFrame(() => {
        void this.route();
      });
    }
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
    const rank = options.rank ?? 100;
    const rules = this._rules;

    rules.set(pattern, { command, rank });

    return new DisposableDelegate(() => {
      rules.delete(pattern);
    });
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
  route(): Promise<void> {
    const { commands, current, stop } = this;
    const { request } = current;
    const routed = this._routed;
    const rules = this._rules;
    const matches: Private.Rule[] = [];

    // Collect all rules that match the URL.
    rules.forEach((rule, pattern) => {
      if (request?.match(pattern)) {
        matches.push(rule);
      }
    });

    // Order the matching rules by rank and enqueue them.
    const queue = matches.sort((a, b) => b.rank - a.rank);
    const done = new PromiseDelegate<void>();

    // Process each enqueued command sequentially and short-circuit if a promise
    // resolves with the `stop` token.
    const next = async () => {
      if (!queue.length) {
        routed.emit(current);
        done.resolve(undefined);
        return;
      }

      const { command } = queue.pop()!;

      try {
        const request = this.current.request;
        const result = await commands.execute(command, current);
        if (result === stop) {
          queue.length = 0;
          console.debug(`Routing ${request} was short-circuited by ${command}`);
        }
      } catch (reason) {
        console.warn(`Routing ${request} to ${command} failed`, reason);
      }
      void next();
    };
    void next();

    return done.promise;
  }

  private _routed = new Signal<this, IRouter.ILocation>(this);
  private _rules = new Map<RegExp, Private.Rule>();
}

/**
 * A namespace for `Router` class statics.
 */
export namespace Router {
  /**
   * The options for instantiating a JupyterLab URL router.
   */
  export interface IOptions {
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
  export type Rule = { command: string; rank: number };
}
