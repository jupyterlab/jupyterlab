/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';

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
}
