// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/application';

import {
  Menu
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
