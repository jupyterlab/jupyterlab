import {
  Widget
} from '@phosphor/widgets';

import {
  ManagedStatusBarItem, StatusBarItem
} from './statusitems';

import {
  IStatusBar
} from './index';

import {
  ApplicationShell
} from '@jupyterlab/application';

const STATUS_BAR_CLASS = "jp-status-bar";

export
class StatusBar extends Widget implements IStatusBar {
  constructor(options: StatusBar.IOptions) {
    super();

    this._host = options.host;

    this.id = STATUS_BAR_CLASS;

    this._addSelfToHost(this._host);
  }

  createManagedStatusItem(id: string): ManagedStatusBarItem {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    return ({} as ManagedStatusBarItem);
  }

  registerStatusItem(id: String, widget: StatusBarItem): StatusBarItem {
    return widget;
  }

  /**
   * List the ids of the status bar items;
   *
   * @returns A new array of the status bar item ids.
   */
  listStatusItems(): string[] {
    return Object.keys(this._statusItems);
  }

  /**
   * Test whether a specific status item is present in the status bar.
   *
   * @param id The id of the status item of interest
   *
   * @returns `true` if the status item is in the status bar, `false` otherwise.
   */
  hasStatusItem(id: string): boolean {
    return id in this._statusItems;
  }

  /**
   * Get the parent ApplicationShell
   */
  get host(): ApplicationShell {
    return this._host;
  }

  private _addSelfToHost(host: ApplicationShell) {
    host.addToTopArea(this);
  }

  private _statusItems: { [id: string]: Private.IStatusItem } = Object.create(null);
  private _host: ApplicationShell = null;
}

export
namespace StatusBar {

  /**
   * Options for creating a new StatusBar instance
   */
  export
  interface IOptions {
    host: ApplicationShell
  }

  export
  interface IStatusItemChangedArgs {

  }
}

export
namespace Private {
    export
    interface IStatusItem {
      widget: StatusBarItem,
      id: string
    }
  }
