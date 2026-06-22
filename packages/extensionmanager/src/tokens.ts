// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import type { ListModel } from './model';

/**
 * The extension manager model token.
 *
 * #### Notes
 * Provide this token to supply a custom extension manager model — for example
 * to list extensions from a source other than the default server API (such as
 * the prebuilt extensions of a server-less deployment). When provided, the
 * extension manager plugin uses it instead of the default {@link ListModel}.
 *
 * The model must be a {@link ListModel} (or subclass); override
 * {@link ListModel.fetchInstalled} to change where extensions are listed from.
 */
export const IExtensionManager = new Token<ListModel>(
  '@jupyterlab/extensionmanager:IExtensionManager',
  'A service providing the model backing the extension manager. Provide it to list extensions from a custom source.'
);
