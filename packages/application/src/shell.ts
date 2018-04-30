// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each, find, IIterator, iter, toArray
} from '@phosphor/algorithm';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  Message, MessageLoop, IMessageHandler
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  BoxLayout, BoxPanel, DockLayout, DockPanel, FocusTracker,
  Panel, SplitPanel, StackedPanel, TabBar, Title, Widget
} from '@phosphor/widgets';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';


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
 * The default rank of items added to a sidebar.
 */
const DEFAULT_RANK = 500;

/**
 * The data attribute added to the document body indicating shell's mode.
 */
const MODE_ATTRIBUTE = 'data-shell-mode';

const ACTIVITY_CLASS = 'jp-Activity';


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
    MessageLoop.installMessageHook(dockPanel, this._dockChildHook);

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
    this._dockPanel.layoutModified.connect(this._onLayoutModified, this);

    // Catch current changed events on the side handlers.
    this._leftHandler.sideBar.currentChanged.connect(this._onLayoutModified, this);
    this._rightHandler.sideBar.currentChanged.connect(this._onLayoutModified, this);
  }

  /**
   * A signal emitted when main area's active focus changes.
   */
  get activeChanged(): ISignal<this, ApplicationShell.IChangedArgs> {
    return this._activeChanged;
  }

  /**
   * The active widget in the shell's main area.
   */
  get activeWidget(): Widget | null {
    return this._tracker.activeWidget;
  }

  /**
   * A signal emitted when main area's current focus changes.
   */
  get currentChanged(): ISignal<this, ApplicationShell.IChangedArgs> {
    return this._currentChanged;
  }

  /**
   * The current widget in the shell's main area.
   */
  get currentWidget(): Widget | null {
    return this._tracker.currentWidget;
  }

  /**
   * A signal emitted when the main area's layout is modified.
   */
  get layoutModified(): ISignal<this, void> {
    return this._layoutModified;
  }

  /**
   * Whether the left area is collapsed.
   */
  get leftCollapsed(): boolean {
    return !this._leftHandler.sideBar.currentTitle;
  }

  /**
   * Whether the left area is collapsed.
   */
  get rightCollapsed(): boolean {
    return !this._rightHandler.sideBar.currentTitle;
  }

  /**
   * Whether JupyterLab is in presentation mode with the `jp-mod-presentationMode` CSS class.
   */
  get presentationMode(): boolean {
    return this.hasClass('jp-mod-presentationMode');
  }

  /**
   * Enable/disable presentation mode (`jp-mod-presentationMode` CSS class) with a boolean.
   */
  set presentationMode(value: boolean) {
    this.toggleClass('jp-mod-presentationMode', value);
  }

  /**
   * The main dock area's user interface mode.
   */
  get mode(): DockPanel.Mode {
    return this._dockPanel.mode;
  }
  set mode(mode: DockPanel.Mode) {
    const dock = this._dockPanel;
    if (mode === dock.mode) {
      return;
    }

    if (mode === 'single-document') {
      this._cachedLayout = dock.saveLayout();
      dock.mode = mode;

      // In case the active widget in the dock panel is *not* the active widget
      // of the application, defer to the application.
      if (this.currentWidget) {
        dock.activateWidget(this.currentWidget);
      }

      // Set the mode data attribute on the document body.
      document.body.setAttribute(MODE_ATTRIBUTE, mode);
      return;
    }

    // Cache a reference to every widget currently in the dock panel.
    const widgets = toArray(dock.widgets());

    // Toggle back to multiple document mode.
    dock.mode = mode;

    // Restore the original layout.
    if (this._cachedLayout) {

      // Remove any disposed widgets in the cached layout and restore.
      Private.normalizeAreaConfig(dock, this._cachedLayout.main);
      dock.restoreLayout(this._cachedLayout);
      this._cachedLayout = null;
    }

    // Add any widgets created during single document mode, which have
    // subsequently been removed from the dock panel after the multiple document
    // layout has been restored.
    widgets.forEach(widget => {
      if (!widget.parent) {
        this.addToMainArea(widget, { activate: false });
      }
    });

    // In case the active widget in the dock panel is *not* the active widget
    // of the application, defer to the application.
    if (this.currentWidget) {
      dock.activateWidget(this.currentWidget);
    }

    // Set the mode data attribute on the document body.
    document.body.setAttribute(MODE_ATTRIBUTE, mode);
  }

  /**
   * Promise that resolves when state is first restored, returning layout
   * description.
   */
  get restored(): Promise<ApplicationShell.ILayout> {
    return this._restored.promise;
  }

  /**
   * Activate a widget in its area.
   */
  activateById(id: string): void {
    if (this._leftHandler.has(id)) {
      this._leftHandler.activate(id);
      return;
    }

    if (this._rightHandler.has(id)) {
      this._rightHandler.activate(id);
      return;
    }

    const dock = this._dockPanel;
    const widget = find(dock.widgets(), value => value.id === id);

    if (widget) {
      dock.activateWidget(widget);
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
      if (current.currentTitle) {
        current.currentTitle.owner.activate();
      }
      return;
    }

    if (ci === current.titles.length - 1) {
      let nextBar = this._adjacentBar('next');
      if (nextBar) {
        nextBar.currentIndex = 0;
        if (nextBar.currentTitle) {
          nextBar.currentTitle.owner.activate();
        }
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
      if (current.currentTitle) {
        current.currentTitle.owner.activate();
      }
      return;
    }

    if (ci === 0) {
      let prevBar = this._adjacentBar('previous');
      if (prevBar) {
        let len = prevBar.titles.length;
        prevBar.currentIndex = len - 1;
        if (prevBar.currentTitle) {
          prevBar.currentTitle.owner.activate();
        }
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
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    let rank = 'rank' in options ? options.rank : DEFAULT_RANK;
    this._leftHandler.addWidget(widget, rank!);
    this._layoutModified.emit(void 0);
  }

  /**
   * Add a widget to the main content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   * All widgets added to the main area should be disposed after removal (or
   * simply disposed in order to remove).
   */
  addToMainArea(widget: Widget, options: ApplicationShell.IMainAreaOptions = {}): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }

    let dock = this._dockPanel;

    let ref: Widget | null = null;
    if (options.ref) {
      ref = find(dock.widgets(), value => value.id === options.ref!) || null;
    }

    let mode = options.mode || 'tab-after';

    dock.addWidget(widget, { mode, ref });

    if (options.activate !== false) {
      dock.activateWidget(widget);
    }
  }

  /**
   * Add a widget to the right content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  addToRightArea(widget: Widget, options: ApplicationShell.ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    let rank = 'rank' in options ? options.rank : DEFAULT_RANK;
    this._rightHandler.addWidget(widget, rank!);
    this._onLayoutModified();
  }

  /**
   * Add a widget to the top content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  addToTopArea(widget: Widget, options: ApplicationShell.ISideAreaOptions = {}): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    // Temporary: widgets are added to the panel in order of insertion.
    this._topPanel.addWidget(widget);
    this._onLayoutModified();
  }

  /**
   * Collapse the left area.
   */
  collapseLeft(): void {
    this._leftHandler.collapse();
    this._onLayoutModified();
  }

  /**
   * Collapse the right area.
   */
  collapseRight(): void {
    this._rightHandler.collapse();
    this._onLayoutModified();
  }

  /**
   * Expand the left area.
   *
   * #### Notes
   * This will open the most recently used tab,
   * or the first tab if there is no most recently used.
   */
  expandLeft(): void {
    this._leftHandler.expand();
    this._onLayoutModified();
  }

  /**
   * Expand the right area.
   *
   * #### Notes
   * This will open the most recently used tab,
   * or the first tab if there is no most recently used.
   */
  expandRight(): void {
    this._rightHandler.expand();
    this._onLayoutModified();
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
   * Restore the layout state for the application shell.
   */
  restoreLayout(layout: ApplicationShell.ILayout): void {
    const { mainArea, leftArea, rightArea } = layout;

    // Rehydrate the main area.
    if (mainArea) {
      const { currentWidget, dock, mode } = mainArea;

      if (dock) {
        this._dockPanel.restoreLayout(dock);
      }
      if (mode) {
        this.mode = mode;
      }
      if (currentWidget) {
        this.activateById(currentWidget.id);
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

    if (!this._isRestored) {
      // Make sure all messages in the queue are finished before notifying
      // any extensions that are waiting for the promise that guarantees the
      // application state has been restored.
      MessageLoop.flush();
      this._restored.resolve(layout);
    }
  }

  /**
   * Save the dehydrated state of the application shell.
   */
  saveLayout(): ApplicationShell.ILayout {
    // If the application is in single document mode, use the cached layout if
    // available. Otherwise, default to querying the dock panel for layout.
    return {
      mainArea: {
        currentWidget: this._tracker.currentWidget,
        dock: this.mode === 'single-document' ?
          this._cachedLayout || this._dockPanel.saveLayout()
            : this._dockPanel.saveLayout(),
        mode: this._dockPanel.mode
      },
      leftArea: this._leftHandler.dehydrate(),
      rightArea: this._rightHandler.dehydrate()
    };
  }

  /**
   * Returns the widgets for an application area.
   */
  widgets(area: ApplicationShell.Area): IIterator<Widget> {
    switch (area) {
      case 'main':
        return this._dockPanel.widgets();
      case 'left':
        return iter(this._leftHandler.sideBar.titles.map(t => t.owner));
      case 'right':
        return iter(this._rightHandler.sideBar.titles.map(t => t.owner));
      case 'top':
        return this._topPanel.children();
      default:
        throw new Error('Invalid area');
    }
  }

  /**
   * Handle `after-attach` messages for the application shell.
   */
  protected onAfterAttach(msg: Message): void {
    document.body.setAttribute(MODE_ATTRIBUTE, this.mode);
  }

  /*
   * Return the tab bar adjacent to the current TabBar or `null`.
   */
  private _adjacentBar(direction: 'next' | 'previous'): TabBar<Widget> | null {
    const current = this._currentTabBar();
    if (!current) {
      return null;
    }

    const bars = toArray(this._dockPanel.tabBars());
    const len = bars.length;
    const index = bars.indexOf(current);

    if (direction === 'previous') {
      return index > 0 ? bars[index - 1]
        : index === 0 ? bars[len - 1]
          : null;
    }

    // Otherwise, direction is 'next'.
    return index < len - 1 ? bars[index + 1]
      : index === len - 1 ? bars[0]
        : null;
  }

  /*
   * Return the TabBar that has the currently active Widget or null.
   */
  private _currentTabBar(): TabBar<Widget> | null {
    const current = this._tracker.currentWidget;
    if (!current) {
      return null;
    }

    const title = current.title;
    const bars = this._dockPanel.tabBars();
    return find(bars, bar => bar.titles.indexOf(title) > -1) || null;
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
    this._onLayoutModified();
  }

  /**
   * Handle a change to the layout.
   */
  private _onLayoutModified(): void {
    this._layoutModified.emit(void 0);
  }

  /**
   * A message hook for child add/remove messages on the main area dock panel.
   */
  private _dockChildHook = (handler: IMessageHandler, msg: Message): boolean => {
    switch (msg.type) {
      case 'child-added':
        (msg as Widget.ChildMessage).child.addClass(ACTIVITY_CLASS);
        this._tracker.add((msg as Widget.ChildMessage).child);
        break;
      case 'child-removed':
        (msg as Widget.ChildMessage).child.removeClass(ACTIVITY_CLASS);
        this._tracker.remove((msg as Widget.ChildMessage).child);
        break;
      default:
        break;
    }
    return true;
  }

  private _activeChanged = new Signal<this, ApplicationShell.IChangedArgs>(this);
  private _cachedLayout: DockLayout.ILayoutConfig | null = null;
  private _currentChanged = new Signal<this, ApplicationShell.IChangedArgs>(this);
  private _dockPanel: DockPanel;
  private _hboxPanel: BoxPanel;
  private _hsplitPanel: SplitPanel;
  private _isRestored = false;
  private _layoutModified = new Signal<this, void>(this);
  private _leftHandler: Private.SideBarHandler;
  private _restored = new PromiseDelegate<ApplicationShell.ILayout>();
  private _rightHandler: Private.SideBarHandler;
  private _tracker = new FocusTracker<Widget>();
  private _topPanel: Panel;
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

    /**
     * The document mode (i.e., multiple/single) of the main dock panel.
     */
    readonly mode: DockPanel.Mode | null;
  }

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

  /**
   * The options for adding a widget to a side area of the shell.
   */
  export
  interface IMainAreaOptions extends DocumentRegistry.IOpenOptions {}
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
   * Removes widgets that have been disposed from an area config, mutates area.
   */
  export
  function normalizeAreaConfig(parent: DockPanel, area?: DockLayout.AreaConfig | null): void {
    if (!area) {
      return;
    }
    if (area.type === 'tab-area') {
      area.widgets = area.widgets
        .filter(widget => !widget.isDisposed && widget.parent === parent) as Widget[];
      return;
    }
    area.children.forEach(child => { normalizeAreaConfig(parent, child); });
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
      this._lastCurrent = null;
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
     * Expand the sidebar.
     *
     * #### Notes
     * This will open the most recently used tab, or the first tab
     * if there is no most recently used.
     */
    expand(): void {
      const previous =
        this._lastCurrent || (this._items.length > 0 && this._items[0].widget);
      if (previous) {
        this.activate(previous.id);
      }
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
      return ArrayExt.findFirstIndex(this._items, i => i.widget === widget);
    }

    /**
     * Find the widget which owns the given title, or `null`.
     */
    private _findWidgetByTitle(title: Title<Widget>): Widget | null {
      let item = find(this._items, value => value.widget.title === title);
      return item ? item.widget : null;
    }

    /**
     * Find the widget with the given id, or `null`.
     */
    private _findWidgetByID(id: string): Widget | null {
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
      const oldWidget = args.previousTitle ? this._findWidgetByTitle(args.previousTitle) : null;
      const newWidget = args.currentTitle ? this._findWidgetByTitle(args.currentTitle) : null;
      if (oldWidget) {
        oldWidget.hide();
      }
      if (newWidget) {
        newWidget.show();
      }
      this._lastCurrent = newWidget || oldWidget;
      if (newWidget) {
        const id = newWidget.id;
        document.body.setAttribute(`data-${this._side}-sidebar-widget`, id);
      } else {
        document.body.removeAttribute(`data-${this._side}-sidebar-widget`);
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
      if (widget === this._lastCurrent) {
        this._lastCurrent = null;
      }
      ArrayExt.removeAt(this._items, this._findWidgetIndex(widget));
      this._sideBar.removeTab(widget.title);
      this._refreshVisibility();
    }

    private _items = new Array<Private.IRankItem>();
    private _side: string;
    private _sideBar: TabBar<Widget>;
    private _stackedPanel: StackedPanel;
    private _lastCurrent: Widget | null;
  }

}

