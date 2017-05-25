import {
  JupyterLabPlugin
} from '@jupyterlab/application';

// All themes need to import the theme assets index.css.
import '@jupyterlab/theming/style/index.css';
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
