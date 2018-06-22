import {
  Widget
} from '@phosphor/widgets';

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

    this._host.addToTopArea(this);
  }

  registerStatusItem(id: string, widget: Widget, opts: IStatusBar.IStatusItemOptions) {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    let align = opts.align ? opts.align : 'left';
    let priority = opts.priority === undefined ? opts.priority : 0;

    let wrapper = {
      widget,
      align,
      priority
    };

    this._statusItems[id] = wrapper;
  }

  /**
   * List the ids of the status bar items;
   *
   * @returns A new array of the status bar item ids.
   */
  listItems(): string[] {
    return Object.keys(this._statusItems);
  }

  /**
   * Test whether a specific status item is present in the status bar.
   *
   * @param id The id of the status item of interest
   *
   * @returns `true` if the status item is in the status bar, `false` otherwise.
   */
  hasItem(id: string): boolean {
    return id in this._statusItems;
  }

  /**
   * Get the parent ApplicationShell
   */
  get host(): ApplicationShell {
    return this._host;
  }

  private _statusItems: { [id: string]: StatusBar.IItem } = Object.create(null);
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

  export
  interface IItem {
    align: IStatusBar.Alignment;
    priority: number;
    widget: Widget;
  }
}
