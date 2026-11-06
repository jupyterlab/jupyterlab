/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';
import type { Widget } from '@lumino/widgets';

/**
 * The tree path updater token.
 */
export const ITreePathUpdater = new Token<ITreePathUpdater>(
  '@jupyterlab/application:ITreePathUpdater',
  'A service to update the tree path.'
);

/**
 * A function to call to update the tree path.
 */
export interface ITreePathUpdater {
  (treePath: string): void;

  /**
   * Wait for the default file browser to handle the startup URL.
   */
  deferUntil?(restored: Promise<ITreePathUpdater.IBrowserState>): void;
}

export namespace ITreePathUpdater {
  export interface IBrowserState {
    /**
     * The directory shown by the file browser.
     */
    path: string;

    /**
     * The document named by the startup URL, if one was restored or opened.
     */
    document?: {
      path: string;
      widget: Widget;
    };
  }
}
