/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Token
} from 'phosphor/lib/core/token';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';


/* tslint:disable */
/**
 * The command palette token.
 */
export
const ICommandPalette = new Token<ICommandPalette>('jupyter.services.commandpalette');
/* tslint:enable */

export
interface ICommandPalette extends CommandPalette {}
