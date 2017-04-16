// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as arrays
  from 'phosphor-arrays';

import {
  BoxLayout, BoxPanel
} from 'phosphor-boxpanel';

import {
  DockPanel
} from 'phosphor-dockpanel';

import {
  Panel
} from 'phosphor-panel';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  StackedPanel
} from 'phosphor-stackedpanel';

import {
  Title, Widget
} from 'phosphor-widget';

import {
  SideBar
} from './sidebar';


/**
 * The class name added to AppShell instances.
 */
const APPLICATION_SHELL_CLASS = 'jp-ApplicationShell';


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
 * The options for adding a widget to the main area of the shell.
 */
export
interface IMainAreaOptions { /* TODO */ }


/**
 *
 */
export
class ApplicationShell extends Widget {
  /**
   * Construct a new application shell.
   */
  constructor() {
    super();
    this.addClass(APPLICATION_SHELL_CLASS);

    let topPanel = new Panel();
    let hboxPanel = new BoxPanel();
    let dockPanel = new DockPanel();
    let hsplitPanel = new SplitPanel();
    let leftHandler = new SideBarHandler('left');
    let rightHandler = new SideBarHandler('right');
    let rootLayout = new BoxLayout();

    this._topPanel = topPanel;
    this._hboxPanel = hboxPanel;
    this._dockPanel = dockPanel;
    this._hsplitPanel = hsplitPanel;
    this._leftHandler = leftHandler;
    this._rightHandler = rightHandler;

    // TODO fix these
    topPanel.id = 'jp-top-panel';
    hsplitPanel.id = 'jp-main-split-panel';
    leftHandler.sideBar.addClass('jp-mod-left');
    rightHandler.sideBar.addClass('jp-mod-right');
    leftHandler.stackedPanel.id = 'jp-left-stack';
    rightHandler.stackedPanel.id = 'jp-right-stack';
    dockPanel.id = 'jp-main-dock-panel';

    dockPanel.spacing = 8; // TODO make this configurable?

    hsplitPanel.orientation = SplitPanel.Horizontal;
    hsplitPanel.spacing = 1; // TODO make this configurable?

    SplitPanel.setStretch(leftHandler.stackedPanel, 0);
    SplitPanel.setStretch(dockPanel, 1);
    SplitPanel.setStretch(rightHandler.stackedPanel, 0);

    hsplitPanel.addChild(leftHandler.stackedPanel);
    hsplitPanel.addChild(dockPanel);
    hsplitPanel.addChild(rightHandler.stackedPanel);

    hboxPanel.direction = BoxPanel.LeftToRight;
    hboxPanel.spacing = 0; // TODO make this configurable?

    BoxPanel.setStretch(leftHandler.sideBar, 0);
    BoxPanel.setStretch(hsplitPanel, 1);
    BoxPanel.setStretch(rightHandler.sideBar, 0);

    hboxPanel.addChild(leftHandler.sideBar);
    hboxPanel.addChild(hsplitPanel);
    hboxPanel.addChild(rightHandler.sideBar);

    rootLayout.direction = BoxLayout.TopToBottom;
    rootLayout.spacing = 0; // TODO make this configurable?

    BoxLayout.setStretch(topPanel, 0);
    BoxLayout.setStretch(hboxPanel, 1);

    rootLayout.addChild(topPanel);
    rootLayout.addChild(hboxPanel);

    this.layout = rootLayout;
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
    this._topPanel.addChild(widget);
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
  addToMainArea(widget: Widget, options: IMainAreaOptions = {}): void {
    // TODO
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    this._dockPanel.insertTabAfter(widget);
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
 * A class which manages a side bar and related stacked panel.
 */
class SideBarHandler {
  /**
   * A less-than comparison function for side bar rank items.
   */
  static itemCmp(first: IRankItem, second: IRankItem): boolean {
    return first.rank < second.rank;
  }

  /**
   * Construct a new side bar handler.
   */
  constructor(side: string) {
    this._side = side;
    this._sideBar = new SideBar();
    this._stackedPanel = new StackedPanel();
    this._sideBar.hide();
    this._stackedPanel.hide();
    this._sideBar.currentChanged.connect(this._onCurrentChanged, this);
    this._stackedPanel.widgetRemoved.connect(this._onWidgetRemoved, this);
  }

  /**
   * Get the side bar managed by the handler.
   */
  get sideBar(): SideBar {
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
    if (widget) this._sideBar.currentTitle = widget.title;
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
    arrays.insert(this._items, index, item);
    this._stackedPanel.insertChild(index, widget);
    this._sideBar.insertTitle(index, widget.title);
    this._refreshVisibility();
  }

  /**
   * Find the insertion index for a rank item.
   */
  private _findInsertIndex(item: IRankItem): number {
    return arrays.upperBound(this._items, item, SideBarHandler.itemCmp);
  }

  /**
   * Find the index of the item with the given widget, or `-1`.
   */
  private _findWidgetIndex(widget: Widget): number {
    return arrays.findIndex(this._items, item => item.widget === widget);
  }

  /**
   * Find the widget which owns the given title, or `null`.
   */
  private _findWidgetByTitle(title: Title): Widget {
    let item = arrays.find(this._items, item => item.widget.title === title);
    return item ? item.widget : null;
  }

  /**
   * Find the widget with the given id, or `null`.
   */
  private _findWidgetByID(id: string): Widget {
    let item = arrays.find(this._items, item => item.widget.id === id);
    return item ? item.widget : null;
  }

  /**
   * Refresh the visibility of the side bar and stacked panel.
   */
  private _refreshVisibility(): void {
    this._sideBar.setHidden(this._sideBar.titleCount() === 0);
    this._stackedPanel.setHidden(this._sideBar.currentTitle === null);
  }

  /**
   * Handle the `currentChanged` signal from the sidebar.
   */
  private _onCurrentChanged(sender: SideBar, args: IChangedArgs<Title>): void {
    let oldWidget = this._findWidgetByTitle(args.oldValue);
    let newWidget = this._findWidgetByTitle(args.newValue);
    if (oldWidget) oldWidget.hide();
    if (newWidget) newWidget.show();
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
    arrays.removeAt(this._items, this._findWidgetIndex(widget));
    this._sideBar.removeTitle(widget.title);
    this._refreshVisibility();
  }

  private _side: string;
  private _sideBar: SideBar;
  private _stackedPanel: StackedPanel;
  private _items: IRankItem[] = [];
}
