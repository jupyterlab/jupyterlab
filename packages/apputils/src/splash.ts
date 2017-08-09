// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Token
} from '@phosphor/coreutils';


/* tslint:disable */
/**
 * The main menu token.
 */
export
const ISplashScreen = new Token<ISplashScreen>('jupyter.services.splash-screen');
/* tslint:enable */


/**
 * The interface for an application splash screen.
 */
export
interface ISplashScreen {
  /**
   * Show the application splash screen.
   *
   * @returns A disposable used to clear the splash screen.
   */
  show(): IDisposable;
}
