// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';


/**
 * The clipboard provider.
 */
export
const clipboardProvider = {
  id: 'jupyter.services.clipboard',
  provides: IClipboard,
  resolve: () => {
    return new IClipboard();
  }
};
