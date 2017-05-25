import {
  JupyterLabPlugin
} from '@jupyterlab/application';

// All themes need to import the theme assets index.css.
import '@jupyterlab/theme-assets/style/index.css'

import '../style/index.css';

/**
 * Initialization data for the {{ cookiecutter.extension_name }} extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyter.themes.dark',
  autoStart: true,
  activate: (app) => {
    console.log('Dark theme is activated!');
  }
};

export default extension;
