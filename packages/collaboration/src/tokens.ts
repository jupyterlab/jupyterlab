// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu } from '@lumino/widgets';
import { Token } from '@lumino/coreutils';
import { Awareness } from 'y-protocols/awareness';

/**
 * The user menu token.
 *
 * NOTE: Require this token in your extension to access the user menu
 * (top-right menu in JupyterLab's interface).
 */
export const IUserMenu = new Token<IUserMenu>(
  '@jupyterlab/collaboration:IUserMenu'
);

/**
 * The global awareness token.
 */
export const IGlobalAwareness = new Token<IAwareness>(
  '@jupyterlab/collaboration:IGlobalAwareness'
);

/**
 * The awareness interface.
 */
export interface IAwareness extends Awareness {}

/**
 * An interface describing the user menu.
 */
export interface IUserMenu {
  /**
   * Dispose of the resources held by the menu.
   */
  dispose(): void;

  /**
   * Test whether the widget has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * A read-only array of the menu items in the menu.
   */
  readonly items: ReadonlyArray<Menu.IItem>;

  /**
   * Add a menu item to the end of the menu.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   */
  addItem(options: Menu.IItemOptions): Menu.IItem;

  /**
   * Insert a menu item into the menu at the specified index.
   *
   * @param index - The index at which to insert the item.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   *
   * #### Notes
   * The index will be clamped to the bounds of the items.
   */
  insertItem(index: number, options: Menu.IItemOptions): Menu.IItem;

  /**
   * Remove an item from the menu.
   *
   * @param item - The item to remove from the menu.
   *
   * #### Notes
   * This is a no-op if the item is not in the menu.
   */
  removeItem(item: Menu.IItem): void;
}
