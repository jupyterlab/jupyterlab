// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Token
} from 'phosphor-di';

import {
  IKernelManager, INotebookSessionManager, IContentsManager
} from 'jupyter-js-services';



/**
 * A provider for creating Jupyter service managers.
 */
export
interface IServicesProvider {

  /**
   * Create a new kernel manager instance.
   */
  createKernelManager(): IKernelManager;

  /**
   * Create a new session manager instance.
   */
  createNotebookSessionManager(): INotebookSessionManager;

  /**
   * Create a new contents manager instance.
   */
  createContentsManager(): IContentsManager;
}


/**
 * The dependency token for the `IServicesFactory` interface.
 */
export
const IServicesProvider = new Token<IServicesProvider>('jupyter-js-plugins.IServicesProvider');
