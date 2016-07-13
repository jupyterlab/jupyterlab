// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as arrays
  from 'phosphor-arrays';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  MenuItem, MenuBar
} from 'phosphor-menus';

import {
  Widget
} from 'phosphor-widget';

import {
  Application
} from 'phosphide/lib/core/application';


/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export
class MainMenu extends Widget {
  /**
   * Construct a new main menu widget.
   */
  constructor() {
    super();
    let layout = new PanelLayout();
    this.layout = layout;
    this._menu = new MenuBar();
    layout.addChild(this._menu);
  }

  /**
   * Add a new menu item to the main menu.
   */
  addItem(item: MenuItem, options: MainMenu.IAddMenuOptions = {}): void {
    let bar = this._menu;
    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { item, rank };
    let index = arrays.upperBound(this._items, rankItem, Private.itemCmp);
    arrays.insert(this._items, index, rankItem);
    let items = bar.items.slice();
    arrays.insert(items, index, item);
    bar.items = items;
  }

  private _items: Private.IRankItem[] = [];
  private _menu: MenuBar = null;
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
 * A service providing an interface to the main menu.
 */
export
const mainMenuProvider = {
  id: 'jupyter.services.mainMenu',
  provides: MainMenu,
  resolve: () => {
    return new MainMenu();
  }
};


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
  requires: [MainMenu],
  activate: activateMainMenu
};




/**
 * Activate the main menu extension.
 */
function activateMainMenu(app: Application, menu: MainMenu): void {
  menu.id = 'jp-MainMenu';
  app.shell.addToTopArea(menu);
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
