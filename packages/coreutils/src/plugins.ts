/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { topologicSort } from '@lumino/algorithm';
import { IPlugin, type PluginRegistry, type Token } from '@lumino/coreutils';

export interface IToken {
  /**
   * Token purpose description.
   */
  readonly description?: string;
  /**
   * The human readable name for the token.
   *
   * #### Notes
   * This can be useful for debugging and logging.
   */
  readonly name: string;
}

/**
 * The interface for a module that exports a plugin or plugins as
 * the default value.
 */
export interface IPluginModule {
  /**
   * The default export.
   */
  default: IPlugin<any, any> | IPlugin<any, any>[];
}

export interface IEntrypoint {
  /**
   *  The name of the widget factory.
   */
  extension: string;

  /**
   * function tha will active the widget factory
   */
  activate: () => Promise<void>;

  /**
   * data from the package json
   */
  data: any;
}

export interface IPlugin2<T = any, U = any>
  extends Omit<
    IPlugin<T, U>,
    'activate' | 'requires' | 'optional' | 'provides'
  > {
  /**
   * The types of required services for the plugin, if any.
   *
   * #### Notes
   * These tokens correspond to the services that are required by
   * the plugin for correct operation.
   *
   * When the plugin is activated, a concrete instance of each type
   * will be passed to the `activate()` function, in the order they
   * are specified in the `requires` array.
   */
  requires?: Token<any>[] | string[];
  /**
   * The types of optional services for the plugin, if any.
   *
   * #### Notes
   * These tokens correspond to the services that can be used by the
   * plugin if available, but are not necessarily required.
   *
   * The optional services will be passed to the `activate()` function
   * following all required services. If an optional service cannot be
   * resolved, `null` will be passed in its place.
   */
  optional?: Token<any>[] | string[];
  /**
   * The type of service provided by the plugin, if any.
   *
   * #### Notes
   * This token corresponds to the service exported by the plugin.
   *
   * When the plugin is activated, the return value of `activate()`
   * is used as the concrete instance of the type.
   */
  provides?: IToken | null;
  /**
   * A function invoked to activate the plugin.
   *
   * @param app - The application provided by {@link PluginRegistry.application} .
   *
   * @param args - The services specified by the `requires` property.
   *
   * @returns The provided service, or a promise to the service.
   *
   * #### Notes
   * This function will be called whenever the plugin is manually
   * activated, or when another plugin being activated requires
   * the service it provides.
   *
   * This function will not be called unless all of its required
   * services can be fulfilled.
   */
  activate?: (app: T, ...args: any[]) => U | Promise<U>;

  /**
   * Callback to load the plugin module.
   *
   * @returns The module containing the plugin
   */
  loader?: () => Promise<IPluginModule>;
}

/**
 * Plugin registry.
 */
export class PluginRegistry2<T = any> {
  constructor(options: PluginRegistry2.IOptions = {}) {
    if (options.validatePlugin) {
      console.info(
        'Plugins may be rejected by the custom validation plugin method.'
      );
      this._validatePlugin = options.validatePlugin;
    }
  }

  /**
   * The application object.
   *
   * It will be provided as first argument to the
   * plugins activation and deactivation functions.
   *
   * It can only be set once.
   *
   * By default, it is `null`.
   */
  get application(): T {
    return this._application;
  }
  set application(v: T) {
    if (this._application !== null) {
      throw Error(
        'PluginRegistry.application is already set. It cannot be overridden.'
      );
    }

    this._application = v;
  }

  /**
   * The list of all the deferred plugins.
   */
  get deferredPlugins(): string[] {
    return Array.from(this._plugins)
      .filter(([id, plugin]) => plugin.autoStart === 'defer')
      .map(([id, plugin]) => id);
  }

  /**
   * Get a plugin description.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @returns The plugin description.
   */
  getPluginDescription(id: string): string {
    return this._plugins.get(id)?.description ?? '';
  }

  /**
   * Test whether a plugin is registered with the application.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @returns `true` if the plugin is registered, `false` otherwise.
   */
  hasPlugin(id: string): boolean {
    return this._plugins.has(id);
  }

  /**
   * Test whether a plugin is activated with the application.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @returns `true` if the plugin is activated, `false` otherwise.
   */
  isPluginActivated(id: string): boolean {
    return this._plugins.get(id)?.activated ?? false;
  }

  /**
   * List the IDs of the plugins registered with the application.
   *
   * @returns A new array of the registered plugin IDs.
   */
  listPlugins(): string[] {
    return Array.from(this._plugins.keys());
  }

  /**
   * Register a plugin with the application.
   *
   * @param plugin - The plugin to register.
   *
   * #### Notes
   * An error will be thrown if a plugin with the same ID is already
   * registered, or if the plugin has a circular dependency.
   *
   * If the plugin provides a service which has already been provided
   * by another plugin, the new service will override the old service.
   */
  registerPlugin(plugin: IPlugin2<T, any>): void {
    // Throw an error if the plugin ID is already registered.
    if (this._plugins.has(plugin.id)) {
      throw new TypeError(`Plugin '${plugin.id}' is already registered.`);
    }

    if (!this._validatePlugin(plugin)) {
      throw new Error(`Plugin '${plugin.id}' is not valid.`);
    }

    // Create the normalized plugin data.
    const data = Private.createPluginData(plugin);

    // Ensure the plugin does not cause a cyclic dependency.
    Private.ensureNoCycle(data, this._plugins, this._services);

    // Add the service token to the service map.
    if (data.provides) {
      this._services.set(data.provides.name, data.id);
    }

    // Add the plugin to the plugin map.
    this._plugins.set(data.id, data);
  }

  /**
   * Register multiple plugins with the application.
   *
   * @param plugins - The plugins to register.
   *
   * #### Notes
   * This calls `registerPlugin()` for each of the given plugins.
   */
  registerPlugins(plugins: IPlugin2<T, any>[]): void {
    for (const plugin of plugins) {
      this.registerPlugin(plugin);
    }
  }

  /**
   * Deregister a plugin with the application.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @param force - Whether to deregister the plugin even if it is active.
   */
  deregisterPlugin(id: string, force?: boolean): void {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      return;
    }

    if (plugin.activated && !force) {
      throw new Error(`Plugin '${id}' is still active.`);
    }

    this._plugins.delete(id);
  }

  /**
   * Activate the plugin with the given ID.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @returns A promise which resolves when the plugin is activated
   *   or rejects with an error if it cannot be activated.
   */
  async activatePlugin(id: string): Promise<void> {
    // Reject the promise if the plugin is not registered.
    const plugin = this._plugins.get(id);
    if (!plugin) {
      throw new ReferenceError(`Plugin '${id}' is not registered.`);
    }

    // Resolve immediately if the plugin is already activated.
    if (plugin.activated) {
      return;
    }

    // Return the pending resolver promise if it exists.
    if (plugin.promise) {
      return plugin.promise;
    }

    // Resolve the required services for the plugin.
    const required = plugin.requires.map(t => this.resolveRequiredService(t));

    // Resolve the optional services for the plugin.
    const optional = plugin.optional.map(t => this.resolveOptionalService(t));

    // Setup the resolver promise for the plugin.
    plugin.promise = Promise.all([...required, ...optional])
      .then(services => plugin!.activate(this.application, ...services))
      .then(service => {
        plugin!.service = service;
        plugin!.activated = true;
        plugin!.promise = null;
      })
      .catch(error => {
        plugin!.promise = null;
        throw error;
      });

    // Return the pending resolver promise.
    return plugin.promise;
  }

  /**
   * Activate all the deferred plugins.
   *
   * @returns A promise which will resolve when each plugin is activated
   * or rejects with an error if one cannot be activated.
   */
  async activatePlugins(
    kind: 'startUp' | 'defer',
    options: PluginRegistry.IStartOptions = {}
  ): Promise<void> {
    switch (kind) {
      case 'defer': {
        const promises = this.deferredPlugins
          .filter(pluginId => this._plugins.get(pluginId)!.autoStart)
          .map(pluginId => {
            return this.activatePlugin(pluginId);
          });
        await Promise.all(promises);
        break;
      }
      case 'startUp': {
        // Collect the ids of the startup plugins.
        const startups = Private.collectStartupPlugins(this._plugins, options);

        // Generate the activation promises.
        const promises = startups.map(async id => {
          try {
            return await this.activatePlugin(id);
          } catch (error) {
            console.error(`Plugin '${id}' failed to activate.`, error);
          }
        });
        await Promise.all(promises);
        break;
      }
    }
  }

  /**
   * Deactivate the plugin and its downstream dependents if and only if the
   * plugin and its dependents all support `deactivate`.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @returns A list of IDs of downstream plugins deactivated with this one.
   */
  async deactivatePlugin(id: string): Promise<string[]> {
    // Reject the promise if the plugin is not registered.
    const plugin = this._plugins.get(id);
    if (!plugin) {
      throw new ReferenceError(`Plugin '${id}' is not registered.`);
    }

    // Bail early if the plugin is not activated.
    if (!plugin.activated) {
      return [];
    }

    // Check that this plugin can deactivate.
    if (!plugin.deactivate) {
      throw new TypeError(`Plugin '${id}'#deactivate() method missing`);
    }

    // Find the optimal deactivation order for plugins downstream of this one.
    const manifest = Private.findDependents(id, this._plugins, this._services);
    const downstream = manifest.map(id => this._plugins.get(id)!);

    // Check that all downstream plugins can deactivate.
    for (const plugin of downstream) {
      if (!plugin.canBeDeactivated) {
        throw new TypeError(
          `Plugin ${plugin.id}#deactivate() method missing (depends on ${id})`
        );
      }
    }

    // Deactivate all downstream plugins.
    for (const plugin of downstream) {
      const services = [...plugin.requires, ...plugin.optional].map(service => {
        const id = this._services.get(service);
        return id ? this._plugins.get(id)!.service : null;
      });

      // Await deactivation so the next plugins only receive active services.
      await plugin.deactivate!(this.application, ...services);
      plugin.service = null;
      plugin.activated = false;
    }

    // Remove plugin ID and return manifest of deactivated plugins.
    manifest.pop();
    return manifest;
  }

  /**
   * Resolve a required service of a given type.
   *
   * @param token - The token for the service type of interest.
   *
   * @returns A promise which resolves to an instance of the requested
   *   service, or rejects with an error if it cannot be resolved.
   *
   * #### Notes
   * Services are singletons. The same instance will be returned each
   * time a given service token is resolved.
   *
   * If the plugin which provides the service has not been activated,
   * resolving the service will automatically activate the plugin.
   *
   * User code will not typically call this method directly. Instead,
   * the required services for the user's plugins will be resolved
   * automatically when the plugin is activated.
   */
  async resolveRequiredService<U>(token: Token<U> | string): Promise<U> {
    // Reject the promise if there is no provider for the type.
    const serviceName = (token as Token<U>).name ?? token;
    const id = this._services.get(serviceName);
    if (!id) {
      throw new TypeError(`No provider for: ${serviceName}.`);
    }

    // Activate the plugin if necessary.
    const plugin = this._plugins.get(id)!;
    if (!plugin.activated) {
      await this.activatePlugin(id);
    }

    return plugin.service;
  }

  /**
   * Resolve an optional service of a given type.
   *
   * @param token - The token for the service type of interest.
   *
   * @returns A promise which resolves to an instance of the requested
   *   service, or `null` if it cannot be resolved.
   *
   * #### Notes
   * Services are singletons. The same instance will be returned each
   * time a given service token is resolved.
   *
   * If the plugin which provides the service has not been activated,
   * resolving the service will automatically activate the plugin.
   *
   * User code will not typically call this method directly. Instead,
   * the optional services for the user's plugins will be resolved
   * automatically when the plugin is activated.
   */
  async resolveOptionalService<U>(token: Token<U> | string): Promise<U | null> {
    // Resolve with `null` if there is no provider for the type.
    const id = this._services.get((token as Token<U>).name ?? token);
    if (!id) {
      return null;
    }

    // Activate the plugin if necessary.
    const plugin = this._plugins.get(id)!;
    if (!plugin.activated) {
      try {
        await this.activatePlugin(id);
      } catch (reason) {
        console.error(reason);
        return null;
      }
    }

    return plugin.service;
  }

  private _application: any = null;
  private _validatePlugin: (plugin: IPlugin2) => boolean = () => true;
  private _plugins = new Map<string, Private.IPluginData<T>>();
  private _services = new Map<string, string>();
}

/**
 * PluginRegistry namespace
 */
export namespace PluginRegistry2 {
  /**
   * PluginRegistry constructor options.
   */
  export interface IOptions {
    /**
     * Validate that a plugin is allowed to be registered.
     *
     * Default is `() => true`.
     *
     * @param plugin The plugin to validate
     * @returns Whether the plugin can be registered or not.
     *
     * #### Notes
     * We recommend you print a console message with the reason
     * a plugin is invalid.
     */
    validatePlugin?: (plugin: IPlugin2<any, any>) => boolean;
  }
}

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * An object which holds the full application state for a plugin.
   */
  export interface IPluginData<T = any> {
    /**
     * The human readable ID of the plugin.
     */
    readonly id: string;

    /**
     * The description of the plugin.
     */
    readonly description: string;

    /**
     * Whether the plugin should be activated on application start or waiting for being
     * required. If the value is 'defer' then the plugin should be activated only after
     * the application is started.
     */
    readonly autoStart: boolean | 'defer';

    /**
     * The types of required services for the plugin, or `[]`.
     */
    readonly requires: string[];

    /**
     * The types of optional services for the the plugin, or `[]`.
     */
    readonly optional: string[];

    /**
     * The type of service provided by the plugin, or `null`.
     */
    readonly provides: IToken | null;

    /**
     * The function which activates the plugin.
     */
    readonly activate: (app: T, ...args: any[]) => Promise<any>;

    readonly canBeDeactivated: boolean;

    /**
     * The optional function which deactivates the plugin.
     */
    readonly deactivate: (app: T, ...args: any[]) => Promise<void>;

    /**
     * Whether the plugin has been activated.
     */
    activated: boolean;

    /**
     * The resolved service for the plugin, or `null`.
     */
    service: any | null;

    /**
     * The pending resolver promise, or `null`.
     */
    promise: Promise<void> | null;
  }

  class PluginData<T = any, U = any> implements IPluginData<T> {
    private _loader: () => Promise<
      Pick<IPlugin<any, any>, 'activate' | 'deactivate'>
    >;
    private _activated = false;
    private _promise: Promise<void> | null = null;
    private _service: U | null = null;
    private _canBeDeactivated: boolean = true;

    constructor(plugin: IPlugin2<T, U>) {
      if (!plugin.activate && !plugin.loader) {
        throw Error(
          'A plugin must provide an activate method or a loader for the plugin'
        );
      }

      this.id = plugin.id;
      this.description = plugin.description ?? '';
      this.provides = plugin.provides ?? null;
      this.autoStart = plugin.autoStart ?? false;
      this.requires = plugin.requires
        ? plugin.requires.map(p => (p as Token<any>).name ?? p)
        : [];
      this.optional = plugin.optional
        ? plugin.optional.map(p => (p as Token<any>).name ?? p)
        : [];

      this._canBeDeactivated = plugin.deactivate === null ? false : true;

      if (plugin.loader) {
        this._loader = async () => {
          const module = await plugin.loader!();

          let plugins = module.default;
          // Handle commonjs exports.
          if (!module.hasOwnProperty('__esModule')) {
            plugins = module as any;
          }
          if (!Array.isArray(plugins)) {
            plugins = [plugins];
          }

          const plugin_ = plugins.find(p => p.id === plugin.id);
          if (!plugin_) {
            throw Error(
              `Unable to load plugin ${plugin.id} with the provided loader.`
            );
          }

          return {
            activate: plugin_.activate.bind(plugin_),
            deactivate: plugin_.deactivate?.bind(plugin_) ?? null
          };
        };
      } else {
        this._loader = () =>
          Promise.resolve({
            activate: plugin.activate!.bind(plugin),
            deactivate: plugin.deactivate?.bind(plugin) ?? null
          });
      }
    }

    /**
     * The human readable ID of the plugin.
     */
    readonly id: string;

    /**
     * The description of the plugin.
     */
    readonly description: string;

    /**
     * Whether the plugin should be activated on application start or waiting for being
     * required. If the value is 'defer' then the plugin should be activated only after
     * the application is started.
     */
    readonly autoStart: boolean | 'defer';

    /**
     * The types of required services for the plugin, or `[]`.
     */
    readonly requires: string[];

    /**
     * The types of optional services for the the plugin, or `[]`.
     */
    readonly optional: string[];

    /**
     * The type of service provided by the plugin, or `null`.
     */
    readonly provides: IToken | null;

    /**
     * The function which activates the plugin.
     */
    async activate(app: T, ...args: any[]): Promise<any> {
      const obj = await this._loader();
      return obj.activate(app, ...args);
    }

    /**
     * The optional function which deactivates the plugin.
     */
    async deactivate(app: T, ...args: any[]): Promise<void> {
      const obj = await this._loader();

      if (!obj.deactivate) {
        console.warn(`Plugin ${this.id}#deactivate() method missing`);
      } else {
        await obj.deactivate(app, ...args);
      }
    }

    /**
     * Whether the plugin has been activated.
     */
    get activated(): boolean {
      return this._activated;
    }
    set activated(a: boolean) {
      this._activated = a;
    }

    get canBeDeactivated(): boolean {
      return this._canBeDeactivated;
    }

    /**
     * The resolved service for the plugin, or `null`.
     */
    get service(): U | null {
      return this._service;
    }
    set service(s: U | null) {
      this._service = s;
    }

    /**
     * The pending resolver promise, or `null`.
     */
    get promise(): Promise<void> | null {
      return this._promise;
    }
    set promise(p: Promise<void> | null) {
      this._promise = p;
    }
  }

  /**
   * Create a normalized plugin data object for the given plugin.
   */
  export function createPluginData<T>(plugin: IPlugin2): IPluginData<T> {
    return new PluginData(plugin);
  }

  /**
   * Ensure no cycle is present in the plugin resolution graph.
   *
   * If a cycle is detected, an error will be thrown.
   */
  export function ensureNoCycle(
    plugin: IPluginData,
    plugins: Map<string, IPluginData>,
    services: Map<string, string>
  ): void {
    const dependencies = [...plugin.requires, ...plugin.optional];
    const visit = (token: string): boolean => {
      if (token === plugin.provides?.name) {
        return true;
      }
      const id = services.get(token);
      if (!id) {
        return false;
      }
      const visited = plugins.get(id)!;
      const dependencies = [...visited.requires, ...visited.optional];
      if (dependencies.length === 0) {
        return false;
      }
      trace.push(id);
      if (dependencies.some(visit)) {
        return true;
      }
      trace.pop();
      return false;
    };

    // Bail early if there cannot be a cycle.
    if (!plugin.provides || dependencies.length === 0) {
      return;
    }

    // Setup a stack to trace service resolution.
    const trace = [plugin.id];

    // Throw an exception if a cycle is present.
    if (dependencies.some(visit)) {
      throw new ReferenceError(`Cycle detected: ${trace.join(' -> ')}.`);
    }
  }

  /**
   * Find dependents in deactivation order.
   *
   * @param id - The ID of the plugin of interest.
   *
   * @param plugins - The map containing all plugins.
   *
   * @param services - The map containing all services.
   *
   * @returns A list of dependent plugin IDs in order of deactivation
   *
   * #### Notes
   * The final item of the returned list is always the plugin of interest.
   */
  export function findDependents(
    id: string,
    plugins: Map<string, IPluginData>,
    services: Map<string, string>
  ): string[] {
    const edges = new Array<[string, string]>();
    const add = (id: string): void => {
      const plugin = plugins.get(id)!;
      // FIXME In the case of missing optional dependencies, we may consider
      // deactivating and reactivating the plugin without the missing service.
      const dependencies = [...plugin.requires, ...plugin.optional];
      edges.push(
        ...dependencies.reduce<[string, string][]>((acc, dep) => {
          const service = services.get(dep);
          if (service) {
            // An edge is oriented from dependent to provider.
            acc.push([id, service]);
          }
          return acc;
        }, [])
      );
    };

    for (const id of plugins.keys()) {
      add(id);
    }

    // Filter edges
    // - Get all packages that dependent on the package to be deactivated
    const newEdges = edges.filter(edge => edge[1] === id);
    let oldSize = 0;
    while (newEdges.length > oldSize) {
      const previousSize = newEdges.length;
      // Get all packages that dependent on packages that will be deactivated
      const packagesOfInterest = new Set(newEdges.map(edge => edge[0]));
      for (const poi of packagesOfInterest) {
        edges
          .filter(edge => edge[1] === poi)
          .forEach(edge => {
            // We check it is not already included to deal with circular dependencies
            if (!newEdges.includes(edge)) {
              newEdges.push(edge);
            }
          });
      }
      oldSize = previousSize;
    }

    const sorted = topologicSort(newEdges);
    const index = sorted.findIndex(candidate => candidate === id);

    if (index === -1) {
      return [id];
    }

    return sorted.slice(0, index + 1);
  }

  /**
   * Collect the IDs of the plugins to activate on startup.
   */
  export function collectStartupPlugins(
    plugins: Map<string, IPluginData>,
    options: PluginRegistry.IStartOptions
  ): string[] {
    // Create a set to hold the plugin IDs.
    const collection = new Set<string>();

    // Collect the auto-start (non deferred) plugins.
    for (const id of plugins.keys()) {
      if (plugins.get(id)!.autoStart === true) {
        collection.add(id);
      }
    }

    // Add the startup plugins.
    if (options.startPlugins) {
      for (const id of options.startPlugins) {
        collection.add(id);
      }
    }

    // Remove the ignored plugins.
    if (options.ignorePlugins) {
      for (const id of options.ignorePlugins) {
        collection.delete(id);
      }
    }

    // Return the collected startup plugins.
    return Array.from(collection);
  }
}
