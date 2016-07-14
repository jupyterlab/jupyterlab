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

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the jupyter icon from the default theme.
 */
const JUPYTER_ICON_CLASS = 'jp-JupyterIcon';



/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export
class MainMenu {
  /**
   * Add a new menu item to the main menu.
   */
  addItem(item: MenuItem, options: MainMenu.IAddMenuOptions = {}): void {
    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { item, rank };
    let index = arrays.upperBound(this._items, rankItem, Private.itemCmp);
    arrays.insert(this._items, index, rankItem);
    let items = Private.menuBar.items.slice();
    arrays.insert(items, index, item);
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
  let logo = new Widget();
  logo.node.className = `${PORTRAIT_ICON_CLASS} ${JUPYTER_ICON_CLASS}`;
  logo.id = 'jp-MainLogo';
  app.shell.addToTopArea(logo);
  app.shell.addToTopArea(Private.menuBar);
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
    item: MenuItem;

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
