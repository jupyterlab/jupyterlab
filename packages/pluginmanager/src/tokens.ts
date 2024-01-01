// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';

/**
 * The plugin manager token.
 */
export const IPluginManager = new Token<IPluginManager>(
  '@jupyterlab/pluginmanager:IPluginManager',
  `A canary for plugin manager presence, with a method to open the plugin manager widget.`
);

/**
 * A class that exposes a command to open plugin manager.
 */
export interface IPluginManager {
  /**
   * Open the plugin manager.
   */
  open(): Promise<void>;
}
