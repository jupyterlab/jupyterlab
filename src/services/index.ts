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
   * Get the kernel manager instance.
   */
  kernelManager: IKernelManager;

  /**
   * Get the session manager instance.
   */
  notebookSessionManager: INotebookSessionManager;

  /**
   * Get the contents manager instance.
   */
  contentsManager: IContentsManager;
}


/**
 * The dependency token for the `IServicesFactory` interface.
 */
export
const IServicesProvider = new Token<IServicesProvider>('jupyter-js-plugins.IServicesProvider');
