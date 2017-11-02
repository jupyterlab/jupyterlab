// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab
} from '@jupyterlab/application';

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  Kernel
} from '@jupyterlab/services';

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  Menu, MenuBar, Widget
} from '@phosphor/widgets';

import {
  EditMenu, FileMenu, HelpMenu, KernelMenu, RunMenu, ViewMenu
} from './menus';


/* tslint:disable */
/**
 * The main menu token.
 */
export
const IMainMenu = new Token<IMainMenu>('@jupyterlab/apputils:IMainMenu');
/* tslint:enable */


/**
 * The main menu interface.
 */
export
interface IMainMenu {
  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(menu: Menu, options?: IMainMenu.IAddOptions): void;

  /**
   * The application "File" menu.
   */
  readonly fileMenu: IMainMenu.IFileMenu;

  /**
   * The application "Edit" menu.
   */
  readonly editMenu: IMainMenu.IEditMenu;

  /**
   * The application "View" menu.
   */
  readonly viewMenu: IMainMenu.IViewMenu;

  /**
   * The application "Help" menu.
   */
  readonly helpMenu: IMainMenu.IHelpMenu;

  /**
   * The application "Kernel" menu.
   */
  readonly kernelMenu: IMainMenu.IKernelMenu;

  /**
   * The application "Run" menu.
   */
  readonly runMenu: IMainMenu.IRunMenu;
}


/**
 * The namespace for IMainMenu attached interfaces.
 */
export
namespace IMainMenu {
  /**
   * The options used to add a menu to the main menu.
   */
  export
  interface IAddOptions {
    /**
     * The rank order of the menu among its siblings.
     */
    rank?: number;
  }

  /**
   * A common interface for extensible JupyterLab application menus.
   *
   * Plugins are still free to define their own menus in any way
   * they like. However, JupyterLab defines a few top-level
   * application menus that may be extended by plugins as well,
   * such as "Edit" and "View"
   */
  export
  interface IJupyterLabMenu extends Menu {
    /**
     * Add a group of menu items specific to a particular
     * plugin.
     */
    addGroup(items: Menu.IItemOptions[], rank?: number): void;
  }

  /**
   * An interface for a File menu.
   */
  export
  interface IFileMenu extends Menu {
    /**
     * A submenu for creating new files/launching new activities.
     */
    readonly newMenu: Menu;
  }

  /**
   * An interface for an Edit menu.
   */
  export
  interface IEditMenu extends IJupyterLabMenu {
  }

  /**
   * An interface for a View menu.
   */
  export
  interface IViewMenu extends IJupyterLabMenu {
  }

  /**
   * An interface for a Help menu.
   */
  export
  interface IHelpMenu extends IJupyterLabMenu {
  }

  /**
   * An interface for a Kernel menu.
   */
  export
  interface IKernelMenu extends IJupyterLabMenu {
    addUser<T extends Widget>(user: IKernelMenu.IKernelUser<T>): void;
  }

  /**
   * Namespace for IKernelMenu
   */
  export
  namespace IKernelMenu {
    /**
     * Interface for a Kernel user to register itself
     * with the IKernelMenu's semantic extension points.
     */
    export
    interface IKernelUser<T extends Widget> {
      /**
       * A widget tracker for identifying the appropriate
       * kernel user.
       */
      tracker: IInstanceTracker<T>;

      /**
       * A function to interrupt the kernel.
       */
      interruptKernel?: (widget: T) => Promise<void>;

      /**
       * A function to restart the kernel.
       */
      restartKernel?: (widget: T) => Promise<Kernel.IKernelConnection>;

      /**
       * A function to change the kernel.
       */
      changeKernel?: (widget: T) => Promise<void>;
    }
  }


  /**
   * An interface for a Run menu.
   */
  export
  interface IRunMenu extends IJupyterLabMenu {
  }
}



/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export
class MainMenu extends MenuBar implements IMainMenu {
  /**
   * Construct the main menu bar.
   */
  constructor(app: JupyterLab) {
    super();
    const commands = app.commands;
    this.editMenu = new EditMenu({ commands });
    this.fileMenu = new FileMenu({ commands });
    this.helpMenu = new HelpMenu({ commands });
    this.kernelMenu = new KernelMenu(app, { commands });
    this.runMenu = new RunMenu({ commands });
    this.viewMenu = new ViewMenu({ commands });

    this.addMenu(this.fileMenu, { rank: 0 });
    this.addMenu(this.editMenu, { rank: 1 });
    this.addMenu(this.runMenu, { rank: 2 });
    this.addMenu(this.kernelMenu, { rank: 3 });
    this.addMenu(this.viewMenu, { rank: 4 });
    this.addMenu(this.helpMenu, { rank: 1000 });
  }

  /**
   * The application "Edit" menu.
   */
  readonly editMenu: EditMenu;

  /**
   * The application "File" menu.
   */
  readonly fileMenu: FileMenu;

  /**
   * The application "Help" menu.
   */
  readonly helpMenu: HelpMenu;

  /**
   * The application "Kernel" menu.
   */
  readonly kernelMenu: KernelMenu;

  /**
   * The application "Run" menu.
   */
  readonly runMenu: RunMenu;

  /**
   * The application "View" menu.
   */
  readonly viewMenu: ViewMenu;


  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(menu: Menu, options: IMainMenu.IAddOptions = {}): void {
    if (ArrayExt.firstIndexOf(this.menus, menu) > -1) {
      return;
    }

    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { menu, rank };
    let index = ArrayExt.upperBound(this._items, rankItem, Private.itemCmp);

    // Upon disposal, remove the menu and its rank reference.
    menu.disposed.connect(this._onMenuDisposed, this);

    ArrayExt.insert(this._items, index, rankItem);
    /**
     * Create a new menu.
     */
    this.insertMenu(index, menu);
  }

  /**
   * Handle the disposal of a menu.
   */
  private _onMenuDisposed(menu: Menu): void {
    this.removeMenu(menu);
    let index = ArrayExt.findFirstIndex(this._items, item => item.menu === menu);
    if (index !== -1) {
      ArrayExt.removeAt(this._items, index);
    }
  }

  private _items: Private.IRankItem[] = [];
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An object which holds a menu and its sort rank.
   */
  export
  interface IRankItem {
    /**
     * The menu for the item.
     */
    menu: Menu;

    /**
     * The sort rank of the menu.
     */
    rank: number;
  }

  /**
   * A comparator function for menu rank items.
   */
  export
  function itemCmp(first: IRankItem, second: IRankItem): number {
    return first.rank - second.rank;
  }
}

