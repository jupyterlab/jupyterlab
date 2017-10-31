// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';


/**
 * An extensible FileMenu for the application.
 */
export
class FileMenu extends Menu {
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

    // Create the rest of the  top-level File menu
    [
      'docmanager:save',
      'docmanager:save-as',
      'docmanager:rename',
      'docmanager:restore-checkpoint',
      'docmanager:clone',
      'docmanager:close',
      'docmanager:close-all-files'
    ].forEach(command => { this.addItem({ command }); });
    this.addItem({ type: 'separator' });
    this.addItem({ command: 'settingeditor:open' });
  }

  /**
   * The New submenu
   */
  readonly newMenu: Menu;
}
