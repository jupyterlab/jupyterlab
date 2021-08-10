// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Menu } from '@lumino/widgets';

/**
 * A common interface for extensible JupyterLab application menus.
 *
 * Plugins are still free to define their own menus in any way
 * they like. However, JupyterLab defines a few top-level
 * application menus that may be extended by plugins as well,
 * such as "Edit" and "View"
 */
export interface IRankedMenu extends IDisposable {
  /**
   * Add a group of menu items specific to a particular
   * plugin.
   */
  addGroup(items: Menu.IItemOptions[], rank?: number): IDisposable;

  /**
   * Add a menu item to the end of the menu.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   */
  addItem(options: IRankedMenu.IItemOptions): Menu.IItem;

  /**
   * A read-only array of the menu items in the menu.
   */
  readonly items: ReadonlyArray<Menu.IItem>;

  /**
   * The underlying Lumino menu.
   *
   * @deprecated since v3.1
   * RankMenu inherits from Menu since v3.1
   */
  readonly menu: Menu;

  /**
   * Menu rank
   */
  readonly rank?: number;
}

/**
 * Namespace for JupyterLabMenu interfaces
 */
export namespace IRankedMenu {
  /**
   * Default menu item rank
   */
  export const DEFAULT_RANK = 100;

  /**
   * An options object for creating a menu item.
   */
  export interface IItemOptions extends Menu.IItemOptions {
    /**
     * Menu item rank
     */
    rank?: number;
  }

  /**
   * An options object for creating a JupyterLab menu.
   */
  export interface IOptions extends Menu.IOptions {
    /**
     *
     * Default: true
     */
    includeSeparators?: boolean;
    /**
     * Menu rank
     */
    rank?: number;
  }
}

/**
 * An extensible menu for JupyterLab application menus.
 */
export class RankedMenu extends Menu implements IRankedMenu {
  /**
   * Construct a new menu.
   *
   * @param options - Options for the phosphor menu.
   *
   * @param includeSeparators - whether to include separators between the
   *   groups that are added to the menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this._rank = options.rank;
    this._includeSeparators = options.includeSeparators ?? true;
  }

  /**
   * The underlying Lumino menu.
   *
   * @deprecated since v3.1
   * RankMenu inherits from Menu since v3.1
   */
  get menu(): Menu {
    return this;
  }

  /**
   * Menu rank.
   */
  get rank(): number | undefined {
    return this._rank;
  }

  /**
   * Add a group of menu items specific to a particular
   * plugin.
   *
   * The rank can be set for all items in the group using the
   * function argument or per item.
   *
   * @param items - the list of menu items to add.
   *
   * @param rank - the default rank in the menu in which to insert the group.
   */
  addGroup(items: IRankedMenu.IItemOptions[], rank?: number): IDisposable {
    if (items.length === 0) {
      return new DisposableDelegate(() => void 0);
    }
    const defaultRank = rank ?? IRankedMenu.DEFAULT_RANK;

    const sortedItems = items
      .map(item => {
        return { ...item, rank: item.rank ?? defaultRank };
      })
      .sort((a, b) => a.rank - b.rank);

    // Insert the plugin group into the menu.
    let insertIndex = this._ranks.findIndex(rank => sortedItems[0].rank < rank);
    if (insertIndex < 0) {
      insertIndex = this._ranks.length; // Insert at the end of the menu
    }

    // Keep an array of the menu items that have been created.
    const added: Menu.IItem[] = [];

    // Insert a separator before the group.
    // Phosphor takes care of superfluous leading,
    // trailing, and duplicate separators.
    if (this._includeSeparators) {
      added.push(
        this.insertItem(insertIndex++, { type: 'separator', rank: defaultRank })
      );
    }
    // Insert the group.
    added.push(
      ...sortedItems.map(item => {
        return this.insertItem(insertIndex++, item);
      })
    );

    // Insert a separator after the group.
    if (this._includeSeparators) {
      added.push(
        this.insertItem(insertIndex++, { type: 'separator', rank: defaultRank })
      );
    }

    return new DisposableDelegate(() => {
      added.forEach(i => this.removeItem(i));
    });
  }

  /**
   * Add a menu item to the end of the menu.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   */
  addItem(options: IRankedMenu.IItemOptions): Menu.IItem {
    let insertIndex = -1;

    if (options.rank) {
      insertIndex = this._ranks.findIndex(rank => options.rank! < rank);
    }
    if (insertIndex < 0) {
      insertIndex = this._ranks.length; // Insert at the end of the menu
    }

    return this.insertItem(insertIndex, options);
  }

  /**
   * Remove all menu items from the menu.
   */
  clearItems(): void {
    this._ranks.length = 0;
    super.clearItems();
  }

  /**
   * Dispose of the resources held by the menu.
   */
  dispose(): void {
    this._ranks.length = 0;
    super.dispose();
  }

  /**
   * Get the rank of the item at index.
   *
   * @param index Item index.
   * @returns Rank of the item.
   */
  getRankAt(index: number): number {
    return this._ranks[index];
  }

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
  insertItem(index: number, options: IRankedMenu.IItemOptions): Menu.IItem {
    const clampedIndex = Math.max(0, Math.min(index, this._ranks.length));
    ArrayExt.insert(
      this._ranks,
      clampedIndex,
      options.rank ??
        Math.max(
          IRankedMenu.DEFAULT_RANK,
          this._ranks[this._ranks.length - 1] ?? IRankedMenu.DEFAULT_RANK
        )
    );
    return super.insertItem(clampedIndex, options);
  }

  /**
   * Remove the item at a given index from the menu.
   *
   * @param index - The index of the item to remove.
   *
   * #### Notes
   * This is a no-op if the index is out of range.
   */
  removeItemAt(index: number): void {
    ArrayExt.removeAt(this._ranks, index);
    super.removeItemAt(index);
  }

  private _includeSeparators: boolean;
  private _rank: number | undefined;
  private _ranks: number[] = [];
}
