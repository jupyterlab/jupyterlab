// Local CSS must be loaded prior to loading other libs.
import '../style/index.css';

import {
  JupyterLab, JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  Token
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  StatusBar
} from './statusbar';

export
interface IStatusBar {
  listItems(): string[];
  hasItem(id: string): boolean;

  registerStatusItem(id: string, widget: Widget, opts: IStatusBar.IStatusItemOptions): void;
}

export
namespace IStatusBar {

  export
  type Alignment = 'right' | 'left';

  export
  interface IStatusItemOptions {
    align?: IStatusBar.Alignment;
    priority?: number;
  }
}


export
// tslint:disable-next-line:variable-name
const IStatusBar = new Token<IStatusBar>('jupyterlab-statusbar:statusbar');

/**
 * Initialization data for the statusbar extension.
 */
const statusbar: JupyterLabPlugin<IStatusBar> = {
  id: 'jupyterlab-statusbar',
  autoStart: true,
  requires: [],
  provides: IStatusBar,
  activate: (app: JupyterLab) => {
    return new StatusBar({ host: app.shell });
  }
};

export default statusbar;
