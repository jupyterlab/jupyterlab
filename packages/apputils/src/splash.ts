// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';

import { Token } from '@lumino/coreutils';

/* tslint:disable */
/**
 * The main menu token.
 */
export const ISplashScreen = new Token<ISplashScreen>(
  '@jupyterlab/apputils:ISplashScreen'
);
/* tslint:enable */

/**
 * The interface for an application splash screen.
 */
export interface ISplashScreen {
  /**
   * Show the application splash screen.
   *
   * @param light - Whether to show the light splash screen or the dark one.
   *
   * @returns A disposable used to clear the splash screen.
   */
  show(light?: boolean): IDisposable;
}
