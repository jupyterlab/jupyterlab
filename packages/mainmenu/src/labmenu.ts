// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Menu, Widget
} from '@phosphor/widgets';


/**
 * A common interface for extensible JupyterLab application menus.
 *
 * Plugins are still free to define their own menus in any way
 * they like. However, JupyterLab defines a few top-level
 * application menus that may be extended by plugins as well,
 * such as "Edit" and "View"
 */
export
interface IJupyterLabMenu extends IDisposable {
  /**
   * Add a group of menu items specific to a particular
   * plugin.
   */
  addGroup(items: Menu.IItemOptions[], rank?: number): void;
}

/**
 * A base interface for a consumer of one of the menu
 * semantic extension points. The IMenuExtender gives
 * an instance tracker which is checked when the menu
 * is deciding which IMenuExtender to delegate to upon
 * selection of the menu item.
 */
export
interface IMenuExtender<T extends Widget> {
  /**
   * A widget tracker for identifying the appropriate extender.
   */
  tracker: IInstanceTracker<T>;
}

/**
 * An extensible menu for JupyterLab application menus.
 */
export
class JupyterLabMenu implements IJupyterLabMenu {
  /**
   * Construct a new menu.
   *
   * @param options - Options for the phosphor menu.
   *
   * @param includeSeparators - whether to include separators between the
   *   groups that are added to the menu.
   */
  constructor(options: Menu.IOptions, includeSeparators: boolean = true) {
    this.menu = new Menu(options);
    this._includeSeparators = includeSeparators;
  }

  /**
   * Add a group of menu items specific to a particular
   * plugin.
   *
   * @param items - the list of menu items to add.
   *
   * @param rank - the rank in the menu in which to insert the group.
   */
  addGroup(items: Menu.IItemOptions[], rank?: number): void {
    const rankGroup = { items, rank: rank === undefined ? 100 : rank };

    // Insert the plugin group into the list of groups.
    const groupIndex = ArrayExt.upperBound(this._groups, rankGroup, Private.itemCmp);

    // Determine the index of the menu at which to insert the group.
    let insertIndex = 0;
    for (let i = 0; i < groupIndex; ++i) {
      if (this._groups[i].items.length > 0) {
        insertIndex += this._groups[i].items.length;
        // Increase the insert index by two extra in order
        // to include the leading and trailing separators.
        insertIndex += this._includeSeparators ? 2 : 0;
      }
    }

    // Insert a separator before the group.
    // Phosphor takes care of superfluous leading,
    // trailing, and duplicate separators.
    if (this._includeSeparators) {
      this.menu.insertItem(insertIndex++, { type: 'separator' });
    }
    // Insert the group.
    for (let item of items) {
      this.menu.insertItem(insertIndex++, item);
    }
    // Insert a separator after the group.
    if (this._includeSeparators) {
      this.menu.insertItem(insertIndex++, { type: 'separator' });
    }

    ArrayExt.insert(this._groups, groupIndex, rankGroup);
  }

  /**
   * Remove a group of menu items. These items should have been
   * previously added.
   *
   * @param items - the previously added group to remove.
   */
  removeGroup(items: Menu.IItemOptions[]): void {
    // Get the index within the current groups.
    const index = ArrayExt.findFirstIndex(this._groups,
      (rankGroup) => rankGroup.items === items);
    if (index === -1) { return; }

    // Determine the index within the menu for removal.
    let removeIndex = 0;
    for (let i = 0; i < index; ++i) {
      if (this._groups[i].items.length > 0) {
        removeIndex += this._groups[i].items.length;
        // Increase the insert index by two extra in order
        // to include the leading and trailing separators.
        removeIndex += this._includeSeparators ? 2 : 0;
      }
    }

    // Do the removal
    if (this._includeSeparators) {
      this.menu.removeItemAt(removeIndex); // Leading separator.
    }
    for (let i = 0; i < items.length; ++i) {
      this.menu.removeItemAt(removeIndex);
    }
    if (this._includeSeparators) {
      this.menu.removeItemAt(removeIndex); // Trailing separator.
    }

    // Insert a separator before the group.
    this._groups.splice(index);
  }



  /**
   * The underlying Phosphor menu.
   */
  readonly menu: Menu;

  /**
   * Whether the menu has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the menu.
   */
  dispose(): void {
    this._groups.length = 0;
    this._isDisposed = true;
    this.menu.dispose();
  }

  private _groups: Private.IRankGroup[] = [];
  private _isDisposed = false;
  private _includeSeparators: boolean;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An object which holds a menu and its sort rank.
   */
  export
  interface IRankGroup {
    /**
     * A menu grouping.
     */
    items: Menu.IItemOptions[];

    /**
     * The sort rank of the group.
     */
    rank: number;
  }

  /**
   * A comparator function for menu rank items.
   */
  export
  function itemCmp(first: IRankGroup, second: IRankGroup): number {
    return first.rank - second.rank;
  }
}
