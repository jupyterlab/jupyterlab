import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  INotebookTracker
} from '@jupyterlab/notebook';

import {
  TableOfContents
} from './toc'

import '../style/index.css';


/**
 * Initialization data for the jupyterlab-toc extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-toc',
  autoStart: true,
  requires: [INotebookTracker],
  activate: activateTOC,
};

/**
 * Activate the ToC extension.
 */
function activateTOC(app: JupyterLab, notebookTracker: INotebookTracker): void {
  let toc = new TableOfContents();
  toc.title.label = 'Contents';
  toc.id = 'table-of-contents';
  app.shell.addToLeftArea(toc);

  notebookTracker.currentChanged.connect((s, current) => {
    toc.notebook = current.notebook;
  });
}

export default extension;
