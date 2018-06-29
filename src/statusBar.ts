import {
  Widget, PanelLayout, SplitPanel, BoxPanel, LayoutItem
} from '@phosphor/widgets';

import {
  Token
} from '@phosphor/coreutils';

import {
  ApplicationShell
} from '@jupyterlab/application';

// import {
//   IIterable, IIterator, iter
// } from '@phosphor/algorithm';

export
// tslint:disable-next-line:variable-name
const IStatusBar = new Token<IStatusBar>('jupyterlab-statusbar/IStatusBar');

export
interface IStatusBar {
  listItems(): string[];
  hasItem(id: string): boolean;

  registerStatusItem(id: string, widget: Widget, opts: IStatusBar.IStatusItemOptions): void;
}

export
namespace IStatusBar {

  export
  type Alignment = 'right' | 'left';

  export
  interface IStatusItemOptions {
    align?: IStatusBar.Alignment;
    priority?: number;
  }
}

const STATUS_BAR_ID = 'jp-main-status-bar';

const STATUS_BAR_CLASS = 'jp-status-bar';
const STATUS_BAR_SPLIT_CONTAINER_CLASS = 'jp-status-bar-split-container';
const STATUS_BAR_SIDE_CLASS = 'jp-status-bar-side';
const STATUS_BAR_ITEM_CLASS = 'jp-status-bar-item';

export
class StatusBar extends Widget implements IStatusBar {
  constructor(options: StatusBar.IOptions) {
    super();

    this._host = options.host;

    this.id = STATUS_BAR_ID;
    this.addClass(STATUS_BAR_CLASS);

    let rootLayout = this.layout = new PanelLayout();
    let splitContainer = this._splitContainer = new SplitPanel({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1,
    });
    splitContainer.addClass(STATUS_BAR_SPLIT_CONTAINER_CLASS);

    let leftPanel = this._leftSide = new BoxPanel({ direction: 'left-to-right' });
    let rightPanel = this._rightSide = new BoxPanel({ direction: 'right-to-left' });
    rightPanel.id = 'jp-right-pane';
    leftPanel.id = 'jp-left-pane';

    leftPanel.addClass(STATUS_BAR_SIDE_CLASS);
    SplitPanel.setStretch(leftPanel, 0);

    rightPanel.addClass(STATUS_BAR_SIDE_CLASS);
    SplitPanel.setStretch(rightPanel, 1);

    splitContainer.addWidget(leftPanel);
    splitContainer.addWidget(rightPanel);
    rootLayout.addWidget(splitContainer);

    console.log(splitContainer.relativeSizes());

    this._host.addToTopArea(this);
  }

  registerStatusItem(id: string, widget: Widget, opts: IStatusBar.IStatusItemOptions) {
    if (id in this._statusItems) {
      throw new Error(`Status item ${id} already registered.`);
    }

    let align = opts.align ? opts.align : 'left';
    let priority = (opts.priority !== undefined) ? opts.priority : 0;

    let wrapper = {
      widget,
      align,
      priority
    };

    widget.addClass(STATUS_BAR_ITEM_CLASS);

    this._statusItems[id] = wrapper;

    let item = new LayoutItem(widget);


    if (align === 'left') {
      this._leftSide.addWidget(item.widget);
    } else {
      this._rightSide.addWidget(item.widget);
    }

    widget.show();
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

  private _leftSide: BoxPanel;
  private _rightSide: BoxPanel;

  private _splitContainer: SplitPanel;
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
