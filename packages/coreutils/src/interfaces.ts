// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


/**
 * A generic interface for change emitter payloads.
 */
export
interface IChangedArgs<T> {
  /**
   * The name of the changed attribute.
   */
  name: string;

  /**
   * The old value of the changed attribute.
   */
  oldValue: T;

  /**
   * The new value of the changed attribute.
   */
  newValue: T;
}


/**
 * The description of a general purpose data connector.
 */
export
interface IDataConnector<T, U = T> {
  /**
   * Retrieve a saved bundle from the data connector.
   *
   * @param id - The identifier used to retrieve a data bundle.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The promise returned by this method may be rejected if an error
   * occurs in  retrieving the data. Non-existence of an `id` will
   * succeed with `undefined`.
   */
  fetch(id: string): Promise<T | undefined>;

  /**
   * Remove a value from the data connector.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   */
  remove(id: string): Promise<void>;

  /**
   * Save a value in the data connector.
   *
   * @param id - The identifier for the data being saved.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   */
  save(id: string, value: U): Promise<void>;
}
