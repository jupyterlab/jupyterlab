// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentRegistry, DocumentWidget } from '@jupyterlab/docregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  classes,
  DockPanelSvg,
  LabIcon,
  SidePanel,
  TabBarSvg,
  tabIcon,
  TabPanelSvg
} from '@jupyterlab/ui-components';
import { ArrayExt, find, map } from '@lumino/algorithm';
import { JSONExt, PromiseDelegate, Token } from '@lumino/coreutils';
import { IMessageHandler, Message, MessageLoop } from '@lumino/messaging';
import { Debouncer } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import {
  AccordionPanel,
  BoxLayout,
  BoxPanel,
  DockLayout,
  DockPanel,
  FocusTracker,
  Panel,
  SplitPanel,
  StackedPanel,
  TabBar,
  TabPanel,
  Title,
  Widget
} from '@lumino/widgets';
import { JupyterFrontEnd } from './frontend';
import { LayoutRestorer } from './layoutrestorer';

/**
 * The class name added to AppShell instances.
 */
const APPLICATION_SHELL_CLASS = 'jp-LabShell';

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
const DEFAULT_RANK = 900;

const ACTIVITY_CLASS = 'jp-Activity';

/**
 * The JupyterLab application shell token.
 */
export const ILabShell = new Token<ILabShell>(
  '@jupyterlab/application:ILabShell',
  'A service for interacting with the JupyterLab shell. The top-level `application` object also has a reference to the shell, but it has a restricted interface in order to be agnostic to different shell implementations on the application. Use this to get more detailed information about currently active widgets and layout state.'
);

/**
 * The JupyterLab application shell interface.
 */
export interface ILabShell extends LabShell {}

/**
 * The namespace for `ILabShell` type information.
 */
export namespace ILabShell {
  /**
   * The areas of the application shell where widgets can reside.
   */
  export type Area =
    | 'main'
    | 'header'
    | 'top'
    | 'menu'
    | 'left'
    | 'right'
    | 'bottom'
    | 'down';

  /**
   * The restorable description of an area within the main dock panel.
   */
  export type AreaConfig = DockLayout.AreaConfig;

  /**
   * An options object for creating a lab shell object.
   */
  export type IOptions = {
    /**
     * Whether the layout should wait to be restored before adding widgets or not.
     *
     * #### Notes
     * It defaults to true
     */
    waitForRestore?: boolean;
  };

  /**
   * An arguments object for the changed signals.
   */
  export type IChangedArgs = FocusTracker.IChangedArgs<Widget>;

  export interface IConfig {
    /**
     * The method for hiding widgets in the dock panel.
     *
     * The default is `display`.
     *
     * Using `scale` will often increase performance as most browsers will not trigger style computation
     * for the transform action.
     *
     * `contentVisibility` is only available in Chromium-based browsers.
     */
    hiddenMode: 'display' | 'scale' | 'contentVisibility';
  }

  /**
   * Widget position
   */
  export interface IWidgetPosition {
    /**
     * Widget area
     */
    area?: Area;
    /**
     * Widget opening options
     */
    options?: DocumentRegistry.IOpenOptions;
  }

  /**
   * To-be-added widget and associated position
   */
  export interface IDelayedWidget extends IWidgetPosition {
    widget: Widget;
  }

  /**
   * Mapping of widget type identifier and their user customized position
   */
  export interface IUserLayout {
    /**
     * Widget customized position
     */
    [k: string]: IWidgetPosition;
  }

  /**
   * The args for the current path change signal.
   */
  export interface ICurrentPathChangedArgs {
    /**
     * The new value of the tree path, not including '/tree'.
     */
    oldValue: string;

    /**
     * The old value of the tree path, not including '/tree'.
     */
    newValue: string;
  }

  /**
   * A description of the application's user interface layout.
   */
  export interface ILayout {
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
     * The down area of the user interface.
     */
    readonly downArea: IDownArea | null;

    /**
     * The left area of the user interface.
     */
    readonly leftArea: ISideArea | null;

    /**
     * The right area of the user interface.
     */
    readonly rightArea: ISideArea | null;

    /**
     * The top area of the user interface.
     */
    readonly topArea: ITopArea | null;

    /**
     * The relatives sizes of the areas of the user interface.
     */
    readonly relativeSizes: number[] | null;
  }

  /**
   * The restorable description of the main application area.
   */
  export interface IMainArea {
    /**
     * The current widget that has application focus.
     */
    readonly currentWidget: Widget | null;

    /**
     * The contents of the main application dock panel.
     */
    readonly dock: DockLayout.ILayoutConfig | null;
  }

  export interface IDownArea {
    /**
     * The current widget that has down area focus.
     */
    readonly currentWidget: Widget | null;

    /**
     * The collection of widgets held by the panel.
     */
    readonly widgets: Array<Widget> | null;

    /**
     * Vertical relative size of the down area
     *
     * The main area will take the rest of the height
     */
    readonly size: number | null;
  }

  /**
   * The restorable description of a sidebar in the user interface.
   */
  export interface ISideArea {
    /**
     * A flag denoting whether the sidebar has been collapsed.
     */
    readonly collapsed: boolean;

    /**
     * The current widget that has side area focus.
     */
    readonly currentWidget: Widget | null;

    /**
     * A flag denoting whether the side tab bar is visible.
     */
    readonly visible: boolean;

    /**
     * The collection of widgets held by the sidebar.
     */
    readonly widgets: Array<Widget> | null;

    /**
     * The collection of widgets states held by the sidebar.
     */
    readonly widgetStates: {
      [id: string]: {
        /**
         * Vertical sizes of the widgets.
         */
        readonly sizes: Array<number> | null;

        /**
         * Expansion states of the widgets.
         */
        readonly expansionStates: Array<boolean> | null;
      };
    };
  }

  /**
   * The restorable description of the top area in the user interface.
   */
  export interface ITopArea {
    /**
     * Top area visibility in simple mode.
     */
    readonly simpleVisibility: boolean;
  }
}

/**
 * The restorable description of the top area in the user interface.
 *
 * @deprecated It has been moved to {@link ILabShell.ITopArea} for consistency.
 */
export interface ITopArea extends ILabShell.ITopArea {}

/**
 * The application shell for JupyterLab.
 */
export class LabShell extends Widget implements JupyterFrontEnd.IShell {
  /**
   * Construct a new application shell.
   */
  constructor(options?: ILabShell.IOptions) {
    super();
    this.addClass(APPLICATION_SHELL_CLASS);
    this.id = 'main';
    if (options?.waitForRestore === false) {
      this._userLayout = { 'multiple-document': {}, 'single-document': {} };
    }

    // Skip Links
    const skipLinkWidget = (this._skipLinkWidget = new Private.SkipLinkWidget(
      this
    ));
    this._skipLinkWidget.show();
    //  Wrap the skip widget to customize its position and size
    const skipLinkWrapper = new Panel();
    skipLinkWrapper.addClass('jp-skiplink-wrapper');
    skipLinkWrapper.addWidget(skipLinkWidget);

    const headerPanel = (this._headerPanel = new BoxPanel());
    const menuHandler = (this._menuHandler = new Private.PanelHandler());
    menuHandler.panel.node.setAttribute('role', 'navigation');
    const topHandler = (this._topHandler = new Private.PanelHandler());
    topHandler.panel.node.setAttribute('role', 'banner');
    const bottomPanel = (this._bottomPanel = new BoxPanel());
    bottomPanel.node.setAttribute('role', 'contentinfo');
    const hboxPanel = new BoxPanel();
    const vsplitPanel = (this._vsplitPanel =
      new Private.RestorableSplitPanel());
    const dockPanel = (this._dockPanel = new DockPanelSvg({
      hiddenMode: Widget.HiddenMode.Display
    }));
    MessageLoop.installMessageHook(dockPanel, this._dockChildHook);

    const hsplitPanel = (this._hsplitPanel =
      new Private.RestorableSplitPanel());
    const downPanel = (this._downPanel = new TabPanelSvg({
      tabsMovable: true
    }));
    const leftHandler = (this._leftHandler = new Private.SideBarHandler());
    const rightHandler = (this._rightHandler = new Private.SideBarHandler());
    const rootLayout = new BoxLayout();

    headerPanel.id = 'jp-header-panel';
    menuHandler.panel.id = 'jp-menu-panel';
    topHandler.panel.id = 'jp-top-panel';
    bottomPanel.id = 'jp-bottom-panel';
    hboxPanel.id = 'jp-main-content-panel';
    vsplitPanel.id = 'jp-main-vsplit-panel';
    dockPanel.id = 'jp-main-dock-panel';
    hsplitPanel.id = 'jp-main-split-panel';
    downPanel.id = 'jp-down-stack';

    leftHandler.sideBar.addClass(SIDEBAR_CLASS);
    leftHandler.sideBar.addClass('jp-mod-left');
    leftHandler.sideBar.node.setAttribute('role', 'complementary');
    leftHandler.stackedPanel.id = 'jp-left-stack';

    rightHandler.sideBar.addClass(SIDEBAR_CLASS);
    rightHandler.sideBar.addClass('jp-mod-right');
    rightHandler.sideBar.node.setAttribute('role', 'complementary');
    rightHandler.stackedPanel.id = 'jp-right-stack';

    dockPanel.node.setAttribute('role', 'main');

    hboxPanel.spacing = 0;
    vsplitPanel.spacing = 1;
    dockPanel.spacing = 5;
    hsplitPanel.spacing = 1;

    headerPanel.direction = 'top-to-bottom';
    vsplitPanel.orientation = 'vertical';
    hboxPanel.direction = 'left-to-right';
    hsplitPanel.orientation = 'horizontal';
    bottomPanel.direction = 'bottom-to-top';

    SplitPanel.setStretch(leftHandler.stackedPanel, 0);
    SplitPanel.setStretch(downPanel, 0);
    SplitPanel.setStretch(dockPanel, 1);
    SplitPanel.setStretch(rightHandler.stackedPanel, 0);

    BoxPanel.setStretch(leftHandler.sideBar, 0);
    BoxPanel.setStretch(hsplitPanel, 1);
    BoxPanel.setStretch(rightHandler.sideBar, 0);

    SplitPanel.setStretch(vsplitPanel, 1);

    hsplitPanel.addWidget(leftHandler.stackedPanel);
    hsplitPanel.addWidget(dockPanel);
    hsplitPanel.addWidget(rightHandler.stackedPanel);

    vsplitPanel.addWidget(hsplitPanel);
    vsplitPanel.addWidget(downPanel);

    hboxPanel.addWidget(leftHandler.sideBar);
    hboxPanel.addWidget(vsplitPanel);
    hboxPanel.addWidget(rightHandler.sideBar);

    rootLayout.direction = 'top-to-bottom';
    rootLayout.spacing = 0; // TODO make this configurable?
    // Use relative sizing to set the width of the side panels.
    // This will still respect the min-size of children widget in the stacked
    // panel. The default sizes will be overwritten during layout restoration.
    vsplitPanel.setRelativeSizes([3, 1]);
    hsplitPanel.setRelativeSizes([1, 2.5, 1]);

    BoxLayout.setStretch(headerPanel, 0);
    BoxLayout.setStretch(menuHandler.panel, 0);
    BoxLayout.setStretch(topHandler.panel, 0);
    BoxLayout.setStretch(hboxPanel, 1);
    BoxLayout.setStretch(bottomPanel, 0);

    rootLayout.addWidget(skipLinkWrapper);
    rootLayout.addWidget(headerPanel);
    rootLayout.addWidget(topHandler.panel);
    rootLayout.addWidget(hboxPanel);
    rootLayout.addWidget(bottomPanel);

    // initially hiding header and bottom panel when no elements inside,
    this._headerPanel.hide();
    this._bottomPanel.hide();
    this._downPanel.hide();

    this.layout = rootLayout;

    // Connect change listeners.
    this._tracker.currentChanged.connect(this._onCurrentChanged, this);
    this._tracker.activeChanged.connect(this._onActiveChanged, this);

    // Connect main layout change listener.
    this._dockPanel.layoutModified.connect(this._onLayoutModified, this);

    // Connect vsplit layout change listener
    this._vsplitPanel.updated.connect(this._onLayoutModified, this);

    // Connect down panel change listeners
    this._downPanel.currentChanged.connect(this._onLayoutModified, this);
    this._downPanel.tabBar.tabMoved.connect(this._onTabPanelChanged, this);
    this._downPanel.stackedPanel.widgetRemoved.connect(
      this._onTabPanelChanged,
      this
    );

    // Catch current changed events on the side handlers.
    this._leftHandler.updated.connect(this._onLayoutModified, this);
    this._rightHandler.updated.connect(this._onLayoutModified, this);

    // Catch update events on the horizontal split panel
    this._hsplitPanel.updated.connect(this._onLayoutModified, this);

    // Setup single-document-mode title bar
    const titleHandler = (this._titleHandler = new Private.TitleHandler(this));
    this.add(titleHandler, 'top', { rank: 100 });

    if (this._dockPanel.mode === 'multiple-document') {
      this._topHandler.addWidget(this._menuHandler.panel, 100);
      titleHandler.hide();
    } else {
      rootLayout.insertWidget(3, this._menuHandler.panel);
    }

    this.translator = nullTranslator;

    // Wire up signals to update the title panel of the simple interface mode to
    // follow the title of this.currentWidget
    this.currentChanged.connect((sender, args) => {
      let newValue = args.newValue;
      let oldValue = args.oldValue;

      // Stop watching the title of the previously current widget
      if (oldValue) {
        oldValue.title.changed.disconnect(this._updateTitlePanelTitle, this);

        if (oldValue instanceof DocumentWidget) {
          oldValue.context.pathChanged.disconnect(
            this._updateCurrentPath,
            this
          );
        }
      }

      // Start watching the title of the new current widget
      if (newValue) {
        newValue.title.changed.connect(this._updateTitlePanelTitle, this);
        this._updateTitlePanelTitle();

        if (newValue instanceof DocumentWidget) {
          newValue.context.pathChanged.connect(this._updateCurrentPath, this);
        }
      }
      this._updateCurrentPath();
    });
  }

  /**
   * A signal emitted when main area's active focus changes.
   */
  get activeChanged(): ISignal<this, ILabShell.IChangedArgs> {
    return this._activeChanged;
  }

  /**
   * The active widget in the shell's main area.
   */
  get activeWidget(): Widget | null {
    return this._tracker.activeWidget;
  }

  /**
   * Whether the add buttons for each main area tab bar are enabled.
   */
  get addButtonEnabled(): boolean {
    return this._dockPanel.addButtonEnabled;
  }
  set addButtonEnabled(value: boolean) {
    this._dockPanel.addButtonEnabled = value;
  }

  /**
   * A signal emitted when the add button on a main area tab bar is clicked.
   */
  get addRequested(): ISignal<DockPanel, TabBar<Widget>> {
    return this._dockPanel.addRequested;
  }

  /**
   * A signal emitted when main area's current focus changes.
   */
  get currentChanged(): ISignal<this, ILabShell.IChangedArgs> {
    return this._currentChanged;
  }

  /**
   * Current document path.
   */
  // FIXME deprecation `undefined` is to ensure backward compatibility in 4.x
  get currentPath(): string | null | undefined {
    return this._currentPath;
  }

  /**
   * A signal emitted when the path of the current document changes.
   *
   * This also fires when the current document itself changes.
   */
  get currentPathChanged(): ISignal<this, ILabShell.ICurrentPathChangedArgs> {
    return this._currentPathChanged;
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
   * Whether JupyterLab is in presentation mode with the
   * `jp-mod-presentationMode` CSS class.
   */
  get presentationMode(): boolean {
    return this.hasClass('jp-mod-presentationMode');
  }
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

    const applicationCurrentWidget = this.currentWidget;

    if (mode === 'single-document') {
      // Cache the current multi-document layout before changing the mode.
      this._cachedLayout = dock.saveLayout();
      dock.mode = mode;

      // In case the active widget in the dock panel is *not* the active widget
      // of the application, defer to the application.
      if (this.currentWidget) {
        dock.activateWidget(this.currentWidget);
      }

      // Adjust menu and title
      (this.layout as BoxLayout).insertWidget(3, this._menuHandler.panel);
      this._titleHandler.show();
      this._updateTitlePanelTitle();
      if (this._topHandlerHiddenByUser) {
        this._topHandler.panel.hide();
      }
    } else {
      // Cache a reference to every widget currently in the dock panel before
      // changing its mode.
      const widgets = Array.from(dock.widgets());
      dock.mode = mode;

      // Restore cached layout if possible.
      if (this._cachedLayout) {
        // Remove any disposed widgets in the cached layout and restore.
        Private.normalizeAreaConfig(dock, this._cachedLayout.main);
        dock.restoreLayout(this._cachedLayout);
        this._cachedLayout = null;
      }

      // If layout restoration has been deferred, restore layout now.
      if (this._layoutRestorer.isDeferred) {
        this._layoutRestorer
          .restoreDeferred()
          .then(mainArea => {
            if (mainArea) {
              const { currentWidget, dock } = mainArea;
              if (dock) {
                this._dockPanel.restoreLayout(dock);
              }
              if (currentWidget) {
                this.activateById(currentWidget.id);
              }
            }
          })
          .catch(reason => {
            console.error('Failed to restore the deferred layout.');
            console.error(reason);
          });
      }

      // Add any widgets created during single document mode, which have
      // subsequently been removed from the dock panel after the multiple document
      // layout has been restored. If the widget has add options cached for
      // the widget (i.e., if it has been placed with respect to another widget),
      // then take that into account.
      widgets.forEach(widget => {
        if (!widget.parent) {
          this._addToMainArea(widget, {
            ...this._mainOptionsCache.get(widget),
            activate: false
          });
        }
      });
      this._mainOptionsCache.clear();

      // In case the active widget in the dock panel is *not* the active widget
      // of the application, defer to the application.
      if (applicationCurrentWidget) {
        dock.activateWidget(applicationCurrentWidget);
      }

      // Adjust menu and title
      this.add(this._menuHandler.panel, 'top', { rank: 100 });
      this._titleHandler.hide();
    }

    // Set the mode data attribute on the applications shell node.
    this.node.dataset.shellMode = mode;

    this._downPanel.fit();
    // Emit the mode changed signal
    this._modeChanged.emit(mode);
  }

  /**
   * A signal emitted when the shell/dock panel change modes (single/multiple document).
   */
  get modeChanged(): ISignal<this, DockPanel.Mode> {
    return this._modeChanged;
  }

  /**
   * Promise that resolves when state is first restored, returning layout
   * description.
   */
  get restored(): Promise<ILabShell.ILayout> {
    return this._restored.promise;
  }

  get translator(): ITranslator {
    return this._translator ?? nullTranslator;
  }
  set translator(value: ITranslator) {
    if (value !== this._translator) {
      this._translator = value;

      // Set translator for tab bars
      TabBarSvg.translator = value;

      const trans = value.load('jupyterlab');
      this._menuHandler.panel.node.setAttribute(
        'aria-label',
        trans.__('main menu')
      );
      this._leftHandler.sideBar.node.setAttribute(
        'aria-label',
        trans.__('main sidebar')
      );
      this._leftHandler.sideBar.contentNode.setAttribute(
        'aria-label',
        trans.__('main sidebar')
      );
      this._rightHandler.sideBar.node.setAttribute(
        'aria-label',
        trans.__('alternate sidebar')
      );
      this._rightHandler.sideBar.contentNode.setAttribute(
        'aria-label',
        trans.__('alternate sidebar')
      );
      this._topHandler.panel.node.setAttribute(
        'aria-label',
        trans.__('Top Bar')
      );
      this._bottomPanel.node.setAttribute(
        'aria-label',
        trans.__('Bottom Panel')
      );
      this._dockPanel.node.setAttribute('aria-label', trans.__('Main Content'));
    }
  }

  /**
   * User customized shell layout.
   */
  get userLayout(): {
    'single-document': ILabShell.IUserLayout;
    'multiple-document': ILabShell.IUserLayout;
  } {
    return JSONExt.deepCopy(this._userLayout as any);
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

    const tabIndex = this._downPanel.tabBar.titles.findIndex(
      title => title.owner.id === id
    );
    if (tabIndex >= 0) {
      this._downPanel.currentIndex = tabIndex;
      return;
    }

    const dock = this._dockPanel;
    const widget = find(dock.widgets(), value => value.id === id);

    if (widget) {
      dock.activateWidget(widget);
    }
  }

  /**
   * Activate widget in specified area.
   *
   * ### Notes
   * The alpha version of this method only supports activating the "main" area.
   *
   * @alpha
   * @param area Name of area to activate
   */
  activateArea(area: ILabShell.Area = 'main'): void {
    switch (area) {
      case 'main':
        {
          const current = this._currentTabBar();
          if (!current) {
            return;
          }
          if (current.currentTitle) {
            current.currentTitle.owner.activate();
          }
        }
        return;
      case 'left':
      case 'right':
      case 'header':
      case 'top':
      case 'menu':
      case 'bottom':
        console.debug(`Area: ${area} activation not yet implemented`);
        break;
      default:
        throw new Error(`Invalid area: ${area}`);
    }
  }
  /**
   * Activate the next Tab in the active TabBar.
   */
  activateNextTab(): void {
    const current = this._currentTabBar();
    if (!current) {
      return;
    }

    const ci = current.currentIndex;
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
      const nextBar = this._adjacentBar('next');
      if (nextBar) {
        nextBar.currentIndex = 0;
        if (nextBar.currentTitle) {
          nextBar.currentTitle.owner.activate();
        }
      }
    }
  }

  /**
   * Activate the previous Tab in the active TabBar.
   */
  activatePreviousTab(): void {
    const current = this._currentTabBar();
    if (!current) {
      return;
    }

    const ci = current.currentIndex;
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
      const prevBar = this._adjacentBar('previous');
      if (prevBar) {
        const len = prevBar.titles.length;
        prevBar.currentIndex = len - 1;
        if (prevBar.currentTitle) {
          prevBar.currentTitle.owner.activate();
        }
      }
    }
  }

  /**
   * Activate the next TabBar.
   */
  activateNextTabBar(): void {
    const nextBar = this._adjacentBar('next');
    if (nextBar) {
      if (nextBar.currentTitle) {
        nextBar.currentTitle.owner.activate();
      }
    }
  }

  /**
   * Activate the next TabBar.
   */
  activatePreviousTabBar(): void {
    const nextBar = this._adjacentBar('previous');
    if (nextBar) {
      if (nextBar.currentTitle) {
        nextBar.currentTitle.owner.activate();
      }
    }
  }

  /**
   * Add a widget to the JupyterLab shell
   *
   * @param widget Widget
   * @param area Area
   * @param options Options
   */
  add(
    widget: Widget,
    area: ILabShell.Area = 'main',
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!this._userLayout) {
      this._delayedWidget.push({ widget, area, options });
      return;
    }

    let userPosition: ILabShell.IWidgetPosition | undefined;
    if (options?.type && this._userLayout[this.mode][options.type]) {
      userPosition = this._userLayout[this.mode][options.type];
      this._idTypeMap.set(widget.id, options.type);
    } else {
      userPosition = this._userLayout[this.mode][widget.id];
    }
    if (options?.type) {
      this._idTypeMap.set(widget.id, options.type);
      widget.disposed.connect(() => {
        this._idTypeMap.delete(widget.id);
      });
    }

    area = userPosition?.area ?? area;
    options =
      options || userPosition?.options
        ? {
            ...options,
            ...userPosition?.options
          }
        : undefined;

    switch (area || 'main') {
      case 'bottom':
        return this._addToBottomArea(widget, options);
      case 'down':
        return this._addToDownArea(widget, options);
      case 'header':
        return this._addToHeaderArea(widget, options);
      case 'left':
        return this._addToLeftArea(widget, options);
      case 'main':
        return this._addToMainArea(widget, options);
      case 'menu':
        return this._addToMenuArea(widget, options);
      case 'right':
        return this._addToRightArea(widget, options);
      case 'top':
        return this._addToTopArea(widget, options);
      default:
        throw new Error(`Invalid area: ${area}`);
    }
  }

  /**
   * Move a widget type to a new area.
   *
   * The type is determined from the `widget.id` and fallback to `widget.id`.
   *
   * #### Notes
   * If `mode` is undefined, both mode are updated.
   * The new layout is now persisted.
   *
   * @param widget Widget to move
   * @param area New area
   * @param mode Mode to change
   * @returns The new user layout
   */
  move(
    widget: Widget,
    area: ILabShell.Area,
    mode?: DockPanel.Mode
  ): {
    'single-document': ILabShell.IUserLayout;
    'multiple-document': ILabShell.IUserLayout;
  } {
    const type = this._idTypeMap.get(widget.id) ?? widget.id;
    for (const m of ['single-document', 'multiple-document'].filter(
      c => !mode || c === mode
    )) {
      this._userLayout[m as DockPanel.Mode][type] = {
        ...this._userLayout[m as DockPanel.Mode][type],
        area
      };
    }

    this.add(widget, area);

    return this._userLayout;
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
   * Dispose the shell.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._layoutDebouncer.dispose();
    super.dispose();
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
   * Close all widgets in the main and down area.
   */
  closeAll(): void {
    // Make a copy of all the widget in the dock panel (using `Array.from()`)
    // before removing them because removing them while iterating through them
    // modifies the underlying data of the iterator.
    Array.from(this._dockPanel.widgets()).forEach(widget => widget.close());

    this._downPanel.stackedPanel.widgets.forEach(widget => widget.close());
  }

  /**
   * Whether an side tab bar is visible or not.
   *
   * @param side Sidebar of interest
   * @returns Side tab bar visibility
   */
  isSideTabBarVisible(side: 'left' | 'right'): boolean {
    switch (side) {
      case 'left':
        return this._leftHandler.isVisible;
      case 'right':
        return this._rightHandler.isVisible;
    }
  }

  /**
   * Whether the top bar in simple mode is visible or not.
   *
   * @returns Top bar visibility
   */
  isTopInSimpleModeVisible(): boolean {
    return !this._topHandlerHiddenByUser;
  }

  /**
   * True if the given area is empty.
   */
  isEmpty(area: ILabShell.Area): boolean {
    switch (area) {
      case 'bottom':
        return this._bottomPanel.widgets.length === 0;
      case 'down':
        return this._downPanel.stackedPanel.widgets.length === 0;
      case 'header':
        return this._headerPanel.widgets.length === 0;
      case 'left':
        return this._leftHandler.stackedPanel.widgets.length === 0;
      case 'main':
        return this._dockPanel.isEmpty;
      case 'menu':
        return this._menuHandler.panel.widgets.length === 0;
      case 'right':
        return this._rightHandler.stackedPanel.widgets.length === 0;
      case 'top':
        return this._topHandler.panel.widgets.length === 0;
      default:
        return true;
    }
  }

  /**
   * Restore the layout state and configuration for the application shell.
   *
   * #### Notes
   * This should only be called once.
   */
  async restoreLayout(
    mode: DockPanel.Mode,
    layoutRestorer: LayoutRestorer,
    configuration: {
      [m: string]: ILabShell.IUserLayout;
    } = {}
  ): Promise<void> {
    // Set the configuration and add widgets added before the shell was ready.
    this._userLayout = {
      'single-document': configuration['single-document'] ?? {},
      'multiple-document': configuration['multiple-document'] ?? {}
    };
    this._delayedWidget.forEach(({ widget, area, options }) => {
      this.add(widget, area, options);
    });
    this._delayedWidget.length = 0;
    this._layoutRestorer = layoutRestorer;

    // Get the layout from the restorer
    const layout = await layoutRestorer.fetch();

    // Reset the layout
    const { mainArea, downArea, leftArea, rightArea, topArea, relativeSizes } =
      layout;

    // Rehydrate the main area.
    if (mainArea) {
      const { currentWidget, dock } = mainArea;

      if (dock && mode === 'multiple-document') {
        this._dockPanel.restoreLayout(dock);
      }
      if (mode) {
        this.mode = mode;
      }
      if (currentWidget) {
        this.activateById(currentWidget.id);
      }
    } else {
      // This is needed when loading in an empty workspace in single doc mode
      if (mode) {
        this.mode = mode;
      }
    }

    if (topArea?.simpleVisibility !== undefined) {
      this._topHandlerHiddenByUser = !topArea.simpleVisibility;
      if (this.mode === 'single-document') {
        this._topHandler.panel.setHidden(this._topHandlerHiddenByUser);
      }
    }

    // Rehydrate the down area
    if (downArea) {
      const { currentWidget, widgets, size } = downArea;

      const widgetIds = widgets?.map(widget => widget.id) ?? [];
      // Remove absent widgets
      this._downPanel.tabBar.titles
        .filter(title => !widgetIds.includes(title.owner.id))
        .map(title => title.owner.close());
      // Add new widgets
      const titleIds = this._downPanel.tabBar.titles.map(
        title => title.owner.id
      );
      widgets
        ?.filter(widget => !titleIds.includes(widget.id))
        .map(widget => this._downPanel.addWidget(widget));
      // Reorder tabs
      while (
        !ArrayExt.shallowEqual(
          widgetIds,
          this._downPanel.tabBar.titles.map(title => title.owner.id)
        )
      ) {
        this._downPanel.tabBar.titles.forEach((title, index) => {
          const position = widgetIds.findIndex(id => title.owner.id == id);
          if (position >= 0 && position != index) {
            this._downPanel.tabBar.insertTab(position, title);
          }
        });
      }

      if (currentWidget) {
        const index = this._downPanel.stackedPanel.widgets.findIndex(
          widget => widget.id === currentWidget.id
        );
        if (index) {
          this._downPanel.currentIndex = index;
          this._downPanel.currentWidget?.activate();
        }
      }

      if (size && size > 0.0) {
        this._vsplitPanel.setRelativeSizes([1.0 - size, size]);
      } else {
        // Close all tabs and hide the panel
        this._downPanel.stackedPanel.widgets.forEach(widget => widget.close());
        this._downPanel.hide();
      }
    }

    // Rehydrate the left area.
    if (leftArea) {
      this._leftHandler.rehydrate(leftArea);
    } else {
      if (mode === 'single-document') {
        this.collapseLeft();
      }
    }

    // Rehydrate the right area.
    if (rightArea) {
      this._rightHandler.rehydrate(rightArea);
    } else {
      if (mode === 'single-document') {
        this.collapseRight();
      }
    }

    // Restore the relative sizes.
    if (relativeSizes) {
      this._hsplitPanel.setRelativeSizes(relativeSizes);
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
  saveLayout(): ILabShell.ILayout {
    // If the application is in single document mode, use the cached layout if
    // available. Otherwise, default to querying the dock panel for layout.
    const layout = {
      mainArea: {
        currentWidget: this._tracker.currentWidget,
        dock:
          this.mode === 'single-document'
            ? this._cachedLayout || this._dockPanel.saveLayout()
            : this._dockPanel.saveLayout()
      },
      downArea: {
        currentWidget: this._downPanel.currentWidget,
        widgets: Array.from(this._downPanel.stackedPanel.widgets),
        size: this._vsplitPanel.relativeSizes()[1]
      },
      leftArea: this._leftHandler.dehydrate(),
      rightArea: this._rightHandler.dehydrate(),
      topArea: { simpleVisibility: !this._topHandlerHiddenByUser },
      relativeSizes: this._hsplitPanel.relativeSizes()
    };
    return layout;
  }

  /**
   * Toggle top header visibility in simple mode
   *
   * Note: Does nothing in multi-document mode
   */
  toggleTopInSimpleModeVisibility(): void {
    if (this.mode === 'single-document') {
      if (this._topHandler.panel.isVisible) {
        this._topHandlerHiddenByUser = true;
        this._topHandler.panel.hide();
      } else {
        this._topHandlerHiddenByUser = false;
        this._topHandler.panel.show();

        this._updateTitlePanelTitle();
      }
      this._onLayoutModified();
    }
  }

  /**
   * Toggle side tab bar visibility
   *
   * @param side Sidebar of interest
   */
  toggleSideTabBarVisibility(side: 'right' | 'left'): void {
    if (side === 'right') {
      if (this._rightHandler.isVisible) {
        this._rightHandler.hide();
      } else {
        this._rightHandler.show();
      }
    } else {
      if (this._leftHandler.isVisible) {
        this._leftHandler.hide();
      } else {
        this._leftHandler.show();
      }
    }
  }

  /**
   * Update the shell configuration.
   *
   * @param config Shell configuration
   */
  updateConfig(config: Partial<ILabShell.IConfig>): void {
    if (config.hiddenMode) {
      switch (config.hiddenMode) {
        case 'display':
          this._dockPanel.hiddenMode = Widget.HiddenMode.Display;
          break;
        case 'scale':
          this._dockPanel.hiddenMode = Widget.HiddenMode.Scale;
          break;
        case 'contentVisibility':
          this._dockPanel.hiddenMode = Widget.HiddenMode.ContentVisibility;
          break;
      }
    }
  }

  /**
   * Returns the widgets for an application area.
   */
  widgets(area?: ILabShell.Area): IterableIterator<Widget> {
    switch (area ?? 'main') {
      case 'main':
        return this._dockPanel.widgets();
      case 'left':
        return map(this._leftHandler.sideBar.titles, t => t.owner);
      case 'right':
        return map(this._rightHandler.sideBar.titles, t => t.owner);
      case 'header':
        return this._headerPanel.children();
      case 'top':
        return this._topHandler.panel.children();
      case 'menu':
        return this._menuHandler.panel.children();
      case 'bottom':
        return this._bottomPanel.children();
      default:
        throw new Error(`Invalid area: ${area}`);
    }
  }

  /**
   * Handle `after-attach` messages for the application shell.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.dataset.shellMode = this.mode;
  }

  /**
   * Update the title panel title based on the title of the current widget.
   */
  private _updateTitlePanelTitle() {
    let current = this.currentWidget;
    const inputElement = this._titleHandler.inputElement;
    inputElement.value = current ? current.title.label : '';
    inputElement.title = current ? current.title.caption : '';
  }

  /**
   * The path of the current widget changed, fire the _currentPathChanged signal.
   */
  private _updateCurrentPath() {
    let current = this.currentWidget;
    let newValue = '';
    if (current && current instanceof DocumentWidget) {
      newValue = current.context.path;
    }
    this._currentPathChanged.emit({
      newValue: newValue,
      oldValue: this._currentPath
    });
    this._currentPath = newValue;
  }

  /**
   * Add a widget to the left content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  private _addToLeftArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    options = options || this._sideOptionsCache.get(widget) || {};
    this._sideOptionsCache.set(widget, options);
    const rank = 'rank' in options ? options.rank : DEFAULT_RANK;
    this._leftHandler.addWidget(widget, rank!);
    this._onLayoutModified();
  }

  /**
   * Add a widget to the main content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   * All widgets added to the main area should be disposed after removal
   * (disposal before removal will remove the widget automatically).
   *
   * In the options, `ref` defaults to `null`, `mode` defaults to `'tab-after'`,
   * and `activate` defaults to `true`.
   */
  private _addToMainArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }

    options = options || {};

    const dock = this._dockPanel;
    const mode = options.mode || 'tab-after';
    let ref: Widget | null = this.currentWidget;

    if (options.ref) {
      ref = find(dock.widgets(), value => value.id === options!.ref!) || null;
    }

    const { title } = widget;
    // Add widget ID to tab so that we can get a handle on the tab's widget
    // (for context menu support)
    title.dataset = { ...title.dataset, id: widget.id };

    if (title.icon instanceof LabIcon) {
      // bind an appropriate style to the icon
      title.icon = title.icon.bindprops({
        stylesheet: 'mainAreaTab'
      });
    } else if (typeof title.icon === 'string' || !title.icon) {
      // add some classes to help with displaying css background imgs
      title.iconClass = classes(title.iconClass, 'jp-Icon');
    }

    dock.addWidget(widget, { mode, ref });

    // The dock panel doesn't account for placement information while
    // in single document mode, so upon rehydrating any widgets that were
    // added will not be in the correct place. Cache the placement information
    // here so that we can later rehydrate correctly.
    if (dock.mode === 'single-document') {
      this._mainOptionsCache.set(widget, options);
    }

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
  private _addToRightArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    options = options || this._sideOptionsCache.get(widget) || {};

    const rank = 'rank' in options ? options.rank : DEFAULT_RANK;

    this._sideOptionsCache.set(widget, options);
    this._rightHandler.addWidget(widget, rank!);
    this._onLayoutModified();
  }

  /**
   * Add a widget to the top content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  private _addToTopArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    options = options || {};
    const rank = options.rank ?? DEFAULT_RANK;
    this._topHandler.addWidget(widget, rank);
    this._onLayoutModified();
    if (this._topHandler.panel.isHidden) {
      this._topHandler.panel.show();
    }
  }

  /**
   * Add a widget to the title content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  private _addToMenuArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    options = options || {};
    const rank = options.rank ?? DEFAULT_RANK;
    this._menuHandler.addWidget(widget, rank);
    this._onLayoutModified();
    if (this._menuHandler.panel.isHidden) {
      this._menuHandler.panel.show();
    }
  }

  /**
   * Add a widget to the header content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  private _addToHeaderArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    // Temporary: widgets are added to the panel in order of insertion.
    this._headerPanel.addWidget(widget);
    this._onLayoutModified();

    if (this._headerPanel.isHidden) {
      this._headerPanel.show();
    }
  }
  /**
   * Add a widget to the bottom content area.
   *
   * #### Notes
   * Widgets must have a unique `id` property, which will be used as the DOM id.
   */
  private _addToBottomArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }
    // Temporary: widgets are added to the panel in order of insertion.
    this._bottomPanel.addWidget(widget);
    this._onLayoutModified();

    if (this._bottomPanel.isHidden) {
      this._bottomPanel.show();
    }
  }

  private _addToDownArea(
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }

    options = options || {};

    const { title } = widget;
    // Add widget ID to tab so that we can get a handle on the tab's widget
    // (for context menu support)
    title.dataset = { ...title.dataset, id: widget.id };

    if (title.icon instanceof LabIcon) {
      // bind an appropriate style to the icon
      title.icon = title.icon.bindprops({
        stylesheet: 'mainAreaTab'
      });
    } else if (typeof title.icon === 'string' || !title.icon) {
      // add some classes to help with displaying css background imgs
      title.iconClass = classes(title.iconClass, 'jp-Icon');
    }

    this._downPanel.addWidget(widget);
    this._onLayoutModified();

    if (this._downPanel.isHidden) {
      this._downPanel.show();
    }
  }

  /*
   * Return the tab bar adjacent to the current TabBar or `null`.
   */
  private _adjacentBar(direction: 'next' | 'previous'): TabBar<Widget> | null {
    const current = this._currentTabBar();
    if (!current) {
      return null;
    }

    const bars = Array.from(this._dockPanel.tabBars());
    const len = bars.length;
    const index = bars.indexOf(current);

    if (direction === 'previous') {
      return index > 0 ? bars[index - 1] : index === 0 ? bars[len - 1] : null;
    }

    // Otherwise, direction is 'next'.
    return index < len - 1
      ? bars[index + 1]
      : index === len - 1
      ? bars[0]
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
  private _onActiveChanged(
    sender: any,
    args: FocusTracker.IChangedArgs<Widget>
  ): void {
    if (args.newValue) {
      args.newValue.title.className += ` ${ACTIVE_CLASS}`;
    }
    if (args.oldValue) {
      args.oldValue.title.className = args.oldValue.title.className.replace(
        ACTIVE_CLASS,
        ''
      );
    }
    this._activeChanged.emit(args);
  }

  /**
   * Handle a change to the dock area current widget.
   */
  private _onCurrentChanged(
    sender: any,
    args: FocusTracker.IChangedArgs<Widget>
  ): void {
    if (args.newValue) {
      args.newValue.title.className += ` ${CURRENT_CLASS}`;
    }
    if (args.oldValue) {
      args.oldValue.title.className = args.oldValue.title.className.replace(
        CURRENT_CLASS,
        ''
      );
    }
    this._currentChanged.emit(args);
    this._onLayoutModified();
  }

  /**
   * Handle a change on the down panel widgets
   */
  private _onTabPanelChanged(): void {
    if (this._downPanel.stackedPanel.widgets.length === 0) {
      this._downPanel.hide();
    }
    this._onLayoutModified();
  }

  /**
   * Handle a change to the layout.
   */
  private _onLayoutModified(): void {
    void this._layoutDebouncer.invoke();
  }

  /**
   * A message hook for child add/remove messages on the main area dock panel.
   */
  private _dockChildHook = (
    handler: IMessageHandler,
    msg: Message
  ): boolean => {
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
  };

  private _activeChanged = new Signal<this, ILabShell.IChangedArgs>(this);
  private _cachedLayout: DockLayout.ILayoutConfig | null = null;
  private _currentChanged = new Signal<this, ILabShell.IChangedArgs>(this);
  private _currentPath = '';
  private _currentPathChanged = new Signal<
    this,
    ILabShell.ICurrentPathChangedArgs
  >(this);
  private _modeChanged = new Signal<this, DockPanel.Mode>(this);
  private _dockPanel: DockPanel;
  private _downPanel: TabPanel;
  private _isRestored = false;
  private _layoutModified = new Signal<this, void>(this);
  private _layoutDebouncer = new Debouncer(() => {
    this._layoutModified.emit(undefined);
  }, 0);
  private _leftHandler: Private.SideBarHandler;
  private _restored = new PromiseDelegate<ILabShell.ILayout>();
  private _rightHandler: Private.SideBarHandler;
  private _tracker = new FocusTracker<Widget>();
  private _headerPanel: Panel;
  private _hsplitPanel: Private.RestorableSplitPanel;
  private _vsplitPanel: Private.RestorableSplitPanel;
  private _topHandler: Private.PanelHandler;
  private _topHandlerHiddenByUser = false;
  private _menuHandler: Private.PanelHandler;
  private _skipLinkWidget: Private.SkipLinkWidget;
  private _titleHandler: Private.TitleHandler;
  private _bottomPanel: Panel;
  private _idTypeMap = new Map<string, string>();
  private _mainOptionsCache = new Map<Widget, DocumentRegistry.IOpenOptions>();
  private _sideOptionsCache = new Map<Widget, DocumentRegistry.IOpenOptions>();
  private _userLayout: {
    'single-document': ILabShell.IUserLayout;
    'multiple-document': ILabShell.IUserLayout;
  };
  private _delayedWidget = new Array<ILabShell.IDelayedWidget>();
  private _translator: ITranslator;
  private _layoutRestorer: LayoutRestorer;
}

namespace Private {
  /**
   * An object which holds a widget and its sort rank.
   */
  export interface IRankItem {
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
  export function itemCmp(first: IRankItem, second: IRankItem): number {
    return first.rank - second.rank;
  }

  /**
   * Removes widgets that have been disposed from an area config, mutates area.
   */
  export function normalizeAreaConfig(
    parent: DockPanel,
    area?: DockLayout.AreaConfig | null
  ): void {
    if (!area) {
      return;
    }
    if (area.type === 'tab-area') {
      area.widgets = area.widgets.filter(
        widget => !widget.isDisposed && widget.parent === parent
      ) as Widget[];
      return;
    }
    area.children.forEach(child => {
      normalizeAreaConfig(parent, child);
    });
  }

  /**
   * A class which manages a panel and sorts its widgets by rank.
   */
  export class PanelHandler {
    constructor() {
      MessageLoop.installMessageHook(this._panel, this._panelChildHook);
    }

    /**
     * Get the panel managed by the handler.
     */
    get panel(): Panel {
      return this._panel;
    }

    /**
     * Add a widget to the panel.
     *
     * If the widget is already added, it will be moved.
     */
    addWidget(widget: Widget, rank: number): void {
      widget.parent = null;
      const item = { widget, rank };
      const index = ArrayExt.upperBound(this._items, item, Private.itemCmp);
      ArrayExt.insert(this._items, index, item);
      this._panel.insertWidget(index, widget);
    }

    /**
     * A message hook for child add/remove messages on the main area dock panel.
     */
    private _panelChildHook = (
      handler: IMessageHandler,
      msg: Message
    ): boolean => {
      switch (msg.type) {
        case 'child-added':
          {
            const widget = (msg as Widget.ChildMessage).child;
            // If we already know about this widget, we're done
            if (this._items.find(v => v.widget === widget)) {
              break;
            }

            // Otherwise, add to the end by default
            const rank = this._items[this._items.length - 1].rank;
            this._items.push({ widget, rank });
          }
          break;
        case 'child-removed':
          {
            const widget = (msg as Widget.ChildMessage).child;
            ArrayExt.removeFirstWhere(this._items, v => v.widget === widget);
          }
          break;
        default:
          break;
      }
      return true;
    };

    private _items = new Array<Private.IRankItem>();
    private _panel = new Panel();
  }

  /**
   * A class which manages a side bar and related stacked panel.
   */
  export class SideBarHandler {
    /**
     * Construct a new side bar handler.
     */
    constructor() {
      this._sideBar = new TabBar<Widget>({
        insertBehavior: 'none',
        removeBehavior: 'none',
        allowDeselect: true,
        orientation: 'vertical'
      });
      this._stackedPanel = new StackedPanel();
      this._sideBar.hide();
      this._stackedPanel.hide();
      this._lastCurrent = null;
      this._sideBar.currentChanged.connect(this._onCurrentChanged, this);
      this._sideBar.tabActivateRequested.connect(
        this._onTabActivateRequested,
        this
      );
      this._stackedPanel.widgetRemoved.connect(this._onWidgetRemoved, this);
    }

    /**
     * Whether the side bar is visible
     */
    get isVisible(): boolean {
      return this._sideBar.isVisible;
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
     * Signal fires when the stack panel or the sidebar changes
     */
    get updated(): ISignal<SideBarHandler, void> {
      return this._updated;
    }

    /**
     * Handles a movement to the handles of a widget
     */
    private _onHandleMoved(): void {
      return this._refreshVisibility();
    }

    /**
     * Handles changes to the expansion status of a widget
     */
    private _onExpansionToggle(sender: AccordionPanel, index: number): void {
      return this._refreshVisibility();
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
      const widget = this._findWidgetByID(id);
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
      const item = { widget, rank };
      const index = this._findInsertIndex(item);
      ArrayExt.insert(this._items, index, item);
      this._stackedPanel.insertWidget(index, widget);
      const title = this._sideBar.insertTab(index, widget.title);
      // Store the parent id in the title dataset
      // in order to dispatch click events to the right widget.
      title.dataset = { id: widget.id };
      if (title.icon instanceof LabIcon) {
        // bind an appropriate style to the icon
        title.icon = title.icon.bindprops({
          stylesheet: 'sideBar'
        });
      } else if (typeof title.icon === 'string' && title.icon != '') {
        // add some classes to help with displaying css background imgs
        title.iconClass = classes(title.iconClass, 'jp-Icon', 'jp-Icon-20');
      } else if (!title.icon && !title.label) {
        // add a fallback icon if there is no title label nor icon
        title.icon = tabIcon.bindprops({
          stylesheet: 'sideBar'
        });
      }
      // @ts-expect-error sometimes widget is an Accordion Panel
      widget.content?.expansionToggled?.connect(this._onExpansionToggle, this);
      // @ts-expect-error sometimes widget is a SidePanel
      widget.content?.handleMoved?.connect(this._onHandleMoved, this);
      this._refreshVisibility();
    }

    /**
     * Dehydrate the side bar data.
     */
    dehydrate(): ILabShell.ISideArea {
      const collapsed = this._sideBar.currentTitle === null;
      const widgets = Array.from(this._stackedPanel.widgets);
      const currentWidget = widgets[this._sideBar.currentIndex];
      const widgetStates: {
        [id: string]: {
          sizes: number[] | null;
          expansionStates: boolean[] | null;
        };
      } = {};
      this._stackedPanel.widgets.forEach((w: SidePanel) => {
        if (w.id && w.content instanceof SplitPanel) {
          widgetStates[w.id] = {
            sizes: w.content.relativeSizes() as number[],
            expansionStates: w.content.widgets.map(wi => wi.isVisible)
          };
        }
      });
      return {
        collapsed,
        currentWidget,
        visible: !this._isHiddenByUser,
        widgets,
        widgetStates
      };
    }

    /**
     * Rehydrate the side bar.
     */
    rehydrate(data: ILabShell.ISideArea): void {
      if (data.currentWidget) {
        this.activate(data.currentWidget.id);
      }
      if (data.collapsed) {
        this.collapse();
      }
      if (!data.visible) {
        this.hide();
      }
      if (data.widgetStates) {
        this._stackedPanel.widgets.forEach((w: SidePanel) => {
          if (w.id && w.content instanceof SplitPanel) {
            const state = data.widgetStates[w.id] ?? {};
            w.content.widgets.forEach((wi, widx) => {
              const expansion = (state.expansionStates ?? [])[widx];
              if (
                typeof expansion === 'boolean' &&
                w.content instanceof AccordionPanel
              ) {
                expansion ? w.content.expand(widx) : w.content.collapse(widx);
              }
            });
            if (state.sizes) {
              w.content.setRelativeSizes(state.sizes);
            }
          }
        });
      }
    }

    /**
     * Hide the side bar even if it contains widgets
     */
    hide(): void {
      this._isHiddenByUser = true;
      this._refreshVisibility();
    }

    /**
     * Show the side bar if it contains widgets
     */
    show(): void {
      this._isHiddenByUser = false;
      this._refreshVisibility();
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
      const item = find(this._items, value => value.widget.title === title);
      return item ? item.widget : null;
    }

    /**
     * Find the widget with the given id, or `null`.
     */
    private _findWidgetByID(id: string): Widget | null {
      const item = find(this._items, value => value.widget.id === id);
      return item ? item.widget : null;
    }

    /**
     * Refresh the visibility of the side bar and stacked panel.
     */
    private _refreshVisibility(): void {
      this._stackedPanel.setHidden(this._sideBar.currentTitle === null);
      this._sideBar.setHidden(
        this._isHiddenByUser || this._sideBar.titles.length === 0
      );
      this._updated.emit();
    }

    /**
     * Handle the `currentChanged` signal from the sidebar.
     */
    private _onCurrentChanged(
      sender: TabBar<Widget>,
      args: TabBar.ICurrentChangedArgs<Widget>
    ): void {
      const oldWidget = args.previousTitle
        ? this._findWidgetByTitle(args.previousTitle)
        : null;
      const newWidget = args.currentTitle
        ? this._findWidgetByTitle(args.currentTitle)
        : null;
      if (oldWidget) {
        oldWidget.hide();
      }
      if (newWidget) {
        newWidget.show();
      }
      this._lastCurrent = newWidget || oldWidget;
      this._refreshVisibility();
    }

    /**
     * Handle a `tabActivateRequest` signal from the sidebar.
     */
    private _onTabActivateRequested(
      sender: TabBar<Widget>,
      args: TabBar.ITabActivateRequestedArgs<Widget>
    ): void {
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

    private _isHiddenByUser = false;
    private _items = new Array<Private.IRankItem>();
    private _sideBar: TabBar<Widget>;
    private _stackedPanel: StackedPanel;
    private _lastCurrent: Widget | null;
    private _updated: Signal<SideBarHandler, void> = new Signal(this);
  }

  export class SkipLinkWidget extends Widget {
    /**
     * Construct a new skipLink widget.
     */
    constructor(shell: ILabShell) {
      super();
      this.addClass('jp-skiplink');
      this.id = 'jp-skiplink';
      this._shell = shell;
      this._createSkipLink('Skip to main panel', 'main');
    }

    handleEvent(event: Event): void {
      switch (event.type) {
        case 'click':
          if (event.target instanceof HTMLElement) {
            this._shell.activateArea(
              event.target?.dataset?.targetarea as ILabShell.Area
            );
          }
          break;
      }
    }

    /**
     * Handle `after-attach` messages for the widget.
     */
    protected onAfterAttach(msg: Message): void {
      super.onAfterAttach(msg);
      this.node.addEventListener('click', this);
    }

    /**
     * A message handler invoked on a `'before-detach'`
     * message
     */
    protected onBeforeDetach(msg: Message): void {
      this.node.removeEventListener('click', this);
      super.onBeforeDetach(msg);
    }
    private _shell: ILabShell;

    private _createSkipLink(skipLinkText: string, area: ILabShell.Area): void {
      const skipLink = document.createElement('a');
      skipLink.href = '#';
      skipLink.tabIndex = 0;
      skipLink.text = skipLinkText;
      skipLink.className = 'skip-link';
      skipLink.dataset['targetarea'] = area;
      this.node.appendChild(skipLink);
    }
  }

  export class TitleHandler extends Widget {
    /**
     * Construct a new title handler.
     */
    constructor(shell: ILabShell) {
      super();
      const inputElement = document.createElement('input');
      inputElement.type = 'text';
      this.node.appendChild(inputElement);
      this._shell = shell;
      this.id = 'jp-title-panel-title';
    }

    /**
     * Handle `after-attach` messages for the widget.
     */
    protected onAfterAttach(msg: Message): void {
      super.onAfterAttach(msg);
      this.inputElement.addEventListener('keyup', this);
      this.inputElement.addEventListener('click', this);
      this.inputElement.addEventListener('blur', this);
    }

    /**
     * Handle `before-detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      super.onBeforeDetach(msg);
      this.inputElement.removeEventListener('keyup', this);
      this.inputElement.removeEventListener('click', this);
      this.inputElement.removeEventListener('blur', this);
    }

    handleEvent(event: Event): void {
      switch (event.type) {
        case 'keyup':
          void this._evtKeyUp(event as KeyboardEvent);
          break;
        case 'click':
          this._evtClick(event as MouseEvent);
          break;
        case 'blur':
          this._selected = false;
          break;
      }
    }

    /**
     * Handle `keyup` events on the handler.
     */
    private async _evtKeyUp(event: KeyboardEvent): Promise<void> {
      if (event.key == 'Enter') {
        const widget = this._shell.currentWidget;
        if (widget == null) {
          return;
        }
        const oldName = widget.title.label;
        const inputElement = this.inputElement;
        const newName = inputElement.value;
        inputElement.blur();

        if (newName !== oldName) {
          widget.title.label = newName;
        } else {
          inputElement.value = oldName;
        }
      }
    }

    /**
     * Handle `click` events on the handler.
     */
    private _evtClick(event: MouseEvent): void {
      // only handle primary button clicks
      if (event.button !== 0 || this._selected) {
        return;
      }

      const inputElement = this.inputElement;

      event.preventDefault();
      event.stopPropagation();

      this._selected = true;

      const selectEnd = inputElement.value.indexOf('.');
      if (selectEnd === -1) {
        inputElement.select();
      } else {
        inputElement.setSelectionRange(0, selectEnd);
      }
    }

    /**
     * The input element containing the parent widget's title.
     */
    get inputElement(): HTMLInputElement {
      return this.node.children[0] as HTMLInputElement;
    }

    private _shell: ILabShell;
    private _selected: boolean = false;
  }

  export class RestorableSplitPanel extends SplitPanel {
    /**
     * Construct a new RestorableSplitPanel.
     */
    constructor(options: SplitPanel.IOptions = {}) {
      super(options);
      this._updated = new Signal(this);
    }

    /**
     * A signal emitted when the split panel is updated.
     */
    get updated(): ISignal<RestorableSplitPanel, void> {
      return this._updated;
    }

    /**
     * Emit 'updated' signal on 'update' requests.
     */
    protected onUpdateRequest(msg: Message): void {
      super.onUpdateRequest(msg);
      this._updated.emit();
    }

    private _updated: Signal<RestorableSplitPanel, void>;
  }
}
