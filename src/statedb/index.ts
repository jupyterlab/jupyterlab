// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
 * The description of a state database.
 */
export
interface IStateDB {
  fetch(): Promise<void>;
  save(): Promise<void>;
}
