// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  ModuleLoader
} from './loader';

import {
  ApplicationShell
} from './shell';

export { ModuleLoader } from './loader';
export { ApplicationShell } from './shell';


/**
 * The type for all JupyterLab plugins.
 */
export
type JupyterLabPlugin<T> = IPlugin<JupyterLab, T>;


/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export
class JupyterLab extends Application<ApplicationShell> {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = {}) {
    super({ shell: new ApplicationShell() });
    this._info = {
      gitDescription: options.gitDescription || 'unknown',
      namespace: options.namespace || 'jupyterlab',
      version:  options.version || 'unknown'
    };
    this._loader = options.loader || null;
  }

  /**
   * The information about the application.
   */
  get info(): JupyterLab.IInfo {
    return this._info;
  }

  /**
   * The module loader used by the application.
   */
  get loader(): ModuleLoader | null {
    return this._loader;
  }

  /**
   * Promise that resolves when state is restored, returning layout description.
   *
   * #### Notes
   * This is just a reference to `shell.restored`.
   */
  get restored(): Promise<ApplicationShell.ILayout> {
    return this.shell.restored;
  }

  /**
   * Register plugins from a plugin module.
   *
   * @param mod - The plugin module to register.
   */
  registerPluginModule(mod: JupyterLab.IPluginModule): void {
    let data = mod.default;
    if (!Array.isArray(data)) {
      data = [data];
    }
    data.forEach(item => { this.registerPlugin(item); });
  }

  /**
   * Register the plugins from multiple plugin modules.
   *
   * @param mods - The plugin modules to register.
   */
  registerPluginModules(mods: JupyterLab.IPluginModule[]): void {
    mods.forEach(mod => { this.registerPluginModule(mod); });
  }

  private _info: JupyterLab.IInfo;
  private _loader: ModuleLoader | null;
}


/**
 * The namespace for `JupyterLab` class statics.
 */
export
namespace JupyterLab {
  /**
   * The options used to initialize a JupyterLab object.
   */
  export
  interface IOptions {
    /**
     * The git description of the JupyterLab application.
     */
    gitDescription?: string;

    /**
     * The module loader used by the application.
     */
    loader?: ModuleLoader;

    /**
     * The namespace/prefix plugins may use to denote their origin.
     *
     * #### Notes
     * This field may be used by persistent storage mechanisms such as state
     * databases, cookies, session storage, etc.
     *
     * If unspecified, the default value is `'jupyterlab'`.
     */
    namespace?: string;

    /**
     * The version of the JupyterLab application.
     */
    version?: string;
  }

  /**
   * The information about a JupyterLab application.
   */
  export
  interface IInfo {
    /**
     * The git description of the JupyterLab application.
     */
    readonly gitDescription: string;

    /**
     * The namespace/prefix plugins may use to denote their origin.
     */
    readonly namespace: string;

    /**
     * The version of the JupyterLab application.
     */
    readonly version: string;
  }

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export
  interface IPluginModule {
    /**
     * The default export.
     */
    default: JupyterLabPlugin<any> | JupyterLabPlugin<any>[];
  }
}
