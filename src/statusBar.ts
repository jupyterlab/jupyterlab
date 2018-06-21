import {
  Widget
} from '@phosphor/widgets';

import {
  ManagedStatusItem, StatusItem
} from './statusitems';

import {
  IStatusBar
} from './index';

import {
  ApplicationShell
} from '@jupyterlab/application';

const STATUS_BAR_CLASS = 'jp-status-bar';

export
class StatusBar extends Widget implements IStatusBar {
  constructor(options: StatusBar.IOptions) {
    super();

    this._host = options.host;

    this.id = STATUS_BAR_CLASS;

    this._addSelfToHost(this._host);
  }

  createManagedStatusItem(id: string, options?: ManagedStatusItem.IOptions): ManagedStatusItem {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    // Create a new managed status
    let widget = new ManagedStatusItem(options);

    this._statusItems[id] = widget;

    return widget;
  }

  registerStatusItem(id: string, widget: StatusItem) {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    // Move the provided widget into the status bar container
    widget.parent = this;

    this._statusItems[id] = widget;
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

  private _statusItems: { [id: string]: StatusItem } = Object.create(null);
  private _host: ApplicationShell = null;
}

export
namespace StatusBar {

  /**
   * Options for creating a new StatusBar instance
   */
  export
  interface IOptions {
    host: ApplicationShell;
  }
}
