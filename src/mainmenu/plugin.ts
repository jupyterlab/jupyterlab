// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as arrays
  from 'phosphor-arrays';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  MenuItem, MenuBar
} from 'phosphor-menus';


/**
 * The main menu extension.
 *
 * #### Notes
 * The main menu extension adds a menu bar to the top area
 * of the application shell.
 *
 */
export
const mainMenuExtension = {
  id: 'jupyter.extensions.mainMenu',
  activate: activateMainMenu
};


/**
 * A service providing an interface to the main menu.
 */
export
const mainMenuProvider = {
  id: 'jupyter.services.mainMenu',
  provides: MainMenu,
  resolve: () => {
    return Private.mainMenu;
  }
};


/**
 * Activate the main menu extension.
 */
function activateMainMenu(app: Application): void {
  Private.menuBar.id = 'jp-MainMenu';
  app.shell.addToTopArea(Private.menuBar);
}


/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export
class MainMenu {
  /**
   * Add a new menu to the main menu.
   */
  addMenu(menu: MenuItem, options: MainMenu.IAddMenuOptions = {}): void {
    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { menu, rank };
    let index = arrays.upperBound(this._items, rankItem, Private.itemCmp);
    arrays.insert(this._items, index, rankItem);
    let items = Private.menuBar.items.slice();
    arrays.insert(items, index, menu);
    Private.menuBar.items = items;
  }

  private _items: Private.IRankItem[] = [];
}


/**
 * A namespace for MainMenu statics.
 */
export
namespace MainMenu {
  /**
   * The options used to add a menu to the main menu.
   */
  export
  interface IAddMenuOptions {
    /**
     * The rank order of the menu among its siblings.
     */
    rank?: number;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The singleton menu bar instance.
   */
  export
  const menuBar = new MenuBar();

  /**
   * The singleton main menu instance.
   */
  export
  const mainMenu = new MainMenu();


  /**
   * An object which holds a menu and its sort rank.
   */
  export
  interface IRankItem {
    /**
     * The menu for the item.
     */
    menu: MenuItem;

    /**
     * The sort rank of the menu.
     */
    rank: number;
  }

  /**
   * A less-than comparison function for menu rank items.
   */
  export
  function itemCmp(first: IRankItem, second: IRankItem): boolean {
    return first.rank < second.rank;
  }
}
