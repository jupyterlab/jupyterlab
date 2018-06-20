import {
  JupyterLab, JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  Token
} from '@phosphor/coreutils';

import { ISettingRegistry } from '@jupyterlab/coreutils';

export
interface IStatusBar {

}

export
interface IStatusItem {

}

export
class StatusBar implements IStatusBar {
  constructor(options: StatusBar.IOptions) {

  }
}

export
namespace StatusBar {

  /**
   * Options for creating a new StatusBar instance
   */
  export
  interface IOptions {

  }
}


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
    return new StatusBar({ })
  }
};

export default statusbar;
