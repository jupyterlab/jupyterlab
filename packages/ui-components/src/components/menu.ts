// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/* global WeakRef */

import { ArrayExt } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { VirtualElement } from '@lumino/virtualdom';
import { Menu } from '@lumino/widgets';

/**
 * Interface for disposable item menu
 */
export interface IDisposableMenuItem extends IDisposable, Menu.IItem {}

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
   *
   * The rank can be set for all items in the group using the
   * function argument or per item.
   *
   * @param items - the list of menu items to add.
   * @param rank - the default rank in the menu in which to insert the group.
   * @returns Disposable of the group
   */
  addGroup(items: Menu.IItemOptions[], rank?: number): IDisposable;

  /**
   * Add a menu item to the end of the menu.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The disposable menu item added to the menu.
   */
  addItem(options: IRankedMenu.IItemOptions): IDisposable;

  /**
   * A read-only array of the menu items in the menu.
   */
  readonly items: ReadonlyArray<Menu.IItem>;

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
     * Whether to include separators between the
     *   groups that are added to the menu.
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
   * @param options - Options for the lumino menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this.addClass('jp-ThemedContainer');
    this._rank = options.rank;
    this._includeSeparators = options.includeSeparators ?? true;
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
   * @param rank - the default rank in the menu in which to insert the group.
   * @returns Disposable of the group
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
    const added: IDisposableMenuItem[] = [];

    // Insert a separator before the group.
    // Lumino takes care of superfluous leading,
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
      added.forEach(i => i.dispose());
    });
  }

  /**
   * Add a menu item to the end of the menu.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   */
  addItem(options: IRankedMenu.IItemOptions): IDisposableMenuItem {
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
  insertItem(
    index: number,
    options: IRankedMenu.IItemOptions
  ): IDisposableMenuItem {
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
    const item = super.insertItem(clampedIndex, options);
    return new DisposableMenuItem(item, this);
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

/**
 * Disposable Menu Item
 */
class DisposableMenuItem implements IDisposableMenuItem {
  /**
   * Create a disposable menu item from an item and the menu it belongs to
   *
   * @param item Menu item
   * @param menu Menu
   */
  constructor(item: Menu.IItem, menu: Menu) {
    this._item = new WeakRef(item);
    this._menu = menu;

    // dispose this item if the parent menu is disposed
    const dispose = (menu: Menu): void => {
      menu.disposed.disconnect(dispose, this);
      this.dispose();
    };
    this._menu.disposed.connect(dispose, this);
  }

  /**
   * Whether the menu item is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The type of the menu item.
   */
  get type(): Menu.ItemType {
    return this._item.deref()!.type;
  }

  /**
   * The command to execute when the item is triggered.
   */
  get command(): string {
    return this._item.deref()!.command;
  }

  /**
   * The arguments for the command.
   */
  get args(): ReadonlyJSONObject {
    return this._item.deref()!.args;
  }

  /**
   * The submenu for a `'submenu'` type item.
   */
  get submenu(): Menu | null {
    return this._item.deref()!.submenu;
  }

  /**
   * The display label for the menu item.
   */
  get label(): string {
    return this._item.deref()!.label;
  }

  /**
   * The mnemonic index for the menu item.
   */
  get mnemonic(): number {
    return this._item.deref()!.mnemonic;
  }

  /**
   * The icon renderer for the menu item.
   */
  get icon(): VirtualElement.IRenderer | undefined {
    return this._item.deref()!.icon;
  }

  /**
   * The icon class for the menu item.
   */
  get iconClass(): string {
    return this._item.deref()!.iconClass;
  }

  /**
   * The icon label for the menu item.
   */
  get iconLabel(): string {
    return this._item.deref()!.iconLabel;
  }

  /**
   * The display caption for the menu item.
   */
  get caption(): string {
    return this._item.deref()!.caption;
  }

  /**
   * The extra class name for the menu item.
   */
  get className(): string {
    return this._item.deref()!.className;
  }

  /**
   * The dataset for the menu item.
   */
  get dataset(): CommandRegistry.Dataset {
    return this._item.deref()!.dataset;
  }

  /**
   * Whether the menu item is enabled.
   */
  get isEnabled(): boolean {
    return this._item.deref()!.isEnabled;
  }

  /**
   * Whether the menu item is toggled.
   */
  get isToggled(): boolean {
    return this._item.deref()!.isToggled;
  }

  /**
   * Whether the menu item is visible.
   */
  get isVisible(): boolean {
    return this._item.deref()!.isVisible;
  }

  /**
   * The key binding for the menu item.
   */
  get keyBinding(): CommandRegistry.IKeyBinding | null {
    return this._item.deref()!.keyBinding;
  }

  /**
   * Dispose the menu item by removing it from its menu.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    const item = this._item.deref();
    if (item && !this._menu.isDisposed) {
      this._menu.removeItem(item);
    }
    Signal.clearData(this);
  }

  private _isDisposed: boolean;
  private _item: WeakRef<Menu.IItem>;
  private _menu: Menu;
}
