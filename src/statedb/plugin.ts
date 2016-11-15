// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ISaveBundle, IStateDB
} from './index';


/**
 * The default state database for storing application state.
 */
export
const stateProvider: JupyterLabPlugin<IStateDB> = {
  id: 'jupyter.providers.statedb',
  activate: (app: JupyterLab): IStateDB => new StateDB(),
  autoStart: true
};


/**
 * The default concrete implementation of a state database.
 */
class StateDB implements IStateDB {
  /**
   * Retrieve a saved bundle from the database.
   *
   * @param id - The identifier used to save retrieve a data bundle.
   *
   * @param namespace - An optional namespace to help categories saved bundles.
   *
   * @returns A promise that bears a the saved bundle.
   *
   * #### Notes
   * If a namespace is not provided, the default value will be `'statedb'`.
   */
  fetch(id: string, namespace?: string): Promise<ISaveBundle> {
    return null;
  }

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace - The namespace to retrieve.
   *
   * @returns A promise that bears a collection of saved bundles.
   */
  fetchNamespace(namespace: string): Promise<ISaveBundle[]> {
    return null;
  }

  /**
   * Save a bundle in the database.
   *
   * @param bundle - The bundle being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   */
  save(bundle: ISaveBundle): Promise<void> {
    return null;
  }
}
