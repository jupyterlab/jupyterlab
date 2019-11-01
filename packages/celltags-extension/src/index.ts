import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTools, INotebookTracker } from '@jupyterlab/notebook';

import { TagTool } from '@jupyterlab/celltags';
import { IThemeManager } from '@jupyterlab/apputils';

function activate(
  app: JupyterFrontEnd,
  tools: INotebookTools,
  tracker: INotebookTracker,
  manager: IThemeManager
) {
  const tool = new TagTool(tracker, app, manager);
  tools.addItem({ tool: tool, rank: 1.7 });
  manager.themeChanged.connect(() => {
    tool.updateTheme();
  });
}

/**
 * Initialization data for the celltags extension.
 */
const celltags: JupyterFrontEndPlugin<void> = {
  id: 'celltags',
  autoStart: true,
  requires: [INotebookTools, INotebookTracker, IThemeManager],
  activate: activate
};

export default celltags;
