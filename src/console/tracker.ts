// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  ConsolePanel
} from './';


/* tslint:disable */
/**
 * The console tracker token.
 */
export
const IConsoleTracker = new Token<IConsoleTracker>('jupyter.services.consoles');
/* tslint:enable */


/**
 * A class that tracks console widgets.
 */
export
interface IConsoleTracker extends FocusTracker<ConsolePanel> {}
