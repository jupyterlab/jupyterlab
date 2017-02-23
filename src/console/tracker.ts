// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/application';

import {
  IInstanceTracker
} from '../common/instancetracker';

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
interface IConsoleTracker extends IInstanceTracker<ConsolePanel> {}
