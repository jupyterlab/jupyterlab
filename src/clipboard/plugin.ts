// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  JupyterLabPlugin
} from '../application';


/* tslint:disable */
/**
 * The clipboard token.
 */
export
const IClipboard = new Token<IClipboard>('jupyter.services.clipboard');
/* tslint:enable */


/**
 * The clipboard interface.
 */
export
interface IClipboard extends MimeData {}


/**
 * The clipboard provider.
 */
export
const clipboardProvider: JupyterLabPlugin<IClipboard> = {
  id: 'jupyter.services.clipboard',
  provides: IClipboard,
  activate: (): IClipboard => new MimeData()
};
