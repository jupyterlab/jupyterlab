// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  indexOf, upperBound
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

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the jupyter icon from the default theme.
 */
const JUPYTER_ICON_CLASS = 'jp-JupyterIcon';


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
class MainMenu implements IMainMenu {
  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(menu: Menu, options: IAddMenuOptions = {}): void {
    if (indexOf(Private.menuBar.menus, menu) > -1) {
      return;
    }

    let rank = 'rank' in options ? options.rank : 100;
    let rankItem = { menu, rank };
    let index = upperBound(this._items, rankItem, Private.itemCmp);

    // Upon disposal, remove the menu reference from the rank list.
    menu.disposed.connect(() => this._items.remove(rankItem));

    this._items.insert(index, rankItem);
    Private.menuBar.insertMenu(index, menu);
  }

  private _items = new Vector<Private.IRankItem>();
}


/**
 * A service providing an interface to the main menu.
 */
export
const mainMenuProvider: JupyterLabPlugin<IMainMenu> = {
  id: 'jupyter.services.main-menu',
  provides: IMainMenu,
  activate: activateMainMenu
};


/**
 * Activate the main menu extension.
 */
function activateMainMenu(app: JupyterLab): IMainMenu {
  Private.menuBar = new MenuBar({ keymap: app.keymap });
  Private.menuBar.id = 'jp-MainMenu';

  let logo = new Widget();
  logo.node.className = `${PORTRAIT_ICON_CLASS} ${JUPYTER_ICON_CLASS}`;
  logo.id = 'jp-MainLogo';

  app.shell.addToTopArea(logo);
  app.shell.addToTopArea(Private.menuBar);

  return Private.mainMenu;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The singleton menu bar instance.
   */
  export
  let menuBar: MenuBar;

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
