// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  Application
} from 'phosphor/lib/ui/application';

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
type JupyterLabPlugin<T> = Application.IPlugin<JupyterLab, T>;


/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export
class JupyterLab extends Application<ApplicationShell> {
  /**
   * Construct a new JupyterLab object.
   */
  constructor(options: JupyterLab.IOptions = {}) {
    super();
    this._info = {
      version:  options.version || 'unknown',
      gitDescription: options.gitDescription || 'unknown'
    };
    this._loader = options.loader || null;
  }

  /**
   * A promise that resolves when the JupyterLab application is started.
   */
  get started(): Promise<void> {
    return this._startedDelegate.promise;
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
   * Start the JupyterLab application.
   */
  start(options: Application.IStartOptions = {}): Promise<void> {
    if (this._startedFlag) {
      return Promise.resolve(void 0);
    }
    this._startedFlag = true;
    return super.start(options).then(() => {
      this._startedDelegate.resolve(void 0);
    });
  }

  /**
   * Register plugins from a plugin module.
   */
  registerPluginModule(mod: JupyterLab.IPluginModule): void {
    let data = mod.default;
    if (!Array.isArray(data)) {
      data = [data];
    }
    for (let item of data) {
      this.registerPlugin(item);
    }
  }

  /**
   * Create the application shell for the JupyterLab application.
   */
  protected createShell(): ApplicationShell {
    return new ApplicationShell();
  }

  private _startedDelegate = new utils.PromiseDelegate<void>();
  private _startedFlag = false;
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
     * The version of the JupyterLab application.
     */
    version?: string;

    /**
     * The git description of the JupyterLab application.
     */
    gitDescription?: string;

    /**
     * The module loader used by the application.
     */
    loader?: ModuleLoader;
  }

  /**
   * The information about a JupyterLab application.
   */
  export
  interface IInfo {
    /**
     * The version of the JupyterLab application.
     */
    readonly version: string;

    /**
     * The git description of the JupyterLab application.
     */
    readonly gitDescription: string;
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
