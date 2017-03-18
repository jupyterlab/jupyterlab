// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each, find, toArray
} from '@phosphor/algorithm';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  BoxLayout, BoxPanel, DockLayout, DockPanel, FocusTracker,
  Panel, SplitPanel, StackedPanel, TabBar, Title, Widget
} from '@phosphor/widgets';


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
 * The class name added to the active widget's title.
 */
const ACTIVE_CLASS = 'jp-mod-active';


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

    // Connect change listeners.
    this._tracker.currentChanged.connect(this._onCurrentChanged, this);
    this._tracker.activeChanged.connect(this._onActiveChanged, this);

    // Connect main layout change listener.
    this._dockPanel.layoutModified.connect(this._save, this);
  }

  /**
   * A signal emitted when main area's current focus changes.
   */
  get currentChanged(): ISignal<this, ApplicationShell.IChangedArgs> {
    return this._currentChanged;
  }

  /**
   * A signal emitted when main area's active focus changes.
   */
  get activeChanged(): ISignal<this, ApplicationShell.IChangedArgs> {
    return this._activeChanged;
  }

  /**
   * The current widget in the shell's main area.
   */
  get currentWidget(): Widget | null {
    return this._tracker.currentWidget;
  }

  /**
   * The active widget in the shell's main area.
   */
  get activeWidget(): Widget | null {
    return this._tracker.activeWidget;
  }

  /**
   * True if the given area is empty.
   */
  isEmpty(area: ApplicationShell.Area): boolean {
    switch (area) {
    case 'left':
      return this._leftHandler.stackedPanel.widgets.length === 0;
    case 'main':
      return this._dockPanel.isEmpty;
    case 'top':
      return this._topPanel.widgets.length === 0;
    case 'right':
      return this._rightHandler.stackedPanel.widgets.length === 0;
    default:
      return true;
    }
  }

  /**
   * Promise that resolves when state is restored, returning layout description.
   */
  get restored(): Promise<ApplicationShell.ILayout> {
    return this._restored.promise;
  }

  /**
   * Activate a widget in it's area.
   */
  activateById(id: string): void {
    if (this._leftHandler.has(id)) {
      this._leftHandler.activate(id);
    } else if (this._rightHandler.has(id)) {
      this._rightHandler.activate(id);
    } else {
      let dock = this._dockPanel;
      let widget = find(dock.widgets(), value => value.id === id);
      if (widget) {
        dock.activateWidget(widget);
      }
    }
  }

  /*
   * Activate the next Tab in the active TabBar.
  */
  activateNextTab(): void {
    let current = this._currentTabBar();
    if (!current) {
      return;
    }

    let ci = current.currentIndex;
    if (ci === -1) {
      return;
    }

    if (ci < current.titles.length - 1) {
      current.currentIndex += 1;
      current.currentTitle.owner.activate();
      return;
    }

    if (ci === current.titles.length - 1) {
      let nextBar = this._nextTabBar();
      if (nextBar) {
        nextBar.currentIndex = 0;
        nextBar.currentTitle.owner.activate();
      }
    }
  }

  /*
   * Activate the previous Tab in the active TabBar.
  */
  activatePreviousTab(): void {
    let current = this._currentTabBar();
    if (!current) {
      return;
    }

    let ci = current.currentIndex;
    if (ci === -1) {
      return;
    }

    if (ci > 0) {
      current.currentIndex -= 1;
      current.currentTitle.owner.activate();
      return;
    }

    if (ci === 0) {
      let prevBar = this._previousTabBar();
      if (prevBar) {
        let len = prevBar.titles.length;
        prevBar.currentIndex = len - 1;
        prevBar.currentTitle.owner.activate();
      }
    }
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
   * Add a widget to the main content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   * All widgets added to the main area should be disposed after removal (or
   * simply disposed in order to remove).
   */
  addToMainArea(widget: Widget): void {
    if (!widget.id) {
      console.error('widgets added to app shell must have unique id property');
      return;
    }
    this._dockPanel.addWidget(widget, { mode: 'tab-after' });
    this._tracker.add(widget);
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
    // Make a copy of all the widget in the dock panel (using `toArray()`)
    // before removing them because removing them while iterating through them
    // modifies the underlying data of the iterator.
    each(toArray(this._dockPanel.widgets()), widget => { widget.close(); });
  }

  /**
   * Set the layout data store for the application shell.
   */
  setLayoutDB(database: ApplicationShell.ILayoutDB): void {
    if (this._database) {
      throw new Error('cannot reset layout database');
    }
    this._database = database;
    this._database.fetch().then(saved => {
      if (this.isDisposed || !saved) {
        return;
      }

      const { mainArea, leftArea, rightArea } = saved;

      // Rehydrate the main area.
      if (mainArea) {
        if (mainArea.dock) {
          this._dockPanel.restoreLayout(mainArea.dock);
        }
        if (mainArea.currentWidget) {
          this.activateById(mainArea.currentWidget.id);
        }
      }

      // Rehydrate the left area.
      if (leftArea) {
        this._leftHandler.rehydrate(leftArea);
      }

      // Rehydrate the right area.
      if (rightArea) {
        this._rightHandler.rehydrate(rightArea);
      }

      // Set restored flag, save state, and resolve the restoration promise.
      this._isRestored = true;
      return this._save().then(() => { this._restored.resolve(saved); });
    });

    // Catch current changed events on the side handlers.
    this._tracker.currentChanged.connect(this._save, this);
    this._leftHandler.sideBar.currentChanged.connect(this._save, this);
    this._rightHandler.sideBar.currentChanged.connect(this._save, this);
  }

  /*
   * Return the TabBar that has the currently active Widget or null.
   */
  private _currentTabBar(): TabBar<Widget> | null {
    let current = this._tracker.currentWidget;
    if (!current) {
      return null;
    }

    let title = current.title;
    return find(this._dockPanel.tabBars(), bar => {
      return ArrayExt.firstIndexOf(bar.titles, title) > -1;
    }) || null;
  }

  /*
   * Return the TabBar previous to the current TabBar (see above) or null.
   */
  private _previousTabBar(): TabBar<Widget> | null {
    let current = this._currentTabBar();
    if (current) {
      return null;
    }
    let bars = toArray(this._dockPanel.tabBars());
    let len = bars.length;
    let ci = ArrayExt.firstIndexOf(bars, current);

    if (ci > 0) {
      return bars[ci - 1];
    }

    if (ci === 0) {
      return bars[len - 1];
    }

    return null;
  }

  /*
   * Return the TabBar next to the current TabBar (see above) or null.
   */
  private _nextTabBar(): TabBar<Widget> | null {
    let current = this._currentTabBar();
    if (!current) {
      return null;
    }

    let bars = toArray(this._dockPanel.tabBars());
    let len = bars.length;
    let ci = ArrayExt.firstIndexOf(bars, current);

    if (ci < (len - 1)) {
      return bars[ci + 1];
    }

    if (ci === len - 1) {
      return bars[0];
    }

    return null;
  }


  /**
   * Save the dehydrated state of the application shell.
   */
  private _save(): Promise<void> {
    if (!this._database || !this._isRestored) {
      return;
    }
    let data: ApplicationShell.ILayout = {
      mainArea: {
        currentWidget: this._tracker.currentWidget,
        dock: this._dockPanel.saveLayout()
      },
      leftArea: this._leftHandler.dehydrate(),
      rightArea: this._rightHandler.dehydrate()
    };
    return this._database.save(data);
  }

  /**
   * Handle a change to the dock area current widget.
   */
  private _onCurrentChanged(sender: any, args: FocusTracker.IChangedArgs<Widget>): void {
    if (args.newValue) {
      args.newValue.title.className += ` ${CURRENT_CLASS}`;
    }
    if (args.oldValue) {
      args.oldValue.title.className = (
        args.oldValue.title.className.replace(CURRENT_CLASS, '')
      );
    }
    this._currentChanged.emit(args);
  }

  /**
   * Handle a change to the dock area active widget.
   */
  private _onActiveChanged(sender: any, args: FocusTracker.IChangedArgs<Widget>): void {
    if (args.newValue) {
      args.newValue.title.className += ` ${ACTIVE_CLASS}`;
    }
    if (args.oldValue) {
      args.oldValue.title.className = (
        args.oldValue.title.className.replace(ACTIVE_CLASS, '')
      );
    }
    this._activeChanged.emit(args);
  }

  private _database: ApplicationShell.ILayoutDB = null;
  private _dockPanel: DockPanel;
  private _hboxPanel: BoxPanel;
  private _hsplitPanel: SplitPanel;
  private _isRestored = false;
  private _leftHandler: Private.SideBarHandler;
  private _restored = new PromiseDelegate<ApplicationShell.ILayout>();
  private _rightHandler: Private.SideBarHandler;
  private _topPanel: Panel;
  private _tracker = new FocusTracker<Widget>();
  private _currentChanged = new Signal<this, ApplicationShell.IChangedArgs>(this);
  private _activeChanged = new Signal<this, ApplicationShell.IChangedArgs>(this);
}


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
   * The restorable description of an area within the main dock panel.
   */
  export
  type AreaConfig = DockLayout.AreaConfig;

  /**
   * An arguments object for the changed signals.
   */
  export
  type IChangedArgs = FocusTracker.IChangedArgs<Widget>;

  /**
   * A description of the application's user interface layout.
   */
  export
  interface ILayout {
    /**
     * Indicates whether fetched session restore data was actually retrieved
     * from the state database or whether it is a fresh blank slate.
     *
     * #### Notes
     * This attribute is only relevant when the layout data is retrieved via a
     * `fetch` call. If it is set when being passed into `save`, it will be
     * ignored.
     */
    readonly fresh?: boolean;

    /**
     * The main area of the user interface.
     */
    readonly mainArea: IMainArea | null;

    /**
     * The left area of the user interface.
     */
    readonly leftArea: ISideArea | null;

    /**
     * The right area of the user interface.
     */
    readonly rightArea: ISideArea | null;
  }

  /**
   * An application layout data store.
   */
  export
  interface ILayoutDB {
    /**
     * Fetch the layout state for the application.
     *
     * #### Notes
     * Fetching the layout relies on all widget restoration to be complete, so
     * calls to `fetch` are guaranteed to return after restoration is complete.
     */
    fetch(): Promise<ApplicationShell.ILayout>;

    /**
     * Save the layout state for the application.
     */
    save(data: ApplicationShell.ILayout): Promise<void>;
  }

  /**
   * The restorable description of the main application area.
   */
  export
  interface IMainArea {
    /**
     * The current widget that has application focus.
     */
    readonly currentWidget: Widget | null;

    /**
     * The contents of the main application dock panel.
     */
    readonly dock: DockLayout.ILayoutConfig | null;
  };

  /**
   * The restorable description of a sidebar in the user interface.
   */
  export
  interface ISideArea {
    /**
     * A flag denoting whether the sidebar has been collapsed.
     */
    readonly collapsed: boolean;

    /**
     * The current widget that has side area focus.
     */
    readonly currentWidget: Widget | null;

    /**
     * The collection of widgets held by the sidebar.
     */
    readonly widgets: Array<Widget> | null;
  }

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
      this._sideBar = new TabBar<Widget>({
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
    get sideBar(): TabBar<Widget> {
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
     * Test whether the sidebar has the given widget by id.
     */
    has(id: string): boolean {
      return this._findWidgetByID(id) !== null;
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
      ArrayExt.insert(this._items, index, item);
      this._stackedPanel.insertWidget(index, widget);
      this._sideBar.insertTab(index, widget.title);
      this._refreshVisibility();
    }

    /**
     * Dehydrate the side bar data.
     */
    dehydrate(): ApplicationShell.ISideArea {
      let collapsed = this._sideBar.currentTitle === null;
      let widgets = toArray(this._stackedPanel.widgets);
      let currentWidget = widgets[this._sideBar.currentIndex];
      return { collapsed, currentWidget, widgets };
    }

    /**
     * Rehydrate the side bar.
     */
    rehydrate(data: ApplicationShell.ISideArea): void {
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
    private _findWidgetByTitle(title: Title<Widget>): Widget {
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
    private _onCurrentChanged(sender: TabBar<Widget>, args: TabBar.ICurrentChangedArgs<Widget>): void {
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
    private _onTabActivateRequested(sender: TabBar<Widget>, args: TabBar.ITabActivateRequestedArgs<Widget>): void {
      args.title.owner.activate();
    }

    /*
     * Handle the `widgetRemoved` signal from the stacked panel.
     */
    private _onWidgetRemoved(sender: StackedPanel, widget: Widget): void {
      ArrayExt.removeAt(this._items, this._findWidgetIndex(widget));
      this._sideBar.removeTab(widget.title);
      this._refreshVisibility();
    }

    private _items = new Array<Private.IRankItem>();
    private _side: string;
    private _sideBar: TabBar<Widget>;
    private _stackedPanel: StackedPanel;
  }
}
