// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import {
  JupyterLab, JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  IMainMenu, MainMenu
} from '@jupyterlab/mainmenu';

import {
  StatusBar, IStatusBar
} from './statusBar';

// Export default status bar items
import { helloStatusItem } from './defaults';

/**
 * Initialization data for the statusbar extension.
 */
const statusBar: JupyterLabPlugin<IStatusBar> = {
  id: 'jupyterlab-statusbar/statusbar',
  provides: IStatusBar,
  autoStart: true,
  requires: [IMainMenu],
  activate: (app: JupyterLab, menu: IMainMenu) => {
    let mainMenu = (menu as MainMenu);
    mainMenu.close();

    return new StatusBar({ host: app.shell });
  }
};

const plugins: JupyterLabPlugin<any>[] = [
  statusBar, helloStatusItem
];

export default plugins;

export * from './statusBar';
export * from './defaults';
