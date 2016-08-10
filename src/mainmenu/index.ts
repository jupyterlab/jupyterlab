// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  find, indexOf, upperBound
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  MenuBar
} from 'phosphor/lib/ui/menubar';


/* tslint:disable */
/**
 * The main menu token.
 */
export
const IMainMenu = new Token<IMainMenu>('jupyter.services.main-menu');
/* tslint:enable */


/**
 * The main menu interface.
 */
export
interface IMainMenu {
  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(menu: Menu, options: IAddMenuOptions): void;
}


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


/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export
class MainMenu extends MenuBar implements IMainMenu {
  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(menu: Menu, options: IAddMenuOptions = {}): void {
    if (indexOf(this.menus, menu) > -1) {
      return;
    }

    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { menu, rank };
    let index = upperBound(this._items, rankItem, Private.itemCmp);

    // Upon disposal, remove the menu reference from the rank list.
    menu.disposed.connect(() => this._items.remove(rankItem));

    this._items.insert(index, rankItem);
    this.insertMenu(index, menu);
  }

  private _items = new Vector<Private.IRankItem>();
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
