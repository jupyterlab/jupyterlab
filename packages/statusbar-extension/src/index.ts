// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import { StatusBar, IStatusBar } from './statusBar';

// Export default status bar items

import {
  defaultsManager,
  notebookTrustItem,
  lineColItem,
  fileUploadItem,
  kernelStatusItem,
  commandEditItem,
  runningSessionsItem,
  filePathItem,
  tabSpaceItem,
  editorSyntax,
  memoryUsageItem,
  savingStatusItem
} from './defaults';

export const STATUSBAR_PLUGIN_ID = '@jupyterlab/statusbar:plugin';

/**
 * Initialization data for the statusbar extension.
 */
const statusBar: JupyterLabPlugin<IStatusBar> = {
  id: STATUSBAR_PLUGIN_ID,
  provides: IStatusBar,
  autoStart: true,
  activate: (app: JupyterLab) => {
    return new StatusBar({ host: app.shell });
  }
};

const plugins: JupyterLabPlugin<any>[] = [
  statusBar,
  defaultsManager,
  lineColItem,
  notebookTrustItem,
  fileUploadItem,
  kernelStatusItem,
  commandEditItem,
  runningSessionsItem,
  filePathItem,
  tabSpaceItem,
  editorSyntax,
  memoryUsageItem,
  savingStatusItem
];

export default plugins;

export * from './statusBar';
