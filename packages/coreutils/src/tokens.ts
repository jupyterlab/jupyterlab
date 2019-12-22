// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token, ReadonlyPartialJSONValue } from '@lumino/coreutils';

import { IDataConnector } from './interfaces';

/* tslint:disable */
/**
 * The default state database token.
 */
export const IStateDB = new Token<IStateDB>('@jupyterlab/coreutils:IStateDB');
/* tslint:enable */

/**
 * The description of a state database.
 */
export interface IStateDB<
  T extends ReadonlyPartialJSONValue = ReadonlyPartialJSONValue
> extends IDataConnector<T> {
  /**
   * Return a serialized copy of the state database's entire contents.
   *
   * @returns A promise that bears the database contents as JSON.
   */
  toJSON(): Promise<{ [id: string]: T }>;
}
