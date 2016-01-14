// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Token
} from 'phosphor-di';

import {
  FileBrowserWidget
} from 'jupyter-js-filebrowser';


/**
 * A singleton FileBrowserWidget provider.
 */
export
interface IFileBrowserWidget extends FileBrowserWidget { }


/**
 * The dependency token for the `IFileBrowserWidget` interface.
 */
export
const IFileBrowserWidget = new Token<IFileBrowserWidget>('jupyter-js-plugins.IFileBrowserWidget');
