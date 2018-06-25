import {
  Widget, BoxPanel, BoxLayout
} from '@phosphor/widgets';

import {
  IStatusBar
} from './index';

import {
  ApplicationShell
} from '@jupyterlab/application';

const STATUS_BAR_CLASS = 'jp-status-bar';

export
class StatusBar extends BoxPanel implements IStatusBar {
  constructor(options: StatusBar.IOptions) {
    super();
    this._host = options.host;

    this.id = STATUS_BAR_CLASS;


    let leftPanel = this._leftPanel = new BoxPanel();
    let rightPanel = this._rightPanel = new BoxPanel();
    let rootLayout = new BoxLayout();

    rootLayout.direction = 'left-to-right';
    rootLayout.addWidget(leftPanel);
    // possible split panel here?
    rootLayout.addWidget(rightPanel);

    leftPanel.direction = 'left-to-right';
    rightPanel.direction = 'right-to-left';

    this.layout = rootLayout;

    this._host.addToTopArea(this);
  }



  registerStatusItem(id: string, widget: Widget, opts: IStatusBar.IStatusItemOptions) {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    let align = opts.align ? opts.align : 'left';
    let priority = opts.priority === undefined ? opts.priority : 0;

    if (align === 'left') {
      this._leftPanel.insertWidget(priority, widget);
    }
    if (align === 'right') {
      this._rightPanel.this.insertWidget(priority, widget);
    }


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

  private _statusItems: { [id: string]: StatusBar.IItem } = Object.create(null);
  private _host: ApplicationShell = null;
  private _leftPanel: BoxPanel;
  private _rightPanel: BoxPanel;
}

export
class StatusBarSide {
  constructor(alignment: IStatusBar.Alignment) {
   this._layout = new BoxLayout();
    if(alignment === 'left') {
      this._layout.direction = 'left-to-right';
    }
    else {
      this._layout.direction = 'right-to-left';
    }
  }
  private _layout: BoxLayout;
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
