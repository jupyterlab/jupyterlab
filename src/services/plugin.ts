// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  getBaseUrl, getConfigOption
} from 'jupyter-js-utils';

import {
  IKernel, ISession, IContentsManager,
  ContentsManager, KernelManager, SessionManager,
  getKernelSpecs, IAjaxSettings
} from 'jupyter-js-services';

import {
  TerminalManager
} from '../terminal';


/**
 * An implementation of a services provider.
 */
export
class JupyterServices {

  /**
   * Construct a new services provider.
   */
  constructor(baseUrl: string, ajaxSettings: IAjaxSettings, specs: IKernel.ISpecModels) {
    let options = { baseUrl, ajaxSettings };
    this._kernelspecs = specs;
    this._kernelManager = new KernelManager(options);
    this._sessionManager = new SessionManager(options);
    this._contentsManager = new ContentsManager(baseUrl, ajaxSettings);
    this._terminalManager = new TerminalManager(options);
  }

  /**
   * Get kernel specs.
   */
  get kernelspecs(): IKernel.ISpecModels {
    return this._kernelspecs;
  }

  /**
   * Get kernel manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelManager(): IKernel.IManager {
    return this._kernelManager;
  }

  /**
   * Get the session manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get sessionManager(): ISession.IManager {
    return this._sessionManager;
  }

  /**
   * Get the contents manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentsManager(): IContentsManager {
    return this._contentsManager;
  }

  /**
   * Get the terminal manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get terminalManager(): TerminalManager {
    return this._terminalManager;
  }

  private _kernelManager: IKernel.IManager = null;
  private _sessionManager: ISession.IManager = null;
  private _contentsManager: IContentsManager = null;
  private _terminalManager: TerminalManager = null;
  private _kernelspecs: IKernel.ISpecModels = null;
}


/**
 * The default services provider.
 */
export
const servicesProvider = {
  id: 'jupyter.services.services',
  provides: JupyterServices,
  resolve: () => {
    let baseUrl = getBaseUrl();
    let ajaxSettings = getConfigOption('ajaxSettings');
    let options = { baseUrl, ajaxSettings };
    return getKernelSpecs(options).then(specs => {
      return new JupyterServices(baseUrl, ajaxSettings, specs);
    });
  }
};
