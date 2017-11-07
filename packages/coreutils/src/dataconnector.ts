// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDataConnector
} from './interfaces';


/**
 * An abstract class that adheres to the data connector interface.
 */
export
abstract class DataConnector<T, U = T, V = string> implements IDataConnector<T, U, V> {
  /**
   * Retrieve an item from the data connector.
   *
   * @param id - The identifier used to retrieve an item.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The promise returned by this method may be rejected if an error
   * occurs in  retrieving the data. Non-existence of an `id` will
   * succeed with `undefined`.
   */
  abstract fetch(id: V): Promise<T | undefined>;

  /**
   * Remove a value using the data connector.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   *
   * #### Notes
   * This method will always reject, subclasses should reimplement it if they
   * support a back-end that can remove resources.
   */
  remove(id: V): Promise<void> {
    return Promise.reject(new Error('Removing has not been implemented.'));
  }

  /**
   * Save a value using the data connector.
   *
   * @param id - The identifier for the data being saved.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   *
   * #### Notes
   * This method will always reject, subclasses should reimplement it if they
   * support a back-end that can save resources.
   */
  save(id: V, value: U): Promise<void> {
    return Promise.reject(new Error('Saving has not been implemented.'));
  }
}
