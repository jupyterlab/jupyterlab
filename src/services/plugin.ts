// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  getBaseUrl, getConfigOption
} from 'jupyter-js-utils';

import {
  IKernelManager, INotebookSessionManager, IContentsManager,
  ContentsManager, KernelManager, NotebookSessionManager
} from 'jupyter-js-services';


/**
 * An implementation of a services provider.
 */
export
class JupyterServices {

  /**
   * Construct a new services provider.
   */
  constructor() {
    let baseUrl = getBaseUrl();
    let ajaxSettings = getConfigOption('ajaxSettings');
    let options = { baseUrl, ajaxSettings };
    this._kernelManager = new KernelManager(options);
    this._sessionManager = new NotebookSessionManager(options);
    this._contentsManager = new ContentsManager(baseUrl, ajaxSettings);
  }

  /**
   * Get kernel manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelManager(): IKernelManager {
    return this._kernelManager;
  }

  /**
   * Get the session manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get notebookSessionManager(): INotebookSessionManager {
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

  private _kernelManager: IKernelManager = null;
  private _sessionManager: INotebookSessionManager = null;
  private _contentsManager: IContentsManager = null;
}


/**
 * The default services provider.
 */
export
const servicesProvider = {
  id: 'jupyter.services.services',
  provides: JupyterServices,
  resolve: () => {
    return new JupyterServices();
  },
};
