// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  utils
} from '@jupyterlab/services';

import {
  each, toArray
} from '@phosphor/algorithm';

import {
  contains, find, ArrayExt.firstIndexOf, ArrayExt.findFirstIndex, ArrayExt.upperBound
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  defineSignal, ISignal
} from '@phosphor/signaling';

import {
  BoxLayout, BoxPanel
} from '@phosphor/widgets';

import {
  DockPanel
} from '@phosphor/widgets';

import {
  FocusTracker
} from '@phosphor/widgets';

import {
  Panel
} from '@phosphor/widgets';

import {
  SplitPanel
} from '@phosphor/widgets';

import {
  StackedPanel
} from '@phosphor/widgets';

import {
  TabBar
} from '@phosphor/widgettabbar';

import {
  Title
} from '@phosphor/widgettitle';

import {
  Widget
} from '@phosphor/widgets';

import {
  IInstanceRestorer
} from '../instancerestorer';


/**
 * The class name added to AppShell instances.
 */
const APPLICATION_SHELL_CLASS = 'jp-ApplicationShell';

/**
 * The class name added to side bar instances.
 */
const SIDEBAR_CLASS = 'jp-SideBar';

/**
 * The class name added to the current widget's title.
 */
const CURRENT_CLASS = 'jp-mod-current';


/**
 * The application shell for JupyterLab.
 */
export
class ApplicationShell extends Widget {
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
    let leftHandler = this._leftHandler = new Private.SideBarHandler('left');
    let rightHandler = this._rightHandler = new Private.SideBarHandler('right');
    let rootLayout = new BoxLayout();

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
    dockPanel.spacing = 5;
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

    rootLayout.direction = 'top-to-bottom';
    rootLayout.spacing = 0; // TODO make this configurable?

    BoxLayout.setStretch(topPanel, 0);
    BoxLayout.setStretch(hboxPanel, 1);

    rootLayout.addWidget(topPanel);
    rootLayout.addWidget(hboxPanel);

    this.layout = rootLayout;

    this._dockPanel.currentChanged.connect(this._onCurrentChanged, this);
  }

  /**
   * A signal emitted when main area's current focus changes.
   */
  readonly currentChanged: ISignal<this, FocusTracker.ICurrentChangedArgs<Widget>>;

  /**
   * The current widget in the shell's main area.
   */
  get currentWidget(): Widget {
    return this._dockPanel.currentWidget;
  }

  /**
   * Promise that resolves when state is restored, returning layout description.
   */
  get restored(): Promise<IInstanceRestorer.ILayout> {
    return this._restored.promise;
  }

  /**
   * True if main area is empty.
   */
  get mainAreaIsEmpty(): boolean {
    return this._dockPanel.isEmpty;
  }

  /**
   * True if top area is empty.
   */
  get topAreaIsEmpty(): boolean {
    return this._topPanel.widgets.length === 0;
  }

  /**
   * True if left area is empty.
   */
  get leftAreaIsEmpty(): boolean {
    return this._leftHandler.stackedPanel.widgets.length === 0;
  }

  /**
   * True if right area is empty.
   */
  get rightAreaIsEmpty(): boolean {
    return this._rightHandler.stackedPanel.widgets.length === 0;
  }

  /**
   * Add a widget to the top content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  addToTopArea(widget: Widget, options: ApplicationShell.ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    // Temporary: widgets are added to the panel in order of insertion.
    this._topPanel.addWidget(widget);
    this._save();
  }

  /**
   * Add a widget to the left content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  addToLeftArea(widget: Widget, options: ApplicationShell.ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    let rank = 'rank' in options ? options.rank : 100;
    this._leftHandler.addWidget(widget, rank);
    this._save();
  }

  /**
   * Add a widget to the right content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  addToRightArea(widget: Widget, options: ApplicationShell.ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    let rank = 'rank' in options ? options.rank : 100;
    this._rightHandler.addWidget(widget, rank);
    this._save();
  }

  /**
   * Add a widget to the main content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  addToMainArea(widget: Widget): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    this._dockPanel.addWidget(widget, { mode: 'tab-after' });
    this._save();
  }

  /**
   * Activate a widget in the left area.
   */
  activateLeft(id: string): void {
    this._leftHandler.activate(id);
  }

  /**
   * Activate a widget in the right area.
   */
  activateRight(id: string): void {
    this._rightHandler.activate(id);
  }

  /**
   * Activate a widget in the main area.
   */
  activateMain(id: string): void {
    let dock = this._dockPanel;
    let widget = find(dock.widgets(), value => value.id === id);
    if (widget) {
      dock.activateWidget(widget);
    }
  }

  /**
   * Collapse the left area.
   */
  collapseLeft(): void {
    this._leftHandler.collapse();
    this._save();
  }

  /**
   * Collapse the right area.
   */
  collapseRight(): void {
    this._rightHandler.collapse();
    this._save();
  }

  /**
   * Close all widgets in the main area.
   */
  closeAll(): void {
    each(toArray(this._dockPanel.widgets()), widget => { widget.close(); });
    this._save();
  }

  /*
   * Activate the next Tab in the active TabBar.
  */
  activateNextTab(): void {
    let current = this._currentTabBar();
    if (current) {
      let ci = current.currentIndex;
      if (ci !== -1) {
        if (ci < current.titles.length - 1) {
          current.currentIndex += 1;
          current.currentTitle.owner.activate();
        } else if (ci === current.titles.length - 1) {
          let nextBar = this._nextTabBar();
          if (nextBar) {
            nextBar.currentIndex = 0;
            nextBar.currentTitle.owner.activate();
          }
        }
      }
    }
  }

  /*
   * Activate the previous Tab in the active TabBar.
  */
  activatePreviousTab(): void {
    let current = this._currentTabBar();
    if (current) {
      let ci = current.currentIndex;
      if (ci !== -1) {
        if (ci > 0) {
          current.currentIndex -= 1;
          current.currentTitle.owner.activate();
        } else if (ci === 0) {
          let prevBar = this._previousTabBar();
          if (prevBar) {
            let len = prevBar.titles.length;
            prevBar.currentIndex = len - 1;
            prevBar.currentTitle.owner.activate();
          }
        }
      }
    }
  }

  /**
   * Set the layout data store for the application shell.
   */
  setLayoutDB(database: IInstanceRestorer.ILayoutDB): void {
    if (this._database) {
      throw new Error('cannot reset layout database');
    }
    this._database = database;
    this._database.fetch().then(saved => {
      if (this.isDisposed && !saved) {
        return;
      }

      // Rehydrate the application.
      let { currentWidget, leftArea, rightArea } = saved;
      if (leftArea) {
        this._leftHandler.rehydrate(leftArea);
      }
      if (rightArea) {
        this._rightHandler.rehydrate(rightArea);
      }
      if (currentWidget) {
        this.activateMain(currentWidget.id);
      }
      this._isRestored = true;
      return this._save().then(() => { this._restored.resolve(saved); });
    });
    // Catch current changed events on the side handlers.
    this._dockPanel.currentChanged.connect(this._save, this);
    this._leftHandler.sideBar.currentChanged.connect(this._save, this);
    this._rightHandler.sideBar.currentChanged.connect(this._save, this);
  }

  /*
   * Return the TabBar that has the currently active Widget or undefined.
   */
  private _currentTabBar(): TabBar {
    let current = this._dockPanel.currentWidget;
    if (current) {
      let title = current.title;
      let tabBar = find(this._dockPanel.tabBars(), bar => contains(bar.titles, title));
      return tabBar;
    }
    return void 0;
  }

  /*
   * Return the TabBar previous to the current TabBar (see above) or undefined.
   */
  private _previousTabBar(): TabBar {
    let current = this._currentTabBar();
    if (current) {
      let bars = toArray(this._dockPanel.tabBars());
      let len = bars.length;
      let ci = bars.ArrayExt.firstIndexOf(current);
      let prevBar: TabBar = null;
      if (ci > 0) {
        prevBar = bars[ci - 1];
      } else if (ci === 0) {
        prevBar = bars[len - 1];
      }
      return prevBar;
    }
    return void 0;
  }

  /*
   * Return the TabBar next to the current TabBar (see above) or undefined.
   */
  private _nextTabBar(): TabBar {
    let current = this._currentTabBar();
    if (current) {
      let bars = toArray(this._dockPanel.tabBars());
      let len = bars.length;
      let ci = bars.ArrayExt.firstIndexOf(current);
      let nextBar: TabBar = null;
      if (ci < (len - 1)) {
        nextBar = bars[ci + 1];
      } else if (ci === len - 1) {
        nextBar = bars[0];
      }
      return nextBar;
    }
    return void 0;
  }


  /**
   * Save the dehydrated state of the application shell.
   */
  private _save(): Promise<void> {
    if (!this._database || !this._isRestored) {
      return;
    }

    let data: IInstanceRestorer.ILayout = {
      currentWidget: this._dockPanel.currentWidget,
      leftArea: this._leftHandler.dehydrate(),
      rightArea: this._rightHandler.dehydrate()
    };
    return this._database.save(data);
  }

  /**
   * Handle a change to the dock area current widget.
   */
  private _onCurrentChanged(sender: DockPanel, args: DockPanel.ICurrentChangedArgs): void {
    if (args.newValue) {
      args.newValue.title.className += ` ${CURRENT_CLASS}`;
    }
    if (args.oldValue) {
      let title = args.oldValue.title;
      title.className = title.className.replace(CURRENT_CLASS, '');
    }
    this.currentChanged.emit(args);
  }

  private _database: IInstanceRestorer.ILayoutDB = null;
  private _dockPanel: DockPanel;
  private _isRestored = false;
  private _hboxPanel: BoxPanel;
  private _hsplitPanel: SplitPanel;
  private _leftHandler: Private.SideBarHandler;
  private _restored = new utils.PromiseDelegate<IInstanceRestorer.ILayout>();
  private _rightHandler: Private.SideBarHandler;
  private _topPanel: Panel;
}


// Define the signals for the `ApplicationShell` class.
defineSignal(ApplicationShell.prototype, 'currentChanged');


/**
 * The namespace for `ApplicationShell` class statics.
 */
export
namespace ApplicationShell {
  /**
   * The areas of the application shell where widgets can reside.
   */
  export
  type Area = 'main' | 'top' | 'left' | 'right';

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
}


namespace Private {
  /**
   * An object which holds a widget and its sort rank.
   */
  export
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

  /**
   * A class which manages a side bar and related stacked panel.
   */
  export
  class SideBarHandler {
    /**
     * Construct a new side bar handler.
     */
    constructor(side: string) {
      this._side = side;
      this._sideBar = new TabBar({
        insertBehavior: 'none',
        removeBehavior: 'none',
        allowDeselect: true
      });
      this._stackedPanel = new StackedPanel();
      this._sideBar.hide();
      this._stackedPanel.hide();
      this._sideBar.currentChanged.connect(this._onCurrentChanged, this);
      this._sideBar.tabActivateRequested.connect(this._onTabActivateRequested, this);
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
        widget.activate();
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
     * Dehydrate the side bar data.
     */
    dehydrate(): IInstanceRestorer.ISideArea {
      let collapsed = this._sideBar.currentTitle === null;
      let widgets = toArray(this._stackedPanel.widgets);
      let currentWidget = widgets[this._sideBar.currentIndex];
      return { collapsed, currentWidget, widgets };
    }

    /**
     * Rehydrate the side bar.
     */
    rehydrate(data: IInstanceRestorer.ISideArea): void {
      if (data.currentWidget) {
        this.activate(data.currentWidget.id);
      } else if (data.collapsed) {
        this.collapse();
      }
    }

    /**
     * Find the insertion index for a rank item.
     */
    private _findInsertIndex(item: Private.IRankItem): number {
      return ArrayExt.upperBound(this._items, item, Private.itemCmp);
    }

    /**
     * Find the index of the item with the given widget, or `-1`.
     */
    private _findWidgetIndex(widget: Widget): number {
      return ArrayExt.findFirstIndex(this._items, item => item.widget === widget);
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
        document.body.setAttribute(`data-${this._side}Area`, newWidget.id);
      } else {
        document.body.removeAttribute(`data-${this._side}Area`);
      }
      this._refreshVisibility();
    }

    /**
     * Handle a `tabActivateRequest` signal from the sidebar.
     */
    private _onTabActivateRequested(sender: TabBar, args: TabBar.ITabActivateRequestedArgs): void {
      args.title.owner.activate();
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
}
