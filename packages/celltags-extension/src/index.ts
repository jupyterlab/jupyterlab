import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTools, INotebookTracker } from '@jupyterlab/notebook';

import { TagTool } from '@jupyterlab/celltags';

function activate(
  app: JupyterFrontEnd,
  tools: INotebookTools,
  tracker: INotebookTracker
) {
  const tool = new TagTool(tracker, app);
  tools.addItem({ tool: tool, rank: 1.7 });
}

/**
 * Initialization data for the celltags extension.
 */
const celltags: JupyterFrontEndPlugin<void> = {
  id: 'celltags',
  autoStart: true,
  requires: [INotebookTools, INotebookTracker],
  activate: activate
};

export default celltags;
