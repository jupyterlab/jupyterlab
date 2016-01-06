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
  IServicesFactory
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
  container.register(IServicesFactory, ServicesFactory);
}


class ServicesFactory implements IServicesFactory {

  /**
   * The dependencies required by the application shell.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new application shell instance.
   */
  static create(): IServicesFactory {
    return new ServicesFactory();
  }

  /**
   * Construct a new services factory.
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
