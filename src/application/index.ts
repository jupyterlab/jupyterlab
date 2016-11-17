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
   * A promise that resolves when the JupyterLab application is started.
   */
  get started(): Promise<void> {
    return this._startedDelegate.promise;
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
}
