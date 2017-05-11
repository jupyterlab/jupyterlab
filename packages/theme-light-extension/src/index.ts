import {
  JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';

/**
 * Initialization data for the {{ cookiecutter.extension_name }} extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyter.themes.light',
  autoStart: true,
  activate: (app) => {
    console.log('Light theme is activated!');
  }
};

export default extension;
