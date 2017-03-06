// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MimeData
} from '@phosphor/coreutils';

import {
  JupyterLabPlugin
} from '../application';

import {
  IClipboard
} from './';


/**
 * The clipboard provider.
 */
const plugin: JupyterLabPlugin<IClipboard> = {
  id: 'jupyter.services.clipboard',
  provides: IClipboard,
  activate: (): IClipboard => new MimeData()
};


/**
 * Export the plugin as default.
 */
export default plugin;
