// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Token
} from 'phosphor-di';

import {
  FileBrowser
} from 'jupyter-js-filebrowser';


/**
 * A singleton FileBrowser provider.
 */
export
interface IFileBrowserProvider {
  fileBrowser: FileBrowser;
}


/**
 * The dependency token for the `IFileBrowserHandler` interface.
 */
export
const IFileBrowserProvider = new Token<IFileBrowserProvider>('jupyter-js-plugins.IFileBrowserProvider');
