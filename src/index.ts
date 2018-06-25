// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import {
  JupyterLab, JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  StatusBar, IStatusBar
} from './statusbar';

// Export default status bar items
import { helloStatusItem } from './defaults';

/**
 * Initialization data for the statusbar extension.
 */
const statusbar: JupyterLabPlugin<IStatusBar> = {
  id: 'jupyterlab-statusbar/statusbar',
  provides: IStatusBar,
  activate: (app: JupyterLab) => {
    return new StatusBar({ host: app.shell });
  }
};

const plugins: JupyterLabPlugin<any>[] = [
  statusbar, helloStatusItem
];

export default plugins;

export * from './statusBar';
export * from './defaults';
