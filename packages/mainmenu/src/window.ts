// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, JupyterLabMenu
} from './labmenu';

/**
 * An interface for a Window menu.
 */
export
interface IWindowMenu extends IJupyterLabMenu {
}

/**
 * An extensible Window menu for the application.
 */
export
class WindowMenu extends JupyterLabMenu implements IWindowMenu {
  /**
   * Construct the window menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.menu.title.label = 'Window';
  }
}
