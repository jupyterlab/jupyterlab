// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IStateDB
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
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The `id` values of stored items in the state database are formatted:
   * `'namespace:identifier'`, which is the same convention that command
   * identifiers in JupyterLab use as well. While this is not a technical
   * requirement for `fetch()` and `save()`, it *is* necessary for using the
   * `fetchNamespace()` method.
   *
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Non-existence of an `id` will succeed, however.
   */
  fetch(id: string): Promise<JSONValue> {
    try {
      return Promise.resolve(JSON.parse(window.localStorage.getItem(id)));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace - The namespace to retrieve.
   *
   * @returns A promise that bears a collection data payloads for a namespace.
   *
   * #### Notes
   * Namespaces are entirely conventional entities. The `id` values of stored
   * items in the state database are formatted: `'namespace:identifier'`, which
   * is the same convention that command identifiers in JupyterLab use as well.
   *
   * If there are any errors in retrieving the data, they will be logged to the
   * console in order to optimistically return any extant data without failing.
   * This promise will always succeed.
   */
  fetchNamespace(namespace: string): Promise<JSONValue[]> {
    let data: JSONValue[] = [];
    for (let i = 0, len = window.localStorage.length; i < len; i++) {
      let key = window.localStorage.key(i);
      if (key.indexOf(`${namespace}:`) === 0) {
        try {
          data.push(JSON.parse(window.localStorage.getItem(key)));
        } catch (error) {
          console.warn(error);
        }
      }
    }
    return Promise.resolve(data);
  }

  /**
   * Save a value in the database.
   *
   * @param id - The identifier for the data being saved.
   *
   * @param data - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   *
   * #### Notes
   * The `id` values of stored items in the state database are formatted:
   * `'namespace:identifier'`, which is the same convention that command
   * identifiers in JupyterLab use as well. While this is not a technical
   * requirement for `fetch()` and `save()`, it *is* necessary for using the
   * `fetchNamespace()` method.
   */
  save(id: string, data: JSONValue): Promise<void> {
    window.localStorage.setItem(id, JSON.stringify(data));
    return Promise.resolve(void 0);
  }
}
