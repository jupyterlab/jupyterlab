// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Token
} from '@phosphor/coreutils';

import {
  Menu, MenuBar
} from '@phosphor/widgets';

import {
  IFileMenu, FileMenu
} from './file';

import {
  IEditMenu, EditMenu
} from './edit';

import {
  IHelpMenu, HelpMenu
} from './help';

import {
  IKernelMenu, KernelMenu
} from './kernel';

import {
  IRunMenu, RunMenu
} from './run';

import {
  IViewMenu, ViewMenu
} from './view';



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
  readonly fileMenu: IFileMenu;

  /**
   * The application "Edit" menu.
   */
  readonly editMenu: IEditMenu;

  /**
   * The application "View" menu.
   */
  readonly viewMenu: IViewMenu;

  /**
   * The application "Help" menu.
   */
  readonly helpMenu: IHelpMenu;

  /**
   * The application "Kernel" menu.
   */
  readonly kernelMenu: IKernelMenu;

  /**
   * The application "Run" menu.
   */
  readonly runMenu: IRunMenu;
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

}

/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export
class MainMenu extends MenuBar implements IMainMenu {
  /**
   * Construct the main menu bar.
   */
  constructor(commands: CommandRegistry) {
    super();
    this.editMenu = new EditMenu({ commands });
    this.fileMenu = new FileMenu({ commands });
    this.helpMenu = new HelpMenu({ commands });
    this.kernelMenu = new KernelMenu({ commands });
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

