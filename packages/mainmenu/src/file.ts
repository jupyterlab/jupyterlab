// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, JupyterLabMenu
} from './labmenu';

/**
 * An interface for a File menu.
 */
export
interface IFileMenu extends IJupyterLabMenu {
  /**
   * A submenu for creating new files/launching new activities.
   */
  readonly newMenu: Menu;
}

/**
 * An extensible FileMenu for the application.
 */
export
class FileMenu extends JupyterLabMenu implements IFileMenu {
  constructor(options: Menu.IOptions) {
    super(options);

    this.title.label = 'File';

    // Create the "New" submenu.
    this.newMenu = new Menu(options);
    this.newMenu.title.label = 'New';
    this.addItem({
      type: 'submenu',
      submenu: this.newMenu
    });
  }

  /**
   * The New submenu.
   */
  readonly newMenu: Menu;
}
