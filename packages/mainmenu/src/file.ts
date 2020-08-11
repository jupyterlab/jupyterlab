// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu, Widget } from '@lumino/widgets';

import { IJupyterLabMenu, IMenuExtender, JupyterLabMenu } from './labmenu';

/**
 * An interface for a File menu.
 */
export interface IFileMenu extends IJupyterLabMenu {
  /**
   * Option to add a `Quit` entry in the File menu
   */
  quitEntry: boolean;

  /**
   * A submenu for creating new files/launching new activities.
   */
  readonly newMenu: IJupyterLabMenu;

  /**
   * The close and cleanup extension point.
   */
  readonly closeAndCleaners: Set<IFileMenu.ICloseAndCleaner<Widget>>;

  /**
   * A set storing IConsoleCreators for the File menu.
   */
  readonly consoleCreators: Set<IFileMenu.IConsoleCreator<Widget>>;
}

/**
 * An extensible FileMenu for the application.
 */
export class FileMenu extends JupyterLabMenu implements IFileMenu {
  constructor(options: Menu.IOptions) {
    super(options);
    this.quitEntry = false;

    // Create the "New" submenu.
    this.newMenu = new JupyterLabMenu(options, false);
    this.closeAndCleaners = new Set<IFileMenu.ICloseAndCleaner<Widget>>();
    this.consoleCreators = new Set<IFileMenu.IConsoleCreator<Widget>>();
  }

  /**
   * The New submenu.
   */
  readonly newMenu: JupyterLabMenu;

  /**
   * The close and cleanup extension point.
   */
  readonly closeAndCleaners: Set<IFileMenu.ICloseAndCleaner<Widget>>;

  /**
   * A set storing IConsoleCreators for the Kernel menu.
   */
  readonly consoleCreators: Set<IFileMenu.IConsoleCreator<Widget>>;

  /**
   * Dispose of the resources held by the file menu.
   */
  dispose(): void {
    this.newMenu.dispose();
    this.consoleCreators.clear();
    super.dispose();
  }

  /**
   * Option to add a `Quit` entry in File menu
   */
  public quitEntry: boolean;
}

/**
 * Namespace for IFileMenu
 */
export namespace IFileMenu {
  /**
   * Interface for an activity that has some cleanup action associated
   * with it in addition to merely closing its widget in the main area.
   */
  export interface ICloseAndCleaner<T extends Widget> extends IMenuExtender<T> {
    /**
     * A function to create the label for the `closeAndCleanup`action.
     *
     * This function receives the number of items `n` to be able to provided
     * correct pluralized forms of tranlsations.
     */
    closeAndCleanupLabel?: (n: number) => string;

    /**
     * A function to perform the close and cleanup action.
     */
    closeAndCleanup: (widget: T) => Promise<void>;
  }

  /**
   * Interface for a command to create a console for an activity.
   */
  export interface IConsoleCreator<T extends Widget> extends IMenuExtender<T> {
    /**
     * A function to create the label for the `createConsole`action.
     *
     * This function receives the number of items `n` to be able to provided
     * correct pluralized forms of tranlsations.
     */
    createConsoleLabel?: (n: number) => string;

    /**
     * The function to create the console.
     */
    createConsole: (widget: T) => Promise<void>;
  }
}
