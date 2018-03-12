import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  INotebookTracker
} from '@jupyterlab/notebook';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab-toc extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-toc',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterLab, notebookTracker: INotebookTracker) => {
    console.log('JupyterLab extension jupyterlab-toc is activated!');
  }
};

export default extension;
