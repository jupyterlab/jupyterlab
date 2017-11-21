// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  ArrayExt
} from '@phosphor/algorithm';

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
interface IJupyterLabMenu extends Menu {
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
class JupyterLabMenu extends Menu implements IJupyterLabMenu {
  /**
   * Create a new menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
  }

  /**
   * Add a group of menu items specific to a particular
   * plugin.
   */
  addGroup(items: Menu.IItemOptions[], rank?: number): void {
    const rankGroup = { items, rank: rank === undefined ? 100 : rank };

    // Insert the plugin group into the list of groups.
    const groupIndex = ArrayExt.upperBound(this._groups, rankGroup, Private.itemCmp);

    // Determine whether we need separators before or after the group.
    let shouldPrependSeparator = groupIndex > 0 ||
                                 (groupIndex === 0 && this.startIndex > 0);
    let shouldAppendSeparator = groupIndex === 0 && this._groups.length > 0;

    // Determine the index of the menu at which to insert the group.
    let insertIndex = this.startIndex;
    for (let i = 0; i < groupIndex; ++i) {
      if (this._groups.length > 0) {
        // Increase the insert index by one extra in order
        // to include the separator.
        insertIndex += this._groups[i].items.length + 1;
      }
    }

    // Insert a separator if necessary.
    if (shouldPrependSeparator) {
      this.insertItem(insertIndex++, { type: 'separator' });
    }
    // Insert the group.
    for (let item of items) {
      this.insertItem(insertIndex++, item);
    }
    // Insert a separator if necessary.
    if (shouldAppendSeparator) {
      this.insertItem(insertIndex++, { type: 'separator' });
    }

    ArrayExt.insert(this._groups, groupIndex, rankGroup);
  }

  /**
   * The menu index at which plugin groups begin to be inserted.
   * A menu may define a few initial items, and then all additional
   * plugin groups will be inserted at `startIndex`.
   */
  get startIndex(): number {
    return this._startIndex;
  }
  set startIndex(value: number) {
    this._startIndex = value;
  }

  private _groups: Private.IRankGroup[] = [];
  private _startIndex = 0;
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
