// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  Menu, MenuBar
} from '@phosphor/widgets';


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
  addMenu(menu: Menu, options?: IMainMenu.IAddOptions): void;
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

