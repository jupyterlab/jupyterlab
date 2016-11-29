// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  IStateDB, IStateItem
} from './index';


/**
 * The default concrete implementation of a state database.
 */
export
class StateDB implements IStateDB {
  /**
   * The maximum allowed length of the data after it has been serialized.
   */
  readonly maxLength = 2000;

  /**
   * Clear the entire database.
   */
  clear(): Promise<void> {
    window.localStorage.clear();
    return Promise.resolve(void 0);
  }

  /**
   * Retrieve a saved bundle from the database.
   *
   * @param id - The identifier used to retrieve a data bundle.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The `id` values of stored items in the state database are formatted:
   * `'namespace:identifier'`, which is the same convention that command
   * identifiers in JupyterLab use as well. While this is not a technical
   * requirement for `fetch()`, `remove()`, and `save()`, it *is* necessary for
   * using the `fetchNamespace()` method.
   *
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Non-existence of an `id` will succeed, however.
   */
  fetch(id: string): Promise<JSONObject> {
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
  fetchNamespace(namespace: string): Promise<IStateItem[]> {
    let items: IStateItem[] = [];
    for (let i = 0, len = window.localStorage.length; i < len; i++) {
      let key = window.localStorage.key(i);
      if (key.indexOf(`${namespace}:`) === 0) {
        try {
          items.push({
            id: key,
            value: JSON.parse(window.localStorage.getItem(key))
          });
        } catch (error) {
          console.warn(error);
        }
      }
    }
    return Promise.resolve(items);
  }

  /**
   * Remove a value from the database.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   */
  remove(id: string): Promise<void> {
    window.localStorage.removeItem(id);
    return Promise.resolve(void 0);
  }

  /**
   * Save a value in the database.
   *
   * @param id - The identifier for the data being saved.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   *
   * #### Notes
   * The `id` values of stored items in the state database are formatted:
   * `'namespace:identifier'`, which is the same convention that command
   * identifiers in JupyterLab use as well. While this is not a technical
   * requirement for `fetch()`, `remove()`, and `save()`, it *is* necessary for
   * using the `fetchNamespace()` method.
   */
  save(id: string, value: JSONObject): Promise<void> {
    try {
      let serialized = JSON.stringify(value);
      let length = serialized.length;
      let max = this.maxLength;
      if (length > max) {
        throw new Error(`Serialized data (${length}) exceeds maximum (${max})`);
      }
      window.localStorage.setItem(id, serialized);
      return Promise.resolve(void 0);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
