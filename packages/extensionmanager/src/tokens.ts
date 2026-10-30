// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import type { ListModel } from './model';

/**
 * The extension manager model interface.
 */
export interface IExtensionManagerModel extends ListModel {}

/**
 * The extension manager model token.
 *
 * #### Notes
 * Provide this token to replace the default {@link ListModel} — typically
 * with a subclass overriding {@link ListModel.fetchInstalled} to list
 * extensions from a source other than the default server API.
 */
export const IExtensionManagerModel = new Token<IExtensionManagerModel>(
  '@jupyterlab/extensionmanager:IExtensionManagerModel',
  'A service providing the model backing the extension manager. Provide it to list extensions from a custom source.'
);
