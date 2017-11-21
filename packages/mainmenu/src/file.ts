// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, IMenuExtender, JupyterLabMenu
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

  /**
   * The close and cleanup extension point.
   */
  readonly closeAndCleaners: Map<string, IFileMenu.ICloseAndCleaner<Widget>>;
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

    this.closeAndCleaners =
      new Map<string, IFileMenu.ICloseAndCleaner<Widget>>();
  }

  /**
   * The New submenu.
   */
  readonly newMenu: Menu;

  /**
   * The close and cleanup extension point.
   */
  readonly closeAndCleaners: Map<string, IFileMenu.ICloseAndCleaner<Widget>>;
}


/**
 * Namespace for IFileMenu
 */
export
namespace IFileMenu {
  /**
   * Interface for an activity that has some cleanup action associated
   * with it in addition to merely closing its widget in the main area.
   */
  export
  interface ICloseAndCleaner<T extends Widget> extends IMenuExtender<T> {
    /**
     * A label to use for the cleanup action.
     */
    action: string;

    /**
     * A function to perform the close and cleanup action.
     */
    closeAndCleanup: (widget: T) => Promise<void>;
  }
}
