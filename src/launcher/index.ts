// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  DisposableDelegate, IDisposable
} from 'phosphor/lib/core/disposable';

/* tslint:disable */
/**
 * The main menu token.
 */
export const ILauncher = new Token<ILauncher>('jupyter.services.launcher');
/* tslint:enable */

/**
 * The launcher interface.
 */
export interface ILauncher {
  /**
   * Add a command item to the Launcher
   *
   * @param name - The display name
   * @param action - The command that should be executed on clicking
   * @param args - arguments to the `action` command
   * @param imgName - the CSS class to attach to the item (defaults to
   * 'jp-Image' followed by the `name` with spaces removed. So if the name is
   * `Launch New Terminal" the class name will be 'jp-ImageLaunchNewTerminal'.
   *
   * @returns A disposable that will remove the item from Launcher.
   */
  add(name: string, action: string, args?: JSONObject, imgName?: string) : IDisposable ;
}

