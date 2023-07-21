// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection, ServiceManager } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyPartialJSONObject, Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import { JupyterFrontEnd } from './frontend';

/**
 * A token for which a plugin can provide to respond to connection failures
 * to the application server.
 */
export const IConnectionLost = new Token<IConnectionLost>(
  '@jupyterlab/application:IConnectionLost',
  `A service for invoking the dialog shown
  when JupyterLab has lost its connection to the server. Use this if, for some reason,
  you want to bring up the "connection lost" dialog under new circumstances.`
);

/**
 * A function that handles a connection to the server being lost.
 *
 * #### Notes
 * The default implementation shows a simple dialog upon connection
 * failures, but it may be overridden by extensions to perform other
 * actions.
 */
export type IConnectionLost = (
  manager: ServiceManager.IManager,
  err: ServerConnection.NetworkError,
  translator?: ITranslator
) => Promise<void>;

/**
 * The application status token.
 */
export const ILabStatus = new Token<ILabStatus>(
  '@jupyterlab/application:ILabStatus',
  `A service for interacting with the application busy/dirty
  status. Use this if you want to set the application "busy" favicon, or to set
  the application "dirty" status, which asks the user for confirmation before leaving the application page.`
);

/**
 * An interface for JupyterLab-like application status functionality.
 */
export interface ILabStatus {
  /**
   * A signal for when application changes its busy status.
   */
  readonly busySignal: ISignal<JupyterFrontEnd<any, any>, boolean>;

  /**
   * A signal for when application changes its dirty status.
   */
  readonly dirtySignal: ISignal<JupyterFrontEnd<any, any>, boolean>;

  /**
   * Whether the application is busy.
   */
  readonly isBusy: boolean;

  /**
   * Whether the application is dirty.
   */
  readonly isDirty: boolean;

  /**
   * Set the application state to busy.
   *
   * @returns A disposable used to clear the busy state for the caller.
   */
  setBusy(): IDisposable;

  /**
   * Set the application state to dirty.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setDirty(): IDisposable;
}

/**
 * The URL Router token.
 */
export const IRouter = new Token<IRouter>(
  '@jupyterlab/application:IRouter',
  'The URL router used by the application. Use this to add custom URL-routing for your extension (e.g., to invoke a command if the user navigates to a sub-path).'
);

/**
 * A static class that routes URLs within the application.
 */
export interface IRouter {
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
export namespace IRouter {
  /**
   * The parsed location currently being routed.
   */
  export interface ILocation extends ReadonlyPartialJSONObject {
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
    search?: string;
  }

  /**
   * The options passed into a navigation request.
   */
  export interface INavOptions {
    /**
     * Whether the navigation should be hard URL change instead of an HTML
     * history API change.
     */
    hard?: boolean;

    /**
     * Should the routing stage be skipped when navigating? This will simply rewrite the URL
     * and push the new state to the history API, no routing commands will be triggered.
     */
    skipRouting?: boolean;
  }

  /**
   * The specification for registering a route with the router.
   */
  export interface IRegisterOptions {
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
