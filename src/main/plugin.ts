// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Application
} from 'phosphide/lib/core/application';


/**
 * The main extension.
 */
export
const mainExtension = {
  id: 'jupyter.extensions.main',
  activate: (app: Application) => {
    window.onbeforeunload = event => {
      let msg = 'Are you sure you want to exit JupyterLab?';
      msg += '\nAny unsaved changes will be lost.';
      return msg;
    };
  }
};
