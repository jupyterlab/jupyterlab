// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IMainMenu
} from './mainmenu';


/**
 * An extensible menu for JupyterLab application menus.
 */
export
class JupyterLabMenu extends Menu implements IMainMenu.IJupyterLabMenu {
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
    ArrayExt.insert(this._groups, groupIndex, rankGroup);

    // Determine the index of the menu at which to insert the group.
    let insertIndex = this.startIndex;
    for (let i = 0; i < groupIndex; ++i) {
      if (this._groups.length > 0) {
        // Increase the insert index by one extra in order
        // to include the separator.
        insertIndex += this._groups.length + 1;
      }
    }
    // Insert a separator if there are previous entries.
    if (insertIndex > 0) {
      this.insertItem(insertIndex++, { type: 'separator' });
    }
    // Insert the group.
    for (let item of items) {
      this.insertItem(insertIndex++, item);
    }
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
 * An extensible FileMenu for the application.
 */
export
class FileMenu extends Menu implements IMainMenu.IFileMenu {
  constructor(options: Menu.IOptions) {
    super(options);

    this.title.label = 'File';

    // Create the "New" submenu.
    this.newMenu = new Menu(options);
    this.newMenu.title.label = 'New';
    this.addItem({
      type: 'submenu',
      submenu: this.newMenu
    });
  }

  /**
   * The New submenu.
   */
  readonly newMenu: Menu;
}

/**
 * An extensible Help menu for the application.
 */
export
class HelpMenu extends JupyterLabMenu implements IMainMenu.IHelpMenu {
  /**
   * Construct the help menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Help';
  }
}

/**
 * An extensible Edit menu for the application.
 */
export
class EditMenu extends JupyterLabMenu implements IMainMenu.IEditMenu {
  /**
   * Construct the edit menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Edit';
  }
}

/**
 * An extensible Run menu for the application.
 */
export
class RunMenu extends JupyterLabMenu implements IMainMenu.IRunMenu {
  /**
   * Construct the run menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Run';
  }
}
/**
 * An extensible Kernel menu for the application.
 */
export
class KernelMenu extends JupyterLabMenu implements IMainMenu.IKernelMenu {
  /**
   * Construct the kernel menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Kernel';
  }

  addUser<T extends Widget>(user: IMainMenu.IKernelMenu.IKernelUser<T>) {
    this._users.push(user);
  }

  findUser(widget: Widget | null): IMainMenu.IKernelMenu.IKernelUser<Widget> | undefined {
    if (!widget) {
      return undefined;
    }
    return ArrayExt.findFirstValue(this._users, el => el.tracker.has(widget))
  }

  private _users: IMainMenu.IKernelMenu.IKernelUser<Widget>[] = [];
}

/**
 * An extensible View menu for the application.
 */
export
class ViewMenu extends JupyterLabMenu implements IMainMenu.IViewMenu {
  /**
   * Construct the view menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'View';
  }
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

