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
interface IFileBrowser {
  fileBrowser: FileBrowser;
}


/**
 * The dependency token for the `IFileBrowser` interface.
 */
export
const IFileBrowser = new Token<IFileBrowser>('jupyter-js-plugins.IFileBrowser');
