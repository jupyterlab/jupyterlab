import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTools, INotebookTracker } from '@jupyterlab/notebook';

import { TagTool } from '@jupyterlab/celltags';

import { ITranslator } from '@jupyterlab/translation';

/**
 * Initialization data for the celltags extension.
 */
const celltags: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/celltags',
  autoStart: true,
  requires: [INotebookTools, INotebookTracker, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    tools: INotebookTools,
    tracker: INotebookTracker,
    translator: ITranslator
  ) => {
    const tool = new TagTool(tracker, app, translator);
    tools.addItem({ tool: tool, rank: 1.6 });
  }
};

export default celltags;
