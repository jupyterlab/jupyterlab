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

    // Determine whether we need separators before or after the group.
    let shouldPrependSeparator = groupIndex > 0;
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
 * An extensible FileMenu for the application.
 */
export
class FileMenu extends JupyterLabMenu implements IMainMenu.IFileMenu {
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

  /**
   * Add a new KernelUser to the menu.
   *
   * @param user - the user to add.
   */
  addUser<T extends Widget>(user: IMainMenu.IKernelMenu.IKernelUser<T>): void {
    this._users.push(user);
  }

  /**
   * Find a kernel user for a given widget.
   *
   * @param widget - A widget to check.
   *
   * @returns an IKernelUser if any of the registered users own the widget.
   *   Otherwise it returns undefined.
   */
  findUser(widget: Widget | null): IMainMenu.IKernelMenu.IKernelUser<Widget> | undefined {
    return Private.findExtender<Widget>(widget, this._users);
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

  /**
   * Add a new KernelUser to the menu.
   *
   * @param user - the user to add.
   */
  addEditorViewer<T extends Widget>(editorViewer: IMainMenu.IViewMenu.IEditorViewer<T>): void {
    this._editorViewers.push(editorViewer);
  }

  /**
   * Find a kernel user for a given widget.
   *
   * @param widget - A widget to check.
   *
   * @returns an IKernelUser if any of the registered users own the widget.
   *   Otherwise it returns undefined.
   */
  findEditorViewer(widget: Widget | null): IMainMenu.IViewMenu.IEditorViewer<Widget> | undefined {
    return Private.findExtender<Widget>(widget, this._editorViewers);
  }

  private _editorViewers: IMainMenu.IViewMenu.IEditorViewer<Widget>[] = [];
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


/**
 * A private namespace for Menu utilities.
 */
namespace Private {
  export
  function findExtender<T extends Widget>(widget: T | null, extenders: IMainMenu.IMenuExtender<T>[]): IMainMenu.IMenuExtender<T> | undefined {
    if (!widget) {
      return undefined;
    }
    return ArrayExt.findFirstValue(extenders, el => el.tracker.has(widget))
  }
}
