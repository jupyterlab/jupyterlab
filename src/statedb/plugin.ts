// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ISaveBundle, IStateDB
} from './index';


/**
 * The default namespace used by the application state database.
 */
const NAMESPACE = 'statedb';


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
   * @returns A promise that bears a saved bundle or rejects if unavailable.
   *
   * #### Notes
   * If a namespace is not provided, the default value will be `'statedb'`.
   */
  fetch(id: string, namespace?: string): Promise<ISaveBundle> {
    let key = `${namespace || NAMESPACE}:${id}`;
    try {
      return Promise.resolve(JSON.parse(window.localStorage.getItem(key)));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace - The namespace to retrieve.
   *
   * @returns A promise that bears a collection of saved bundles.
   */
  fetchNamespace(namespace: string): Promise<ISaveBundle[]> {
    let bundles: ISaveBundle[] = [];
    for (let i = 0, len = window.localStorage.length; i < len; i++) {
      let key = window.localStorage.key(i);
      if (key.indexOf(`${key}:`) === 0) {
        try {
          bundles.push(JSON.parse(window.localStorage.getItem(key)));
        } catch (error) {
          console.warn(error);
        }
      }
    }
    return Promise.resolve(bundles);
  }

  /**
   * Save a bundle in the database.
   *
   * @param bundle - The bundle being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   */
  save(bundle: ISaveBundle): Promise<void> {
    let key = `${bundle.namespace || NAMESPACE}:${bundle.id}`;
    window.localStorage.setItem(key, JSON.stringify(bundle));
    return Promise.resolve(void 0);
  }
}
