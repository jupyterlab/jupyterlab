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
  fetch(): Promise<ISaveBundle>;
  save(): Promise<void>;
}
