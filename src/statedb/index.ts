// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  Token
} from 'phosphor/lib/core/token';


/* tslint:disable */
/**
 * The default state database token.
 */
export
const IStateDB = new Token<IStateDB>('jupyter.services.statedb');
/* tslint:enable */


/**
 * The value that is saved and retrieved from the database.
 */
export
interface ISaveBundle {
  /**
   * The identifier used to save retrieve a data bundle.
   */
  id: string;

  /**
   * The actual value being stored or retrieved.
   */
  data: JSONValue;

  /**
   * An optional namespace to help categories saved bundles.
   *
   * #### Notes
   * If a namespace is not provided, the default value will be `'statedb'`. An
   * example of a namespace value would be a widget type, e.g., `'notebook'` or
   * `'console'`.
   */
  namespace?: string;
}


/**
 * The description of a state database.
 */
export
interface IStateDB {
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
  fetch(id: string, namespace?: string): Promise<ISaveBundle>;

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace - The namespace to retrieve.
   *
   * @returns A promise that bears a collection of saved bundles.
   */
  fetchNamespace(namespace: string): Promise<ISaveBundle[]>;

  /**
   * Save a bundle in the database.
   *
   * @param bundle - The bundle being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   */
  save(bundle: ISaveBundle): Promise<void>;
}
