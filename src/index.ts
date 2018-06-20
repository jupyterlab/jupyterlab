import {
  JupyterLab, JupyterLabPlugin,
} from '@jupyterlab/application';

import {
  Token
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import { ISettingRegistry } from '@jupyterlab/coreutils';

const STATUSBAR_ITEM_CLASS = 'jp-Statusbar-item';

export
interface IStatusBar {

}

export
class StatusBar extends Widget implements IStatusBar {
  constructor(options: StatusBar.IOptions) {
    super();
  }
}

export
abstract class StatusBarItem extends Widget {
  constructor(/*params*/)
  {
    super({node: document.createElement('statusbutton')})
    

  }
}

export
class ManagedStatusBarItem extends StatusBarItem {
  /*construct ManagedStatusBarItem*/
  constructor(options: ManagedStatusBarItem.IOptions = {}){
    super();
  }
  /*add something to handle event?*/


}

export
namespace ManagedStatusBarItem{
  export
  interface IOptions{
      color?: string;
      icon?: string;
      text?: string;
      commandId?: string;
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