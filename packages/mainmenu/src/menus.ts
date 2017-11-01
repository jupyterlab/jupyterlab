// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';

import {
  IMainMenu
} from './mainmenu';


/**
 * An extensible menu for JupyterLab application menus.
 */
export
class JupyterLabMenu extends Menu implements IMainMenu.IJupyterLabMenu {
  /**
   * Add a group of menu items specific to a particular
   * plugin.
   */
  addGroup(items: Menu.IItemOptions[], options: IMainMenu.IAddOptions): void {
  }
}


/**
 * An extensible FileMenu for the application.
 */
export
class FileMenu extends Menu implements IMainMenu.IFileMenu {
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

/**
 * An extensible Help menu for the application.
 */
export
class HelpMenu extends JupyterLabMenu implements IMainMenu.IHelpMenu {
  /**
   * Construct the help menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Help';
  }
}

/**
 * An extensible Edit menu for the application.
 */
export
class EditMenu extends JupyterLabMenu implements IMainMenu.IEditMenu {
  /**
   * Construct the edit menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Edit';
  }
}

/**
 * An extensible Run menu for the application.
 */
export
class RunMenu extends JupyterLabMenu implements IMainMenu.IRunMenu {
  /**
   * Construct the run menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Run';
  }
}
/**
 * An extensible Kernel menu for the application.
 */
export
class KernelMenu extends JupyterLabMenu implements IMainMenu.IKernelMenu {
  /**
   * Construct the kernel menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Kernel';
  }
}
/**
 * An extensible View menu for the application.
 */
export
class ViewMenu extends JupyterLabMenu implements IMainMenu.IViewMenu {
  /**
   * Construct the view menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'View';
  }
}
