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
  ManagedStatusItem, StatusItem
} from './statusitems';

export { ManagedStatusItem, StatusItem };


export
interface IStatusBar {
  listStatusItems(): string[];
  hasStatusItem(id: string): boolean;

  createManagedStatusItem(id: string): ManagedStatusItem;
  registerStatusItem(id: string, widget: StatusItem): void;
}

import { ISettingRegistry } from '@jupyterlab/coreutils';


export
// tslint:disable-next-line:variable-name
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
