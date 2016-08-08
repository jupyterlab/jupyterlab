// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  find, findIndex, upperBound
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  BoxLayout, BoxPanel
} from 'phosphor/lib/ui/boxpanel';

import {
  DockPanel
} from 'phosphor/lib/ui/dockpanel';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  SplitPanel
} from 'phosphor/lib/ui/splitpanel';

import {
  StackedPanel
} from 'phosphor/lib/ui/stackedpanel';

import {
  TabBar
} from 'phosphor/lib/ui/tabbar';

import {
  Title
} from 'phosphor/lib/ui/title';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * The class name added to AppShell instances.
 */
const APPLICATION_SHELL_CLASS = 'jp-ApplicationShell';

/**
 * The class name added to side bar instances.
 */
const SIDEBAR_CLASS = 'jp-SideBar';


/**
 * The options for adding a widget to a side area of the shell.
 */
export
interface ISideAreaOptions {
  /**
   * The rank order of the widget among its siblings.
   */
  rank?: number;
}


/**
 * The application shell for JupyterLab.
 */
export
class ApplicationShell extends Panel {
  /**
   * Construct a new application shell.
   */
  constructor() {
    super();
    this.addClass(APPLICATION_SHELL_CLASS);
    this.id = 'main';

    let topPanel = this._topPanel = new Panel();
    let hboxPanel = this._hboxPanel = new BoxPanel();
    let dockPanel = this._dockPanel = new DockPanel();
    let hsplitPanel = this._hsplitPanel = new SplitPanel();
    let leftHandler = this._leftHandler = new SideBarHandler('left');
    let rightHandler = this._rightHandler = new SideBarHandler('right');

    topPanel.id = 'jp-top-panel';
    hboxPanel.id = 'jp-main-content-panel';
    dockPanel.id = 'jp-main-dock-panel';
    hsplitPanel.id = 'jp-main-split-panel';

    leftHandler.sideBar.addClass(SIDEBAR_CLASS);
    leftHandler.sideBar.addClass('jp-mod-left');
    leftHandler.stackedPanel.id = 'jp-left-stack';

    rightHandler.sideBar.addClass(SIDEBAR_CLASS);
    rightHandler.sideBar.addClass('jp-mod-right');
    rightHandler.stackedPanel.id = 'jp-right-stack';

    hboxPanel.spacing = 0;
    dockPanel.spacing = 8;
    hsplitPanel.spacing = 1;

    hboxPanel.direction = 'left-to-right';
    hsplitPanel.orientation = 'horizontal';

    SplitPanel.setStretch(leftHandler.stackedPanel, 0);
    SplitPanel.setStretch(dockPanel, 1);
    SplitPanel.setStretch(rightHandler.stackedPanel, 0);

    BoxPanel.setStretch(leftHandler.sideBar, 0);
    BoxPanel.setStretch(hsplitPanel, 1);
    BoxPanel.setStretch(rightHandler.sideBar, 0);

    hsplitPanel.addWidget(leftHandler.stackedPanel);
    hsplitPanel.addWidget(dockPanel);
    hsplitPanel.addWidget(rightHandler.stackedPanel);

    hboxPanel.addWidget(leftHandler.sideBar);
    hboxPanel.addWidget(hsplitPanel);
    hboxPanel.addWidget(rightHandler.sideBar);

    this.addWidget(topPanel);
    this.addWidget(hboxPanel);
  }

  /**
   * Add a widget to the top content area.
   */
  addToTopArea(widget: Widget, options: ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    // Temporary: widgets are added to the panel in order of insertion.
    this._topPanel.addWidget(widget);
  }

  /**
   * Add a widget to the left content area.
   */
  addToLeftArea(widget: Widget, options: ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    let rank = 'rank' in options ? options.rank : 100;
    this._leftHandler.addWidget(widget, rank);
  }

  /**
   * Add a widget to the right content area.
   */
  addToRightArea(widget: Widget, options: ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    let rank = 'rank' in options ? options.rank : 100;
    this._rightHandler.addWidget(widget, rank);
  }

  /**
   * Add a widget to the main content area.
   */
  addToMainArea(widget: Widget): void {
    // TODO
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    this._dockPanel.addWidget(widget, { mode: 'tab-after' });
  }

  /**
   *
   */
  activateLeft(id: string): void {
    this._leftHandler.activate(id);
  }

  /**
   *
   */
  activateRight(id: string): void {
    this._rightHandler.activate(id);
  }

  /**
   *
   */
  activateMain(id: string): void {
    // TODO
  }

  /**
   *
   */
  collapseLeft(): void {
    this._leftHandler.collapse();
  }

  /**
   *
   */
  collapseRight(): void {
    this._rightHandler.collapse();
  }

  private _topPanel: Panel;
  private _hboxPanel: BoxPanel;
  private _dockPanel: DockPanel;
  private _hsplitPanel: SplitPanel;
  private _leftHandler: SideBarHandler;
  private _rightHandler: SideBarHandler;
}


/**
 * A class which manages a side bar and related stacked panel.
 */
class SideBarHandler {
  /**
   * Construct a new side bar handler.
   */
  constructor(side: string) {
    this._side = side;
    this._sideBar = new TabBar({ allowDeselect: true });
    this._stackedPanel = new StackedPanel();
    this._sideBar.hide();
    this._stackedPanel.hide();
    this._sideBar.currentChanged.connect(this._onCurrentChanged, this);
    this._stackedPanel.widgetRemoved.connect(this._onWidgetRemoved, this);
  }

  /**
   * Get the tab bar managed by the handler.
   */
  get sideBar(): TabBar {
    return this._sideBar;
  }

  /**
   * Get the stacked panel managed by the handler
   */
  get stackedPanel(): StackedPanel {
    return this._stackedPanel;
  }

  /**
   * Activate a widget residing in the side bar by ID.
   *
   * @param id - The widget's unique ID.
   */
  activate(id: string): void {
    let widget = this._findWidgetByID(id);
    if (widget) {
      this._sideBar.currentTitle = widget.title;
    }
  }

  /**
   * Collapse the sidebar so no items are expanded.
   */
  collapse(): void {
    this._sideBar.currentTitle = null;
  }

  /**
   * Add a widget and its title to the stacked panel and side bar.
   *
   * If the widget is already added, it will be moved.
   */
  addWidget(widget: Widget, rank: number): void {
    widget.parent = null;
    widget.hide();
    let item = { widget, rank };
    let index = this._findInsertIndex(item);
    this._items.insert(index, item);
    this._stackedPanel.insertWidget(index, widget);
    this._sideBar.insertTab(index, widget.title);
    this._refreshVisibility();
  }

  /**
   * Find the insertion index for a rank item.
   */
  private _findInsertIndex(item: Private.IRankItem): number {
    return upperBound(this._items, item, Private.itemCmp);
  }

  /**
   * Find the index of the item with the given widget, or `-1`.
   */
  private _findWidgetIndex(widget: Widget): number {
    return findIndex(this._items, item => item.widget === widget);
  }

  /**
   * Find the widget which owns the given title, or `null`.
   */
  private _findWidgetByTitle(title: Title): Widget {
    let item = find(this._items, value => value.widget.title === title);
    return item ? item.widget : null;
  }

  /**
   * Find the widget with the given id, or `null`.
   */
  private _findWidgetByID(id: string): Widget {
    let item = find(this._items, value => value.widget.id === id);
    return item ? item.widget : null;
  }

  /**
   * Refresh the visibility of the side bar and stacked panel.
   */
  private _refreshVisibility(): void {
    this._sideBar.setHidden(this._sideBar.titles.length === 0);
    this._stackedPanel.setHidden(this._sideBar.currentTitle === null);
  }

  /**
   * Handle the `currentChanged` signal from the sidebar.
   */
  private _onCurrentChanged(sender: TabBar, args: TabBar.ICurrentChangedArgs): void {
    let oldWidget = this._findWidgetByTitle(args.previousTitle);
    let newWidget = this._findWidgetByTitle(args.currentTitle);
    if (oldWidget) {
      oldWidget.hide();
    }
    if (newWidget) {
      newWidget.show();
    }
    if (newWidget) {
      document.body.dataset[`${this._side}Area`] = newWidget.id;
    } else {
      delete document.body.dataset[`${this._side}Area`];
    }
    this._refreshVisibility();
  }

  /*
   * Handle the `widgetRemoved` signal from the stacked panel.
   */
  private _onWidgetRemoved(sender: StackedPanel, widget: Widget): void {
    this._items.removeAt(this._findWidgetIndex(widget));
    this._sideBar.removeTab(widget.title);
    this._refreshVisibility();
  }

  private _side: string;
  private _sideBar: TabBar;
  private _stackedPanel: StackedPanel;
  private _items = new Vector<Private.IRankItem>();
}


namespace Private {
  export
  /**
   * An object which holds a widget and its sort rank.
   */
  interface IRankItem {
    /**
     * The widget for the item.
     */
    widget: Widget;

    /**
     * The sort rank of the widget.
     */
    rank: number;
  }

  /**
   * A less-than comparison function for side bar rank items.
   */
  export
  function itemCmp(first: IRankItem, second: IRankItem): number {
    return first.rank - second.rank;
  }
}
