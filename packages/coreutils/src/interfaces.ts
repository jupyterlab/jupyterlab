// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A generic interface for change emitter payloads.
 */
export interface IChangedArgs<T> {
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
 *
 * #### Notes
 * The generic type arguments <T, U = T, V = string> semantics are:
 *
 * T - is the basic entity response type a particular service's connector.
 *
 * U = T - is the basic entity request type, which is conventionally the same as
 * the response type but may be different if a service's implementation requires
 * input data to be different from output responses.
 *
 * V = string - is the basic token applied to a request, conventionally a string
 * ID or filter, but may be set to a different type when an implementation
 * requires it.
 */
export interface IDataConnector<T, U = T, V = string> {
  /**
   * Retrieve an item from the data connector.
   *
   * @param id - The identifier used to retrieve an item.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Nonexistence of an `id` resolves with `undefined`.
   */
  fetch(id: V): Promise<T | undefined>;

  /**
   * Retrieve the list of items available from the data connector.
   *
   * @param query - The optional query filter to apply to the connector request.
   *
   * @returns A promise that bears a list of `values` and an associated list of
   * fetch `ids`.
   *
   * #### Notes
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. The two lists will always be the same size. If there
   * is no data, this method will succeed with empty `ids` and `values`.
   */
  list(query?: any): Promise<{ ids: V[]; values: T[] }>;

  /**
   * Remove a value using the data connector.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   *
   * #### Notes
   * This promise may resolve with a back-end response or `undefined`.
   * Existence of resolved content in the promise is not prescribed and must be
   * tested for. For example, some back-ends may return a copy of the item of
   * type `T` being removed while others may return no content.
   */
  remove(id: V): Promise<any>;

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
   * This promise may resolve with a back-end response or `undefined`.
   * Existence of resolved content in the promise is not prescribed and must be
   * tested for. For example, some back-ends may return a copy of the item of
   * type `T` being saved while others may return no content.
   */
  save(id: V, value: U): Promise<any>;
}
