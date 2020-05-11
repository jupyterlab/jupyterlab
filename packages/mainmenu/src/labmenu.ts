// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';

import { ArrayExt } from '@lumino/algorithm';

import { DisposableDelegate, IDisposable } from '@lumino/disposable';

import { Menu, Widget } from '@lumino/widgets';

/**
 * A common interface for extensible JupyterLab application menus.
 *
 * Plugins are still free to define their own menus in any way
 * they like. However, JupyterLab defines a few top-level
 * application menus that may be extended by plugins as well,
 * such as "Edit" and "View"
 */
export interface IJupyterLabMenu extends IDisposable {
  /**
   * Add a group of menu items specific to a particular
   * plugin.
   */
  addGroup(items: Menu.IItemOptions[], rank?: number): IDisposable;
}

/**
 * A base interface for a consumer of one of the menu
 * semantic extension points. The IMenuExtender gives
 * a widget tracker which is checked when the menu
 * is deciding which IMenuExtender to delegate to upon
 * selection of the menu item.
 */
export interface IMenuExtender<T extends Widget> {
  /**
   * A widget tracker for identifying the appropriate extender.
   */
  tracker: IWidgetTracker<T>;

  /**
   * An additional function that determines whether the extender
   * is enabled. By default it is considered enabled if the application
   * active widget is contained in the `tracker`. If this is also
   * provided, the criterion is equivalent to
   * `tracker.has(widget) && extender.isEnabled(widget)`
   */
  isEnabled?: (widget: T) => boolean;
}

/**
 * An extensible menu for JupyterLab application menus.
 */
export class JupyterLabMenu implements IJupyterLabMenu {
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
  addGroup(items: Menu.IItemOptions[], rank?: number): IDisposable {
    const rankGroup = {
      size: items.length,
      rank: rank === undefined ? 100 : rank
    };

    // Insert the plugin group into the list of groups.
    const groupIndex = ArrayExt.upperBound(
      this._groups,
      rankGroup,
      Private.itemCmp
    );

    // Determine the index of the menu at which to insert the group.
    let insertIndex = 0;
    for (let i = 0; i < groupIndex; ++i) {
      if (this._groups[i].size > 0) {
        insertIndex += this._groups[i].size;
        // Increase the insert index by two extra in order
        // to include the leading and trailing separators.
        insertIndex += this._includeSeparators ? 2 : 0;
      }
    }

    // Keep an array of the menu items that have been created.
    const added: Menu.IItem[] = [];

    // Insert a separator before the group.
    // Phosphor takes care of superfluous leading,
    // trailing, and duplicate separators.
    if (this._includeSeparators) {
      added.push(this.menu.insertItem(insertIndex++, { type: 'separator' }));
    }
    // Insert the group.
    for (const item of items) {
      added.push(this.menu.insertItem(insertIndex++, item));
    }
    // Insert a separator after the group.
    if (this._includeSeparators) {
      added.push(this.menu.insertItem(insertIndex++, { type: 'separator' }));
    }

    ArrayExt.insert(this._groups, groupIndex, rankGroup);

    return new DisposableDelegate(() => {
      added.forEach(i => this.menu.removeItem(i));
      this._groups.splice(groupIndex, 1);
    });
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
  export interface IRankGroup {
    /**
     * The number of items in the menu grouping.
     */
    size: number;

    /**
     * The sort rank of the group.
     */
    rank: number;
  }

  /**
   * A comparator function for menu rank items.
   */
  export function itemCmp(first: IRankGroup, second: IRankGroup): number {
    return first.rank - second.rank;
  }
}
