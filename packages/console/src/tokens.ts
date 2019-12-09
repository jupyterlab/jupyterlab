// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';

import { Token } from '@lumino/coreutils';

import { ConsolePanel } from './panel';

/* tslint:disable */
/**
 * The console tracker token.
 */
export const IConsoleTracker = new Token<IConsoleTracker>(
  '@jupyterlab/console:IConsoleTracker'
);
/* tslint:enable */

/**
 * A class that tracks console widgets.
 */
export interface IConsoleTracker extends IWidgetTracker<ConsolePanel> {}
