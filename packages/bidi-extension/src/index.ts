import {
    JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';


/**
 * Initialization data for the jupyterlab_bidiextension extension.
 */
const bidiextension: JupyterLabPlugin<void> = {
  id: 'jupyter.services.bidi',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab_bidiextension is activated!');
  }
};


export default bidiextension;
