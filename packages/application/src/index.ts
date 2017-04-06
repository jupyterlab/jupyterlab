// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  ApplicationShell
} from './shell';

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
  }

  /**
   * The information about the application.
   */
  get info(): JupyterLab.IInfo {
    return this._info;
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
  registerPluginModule(mod: JupyterLab.PluginModule): void {
    let data: JupyterLabPlugin<any> | JupyterLabPlugin<any>[];
    if (mod.hasOwnProperty('__esModule')) {
      data = (mod as JupyterLab.IPluginModuleES6).default;
    } else {
      data = mod as JupyterLab.PluginModuleES5;
    }
    if (!Array.isArray(data)) {
      data = [data];
    }
    data.forEach(item => { this.registerPlugin(item); });
  }

  private _info: JupyterLab.IInfo;
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
   * The type for a module that exports a plugin or plugins as
   * the default value using ES5 syntax.
   */
  export
  type PluginModuleES5 = JupyterLabPlugin<any> | JupyterLabPlugin<any>[];

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value using ES6 syntax.
   */
  export
  interface IPluginModuleES6 {
    /**
     * The default export.
     */
    default: JupyterLabPlugin<any> | JupyterLabPlugin<any>[];
  }

  /**
   * A type alias for a plugin module.
   */
  export
  type PluginModule = PluginModuleES5 | IPluginModuleES6;
}
