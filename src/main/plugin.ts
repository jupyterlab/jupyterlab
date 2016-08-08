// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';


/**
 * The main extension.
 */
export
const mainExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.main',
  activate: (app: JupyterLab) => {
    window.onbeforeunload = event => {
      let msg = 'Are you sure you want to exit JupyterLab?';
      msg += '\nAny unsaved changes will be lost.';
      return msg;
    };
  },
  autoStart: true
};
