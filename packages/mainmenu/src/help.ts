// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, JupyterLabMenu
} from './labmenu';

/**
 * An interface for a Run menu.
 */
export
interface IHelpMenu extends IJupyterLabMenu {
}

/**
 * An extensible Help menu for the application.
 */
export
class HelpMenu extends JupyterLabMenu implements IHelpMenu {
  /**
   * Construct the help menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Help';
  }
}
