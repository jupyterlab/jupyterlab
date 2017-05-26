import {
  JupyterLabPlugin
} from '@jupyterlab/application';

import '@jupyterlab/theming/style/variables-light.css';


/**
 * Initialization data for the light theme extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyter.themes.light',
  autoStart: true,
  activate: (app) => {
    // No-op.
  }
};

export default extension;
