// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import { StatusBar, IStatusBar } from './statusBar';

// Export default status bar items

import {
    defaultsManager,
    notebookTrustItem,
    IDefaultStatusesManager,
    lineColItem,
    fileUploadItem,
    kernelStatusItem,
    commandEditStatusItem,
    runningSessionsItem
} from './defaults';

export const STATUSBAR_PLUGIN_ID = 'jupyterlab-statusbar:plugin';

/**
 * Initialization data for the statusbar extension.
 */
const statusBar: JupyterLabPlugin<IStatusBar> = {
    id: STATUSBAR_PLUGIN_ID,
    provides: IStatusBar,
    autoStart: true,
    requires: [IDefaultStatusesManager],
    activate: (app: JupyterLab, defaultManager: IDefaultStatusesManager) => {
        return new StatusBar({ host: app.shell, defaultManager });
    }
};

const plugins: JupyterLabPlugin<any>[] = [
    statusBar,
    defaultsManager,
    lineColItem,
    notebookTrustItem,
    fileUploadItem,
    kernelStatusItem,
    commandEditStatusItem,
    runningSessionsItem
];

export default plugins;

export * from './statusBar';
