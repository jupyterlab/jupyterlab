// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import {
  JupyterLab, JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  Token
} from '@phosphor/coreutils';

import {
  StatusBar
} from './statusbar';

import {
  ManagedStatusBarItem, StatusBarItem
} from './statusitems';

export {ManagedStatusBarItem, StatusBarItem}


export
interface IStatusBar {
  listStatusItems(): string[];
  hasStatusItem(id: string): boolean;

  createManagedStatusItem(id: string): ManagedStatusBarItem;
  registerStatusItem(id: string, widget: StatusBarItem): StatusBarItem;
}

import { ISettingRegistry } from '@jupyterlab/coreutils';

export
const IStatusBar = new Token<IStatusBar>('jupyterlab-statusbar:statusbar');

/**
 * Initialization data for the statusbar extension.
 */
const statusbar: JupyterLabPlugin<IStatusBar> = {
  id: 'jupyterlab-statusbar',
  autoStart: true,
  requires: [ISettingRegistry],
  provides: IStatusBar,
  activate: (app: JupyterLab) => {
    return new StatusBar({ host: app.shell })
  }
};

export default statusbar;