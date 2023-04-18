// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { ConsolePanel } from './panel';

/**
 * The console tracker token.
 */
export const IConsoleTracker = new Token<IConsoleTracker>(
  '@jupyterlab/console:IConsoleTracker',
  `A widget tracker for code consoles.
  Use this if you want to be able to iterate over and interact with code consoles
  created by the application.`
);

/**
 * A class that tracks console widgets.
 */
export interface IConsoleTracker extends IWidgetTracker<ConsolePanel> {}
