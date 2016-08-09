// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  JupyterLabPlugin
} from '../application';

import {
  IClipboard
} from './';


/**
 * The clipboard provider.
 */
export
const clipboardProvider: JupyterLabPlugin<IClipboard> = {
  id: 'jupyter.services.clipboard',
  provides: IClipboard,
  activate: (): IClipboard => new MimeData()
};
