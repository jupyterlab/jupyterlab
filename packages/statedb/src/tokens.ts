// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReadonlyPartialJSONValue, Token } from '@lumino/coreutils';
import { IDataConnector } from './interfaces';

/**
 * The default state database token.
 */
export const IStateDB = new Token<IStateDB>(
  '@jupyterlab/coreutils:IStateDB',
  `A service for the JupyterLab state database.
  Use this if you want to store data that will persist across page loads.
  See "state database" for more information.`
);

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
