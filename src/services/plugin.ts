// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  getConfigOption
} from 'jupyter-js-utils';

import {
  IKernelManager, INotebookSessionManager, IContentsManager,
  ContentsManager, KernelManager, NotebookSessionManager
} from 'jupyter-js-services';

import {
  Container, Token
} from 'phosphor-di';

import {
  IServicesProvider
} from './index';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function register(container: Container): void {
  container.register(IServicesProvider, ServicesProvider);
}


/**
 * An implementation of a services provider.
 */
class ServicesProvider implements IServicesProvider {

  /**
   * The dependencies required by the services provider.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new services provider instance.
   */
  static create(): IServicesProvider {
    return new ServicesProvider();
  }

  /**
   * Construct a new services provider.
   */
  constructor() {
    this._baseUrl = getConfigOption('baseUrl');
    this._ajaxSettings = getConfigOption('ajaxSettings');
  }

  /**
   * Create a new kernel manager instance.
   */
  createKernelManager(): IKernelManager {
    let options = { baseUrl: this._baseUrl, ajaxSettings: this._ajaxSettings };
    return new KernelManager(options);
  }

  /**
   * Create a new session manager instance.
   */
  createNotebookSessionManager(): INotebookSessionManager {
    let options = { baseUrl: this._baseUrl, ajaxSettings: this._ajaxSettings };
    return new NotebookSessionManager(options);
  }

  /**
   * Create a new contents manager instance.
   */
  createContentsManager(): IContentsManager {
    return new ContentsManager(this._baseUrl, this._ajaxSettings);
  }

  private _baseUrl = '';
  private _ajaxSettings: any = null;
}
