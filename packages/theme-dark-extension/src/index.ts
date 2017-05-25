import {
  JupyterLabPlugin
} from '@jupyterlab/application';

// All themes need to import the theme assets index.css.
import '@jupyterlab/themes/style/index.css';
import '@jupyterlab/themes/style/variables-dark.css';


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
