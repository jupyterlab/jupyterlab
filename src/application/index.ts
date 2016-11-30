// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  Application
} from 'phosphor/lib/ui/application';

import {
  ApplicationShell
} from './shell';


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
    this._version = options.version || 'unknown';
    this._gitDescription = options.gitDescription || 'unknown';
  }

  /**
   * A promise that resolves when the JupyterLab application is started.
   */
  get started(): Promise<void> {
    return this._startedDelegate.promise;
  }

  /**
   * The version of the application.
   */
  get version() {
    return this._version;
  }

  /**
   * The git description of the application.
   */
  get gitDescription(): string {
    return this._gitDescription;
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
   * Create the application shell for the JupyterLab application.
   */
  protected createShell(): ApplicationShell {
    return new ApplicationShell();
  }

  private _startedDelegate = new utils.PromiseDelegate<void>();
  private _startedFlag = false;
  private _version: string;
  private _gitDescription: string;
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
  }
}
