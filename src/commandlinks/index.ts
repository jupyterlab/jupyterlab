/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Token
} from 'phosphor/lib/core/token';


/* tslint:disable */
/**
 * The command links token.
 */
export
const ICommandLinks = new Token<ICommandLinks>('jupyter.services.commandlinks');
/* tslint:enable */


/**
 * A helper class to generate clickables that execute commands.
 */
export
interface ICommandLinks {}
