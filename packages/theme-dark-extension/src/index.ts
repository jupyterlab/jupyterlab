import {
  JupyterLabPlugin
} from '@jupyterlab/application';


import '@jupyterlab/theming/style/variables-dark.css';


/**
 * Initialization data for the dark theme extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyter.themes.dark',
  autoStart: true,
  activate: (app) => {
    // No-op
  }
};

export default extension;
