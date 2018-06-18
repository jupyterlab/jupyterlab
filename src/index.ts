import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the statusbar extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-statusbar',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension statusbar is activated!');
  }
};

export default extension;
