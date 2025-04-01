// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running
 */

import { Button, TreeItem, TreeView } from '@jupyter/react-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  closeIcon,
  collapseAllIcon,
  CommandToolbarButton,
  expandAllIcon,
  FilterBox,
  getTreeItemElement,
  IScore,
  LabIcon,
  PanelWithToolbar,
  ReactWidget,
  refreshIcon,
  SidePanel,
  tableRowsIcon,
  Toolbar,
  ToolbarButton,
  treeViewIcon,
  UseSignal
} from '@jupyterlab/ui-components';
import { Token } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ElementExt } from '@lumino/domutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Panel, Widget } from '@lumino/widgets';
import React, { isValidElement, ReactNode, useCallback, useRef } from 'react';

/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to a searchable widget.
 */
const SEARCHABLE_CLASS = 'jp-SearchableSessions';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-RunningSessions-section';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-RunningSessions-sectionContainer';

/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-RunningSessions-item';

/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-RunningSessions-itemLabel';

/**
 * The class name added to a running session item detail.
 */
const ITEM_DETAIL_CLASS = 'jp-RunningSessions-itemDetail';

/**
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';

/**
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_ALL_BUTTON_CLASS = 'jp-RunningSessions-shutdownAll';

/**
 * The class name added to icons.
 */
const ITEM_ICON_CLASS = 'jp-RunningSessions-icon';

/**
 * Modifier added to a section when flattened list view is requested.
 */
const LIST_VIEW_CLASS = 'jp-mod-running-list-view';

/**
 * The class name added to button switching between nested and flat view.
 */
const VIEW_BUTTON_CLASS = 'jp-RunningSessions-viewButton';

/**
 * The class name added to button switching between nested and flat view.
 */
const COLLAPSE_EXPAND_BUTTON_CLASS = 'jp-RunningSessions-collapseButton';

/**
 * Identifier used in the state database.
 */
const STATE_DB_ID = 'jp-running-sessions';

/**
 * The running sessions managers token.
 */
export const IRunningSessionManagers = new Token<IRunningSessionManagers>(
  '@jupyterlab/running:IRunningSessionManagers',
  'A service to add running session managers.'
);

/**
 * The running sessions token.
 */
export const IRunningSessionSidebar = new Token<IRunningSessionSidebar>(
  '@jupyterlab/running:IRunningSessionsSidebar',
  'A token allowing to modify the running sessions sidebar.'
);

/**
 * The running interface.
 */
export interface IRunningSessionManagers {
  /**
   * Add a running item manager.
   *
   * @param manager - The running item manager.
   *
   */
  add(manager: IRunningSessions.IManager): IDisposable;

  /**
   * Signal emitted when a new manager is added.
   */
  added: ISignal<IRunningSessionManagers, IRunningSessions.IManager>;

  /**
   * Return an array of managers.
   */
  items(): ReadonlyArray<IRunningSessions.IManager>;
}

export class RunningSessionManagers implements IRunningSessionManagers {
  /**
   * Signal emitted when a new manager is added.
   */
  get added(): ISignal<this, IRunningSessions.IManager> {
    return this._added;
  }

  /**
   * Add a running item manager.
   *
   * @param manager - The running item manager.
   *
   */
  add(manager: IRunningSessions.IManager): IDisposable {
    this._managers.push(manager);
    this._added.emit(manager);
    return new DisposableDelegate(() => {
      const i = this._managers.indexOf(manager);

      if (i > -1) {
        this._managers.splice(i, 1);
      }
    });
  }

  /**
   * Return an iterator of launcher items.
   */
  items(): ReadonlyArray<IRunningSessions.IManager> {
    return this._managers;
  }

  private _added = new Signal<this, IRunningSessions.IManager>(this);
  private _managers: IRunningSessions.IManager[] = [];
}

function Item(props: {
  child?: boolean;
  runningItem: IRunningSessions.IRunningItem;
  shutdownLabel?: string | ((item: IRunningSessions.IRunningItem) => string);
  shutdownItemIcon?: LabIcon;
  translator?: ITranslator;
  collapseToggled: ISignal<Section, boolean>;
}) {
  const { runningItem } = props;
  const [collapsed, setCollapsed] = React.useState(false);
  // Use a ref instead of a state because the state does not have the time
  // to update in the callbacks
  const shuttingDown = useRef(false);
  const classList = [ITEM_CLASS];
  const detail = runningItem.detail?.();
  const icon = runningItem.icon();
  const title = runningItem.labelTitle ? runningItem.labelTitle() : '';
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  // Handle shutdown requests.
  const shutdownItemIcon = props.shutdownItemIcon || closeIcon;
  const shutdownLabel =
    (typeof props.shutdownLabel === 'function'
      ? props.shutdownLabel(runningItem)
      : props.shutdownLabel) ?? trans.__('Shut Down');
  const shutdown = useCallback(
    (event: React.MouseEvent) => {
      shuttingDown.current = true;
      event.preventDefault();
      runningItem.shutdown?.();
    },
    [runningItem, shuttingDown]
  );

  // Materialise getter to avoid triggering it repeatedly
  const children = runningItem.children;

  // Manage collapsed state. Use the shutdown flag in lieu of `stopPropagation`.
  const collapsible = !!children?.length;
  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (shuttingDown.current) {
        return;
      }
      const item = getTreeItemElement(event.target as HTMLElement);
      if (event.currentTarget !== item) {
        return;
      }
      if (collapsible) {
        setCollapsed(!collapsed);
      }
    },
    [collapsible, collapsed, shuttingDown]
  );

  // Listen to signal to collapse from outside
  props.collapseToggled.connect((_emitter, newCollapseState) =>
    setCollapsed(newCollapseState)
  );

  if (runningItem.className) {
    classList.push(runningItem.className);
  }

  return (
    <>
      <TreeItem
        className={`${classList.join(' ')} jp-TreeItem nested`}
        onClick={onClick}
        data-context={runningItem.context || ''}
        expanded={!collapsed}
      >
        {icon ? (
          typeof icon === 'string' ? (
            <img src={icon} className={ITEM_ICON_CLASS} slot="start" />
          ) : (
            <icon.react slot="start" tag="span" className={ITEM_ICON_CLASS} />
          )
        ) : undefined}
        <span
          className={ITEM_LABEL_CLASS}
          title={title}
          onClick={runningItem.open && (() => runningItem.open!())}
        >
          {runningItem.label()}
        </span>
        {detail && <span className={ITEM_DETAIL_CLASS}>{detail}</span>}
        {runningItem.shutdown && (
          <Button
            appearance="stealth"
            className={SHUTDOWN_BUTTON_CLASS}
            onClick={shutdown}
            title={shutdownLabel}
            slot="end"
          >
            <shutdownItemIcon.react tag={null} />
          </Button>
        )}
        {children && (
          <List
            runningItems={children!}
            shutdownItemIcon={shutdownItemIcon}
            translator={translator}
            collapseToggled={props.collapseToggled}
          />
        )}
      </TreeItem>
    </>
  );
}

function List(props: {
  child?: boolean;
  runningItems: IRunningSessions.IRunningItem[];
  shutdownLabel?: string | ((item: IRunningSessions.IRunningItem) => string);
  shutdownItemIcon?: LabIcon;
  filter?: (item: IRunningSessions.IRunningItem) => Partial<IScore> | null;
  translator?: ITranslator;
  collapseToggled: ISignal<Section, boolean>;
}) {
  const filter = props.filter;
  const items = filter
    ? props.runningItems
        .map(item => {
          return {
            item,
            score: filter(item)
          };
        })
        .filter(({ score }) => score !== null)
        .sort((a, b) => {
          return a.score!.score! - b.score!.score!;
        })
        .map(({ item }) => item)
    : props.runningItems;
  return (
    <>
      {items.map((item, i) => (
        <Item
          child={props.child}
          key={i}
          runningItem={item}
          shutdownLabel={props.shutdownLabel}
          shutdownItemIcon={props.shutdownItemIcon}
          translator={props.translator}
          collapseToggled={props.collapseToggled}
        />
      ))}
    </>
  );
}

interface IFilterProvider {
  filter(item: IRunningSessions.IRunningItem): Partial<IScore> | null;
  filterChanged: ISignal<IFilterProvider, void>;
}

class FilterWidget extends ReactWidget implements IFilterProvider {
  constructor(translator: ITranslator) {
    super();
    this.filter = this.filter.bind(this);
    this._updateFilter = this._updateFilter.bind(this);
    this._trans = translator.load('jupyterlab');
    this.addClass('jp-SearchableSessions-filter');
  }

  get filterChanged(): ISignal<FilterWidget, void> {
    return this._filterChanged;
  }

  render(): JSX.Element {
    return (
      <FilterBox
        placeholder={this._trans.__('Search')}
        updateFilter={this._updateFilter}
        useFuzzyFilter={false}
        caseSensitive={false}
      />
    );
  }

  filter(item: IRunningSessions.IRunningItem): Partial<IScore> | null {
    const labels: string[] = [this._getTextContent(item.label())];
    for (const child of item.children ?? []) {
      labels.push(this._getTextContent(child.label()));
    }
    return this._filterFn(labels.join(' '));
  }

  private _getTextContent(node: ReactNode): string {
    if (typeof node === 'string') {
      return node;
    }
    if (typeof node === 'number') {
      return '' + node;
    }
    if (typeof node === 'boolean') {
      return '' + node;
    }
    if (Array.isArray(node)) {
      return node.map(n => this._getTextContent(n)).join(' ');
    }
    if (node && isValidElement(node)) {
      return node.props.children
        .map((n: ReactNode) => this._getTextContent(n))
        .join(' ');
    }
    return '';
  }

  private _updateFilter(
    filterFn: (item: string) => Partial<IScore> | null
  ): void {
    this._filterFn = filterFn;
    this._filterChanged.emit();
  }

  private _filterFn: (item: string) => Partial<IScore> | null = (_: string) => {
    return { score: 0 };
  };
  private _filterChanged = new Signal<FilterWidget, void>(this);
  private _trans: TranslationBundle;
}

class ListWidget extends ReactWidget {
  private _mode: 'tree' | 'list';

  constructor(
    private _options: {
      manager: IRunningSessions.IManager;
      runningItems: IRunningSessions.IRunningItem[];
      filterProvider?: IFilterProvider;
      translator?: ITranslator;
      collapseToggled: ISignal<Section, boolean>;
    }
  ) {
    super();
    _options.manager.runningChanged.connect(this._emitUpdate, this);
    if (_options.filterProvider) {
      _options.filterProvider.filterChanged.connect(this._emitUpdate, this);
    }
  }

  /**
   * Whether the items are displayed as a tree view
   * or a flat list.
   */
  get mode(): 'tree' | 'list' {
    return this._mode;
  }
  set mode(v: 'tree' | 'list') {
    if (this._mode !== v) {
      this._mode = v;
      this._update.emit();
    }
  }

  dispose() {
    Signal.clearData(this);
    super.dispose();
  }

  protected onBeforeShow(msg: Message): void {
    super.onBeforeShow(msg);
    this._update.emit();
  }

  render(): JSX.Element {
    const options = this._options;
    let cached = true;
    return (
      <UseSignal signal={this._update}>
        {() => {
          // Cache the running items for the initial load and request from
          // the service every subsequent load.
          if (cached) {
            cached = false;
          } else {
            options.runningItems = options.manager.running({ mode: this.mode });
          }
          const classes = ['jp-TreeView'];
          if (this.mode === 'list') {
            classes.push('jp-mod-flat');
          }
          return (
            <div className={CONTAINER_CLASS}>
              <TreeView className={classes.join(' ')}>
                <List
                  runningItems={options.runningItems}
                  shutdownLabel={options.manager.shutdownLabel}
                  shutdownItemIcon={options.manager.shutdownItemIcon}
                  filter={options.filterProvider?.filter}
                  translator={options.translator}
                  collapseToggled={options.collapseToggled}
                />
              </TreeView>
            </div>
          );
        }}
      </UseSignal>
    );
  }

  private _emitUpdate() {
    if (!this.isVisible) {
      return;
    }
    this._update.emit();
  }

  private _update: Signal<ListWidget, void> = new Signal(this);
}

/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on its props.
 */
class Section extends PanelWithToolbar {
  constructor(options: Section.IOptions) {
    super();
    this._listView = (options.viewMode ?? 'tree') === 'list';
    this._manager = options.manager;
    this._filterProvider = options.filterProvider;
    const translator = options.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');

    this.addClass(SECTION_CLASS);
    this.title.label = options.manager.name;

    this._manager.runningChanged.connect(this._onListChanged, this);
    if (options.filterProvider) {
      options.filterProvider.filterChanged.connect(this._onListChanged, this);
    }
    this._updateEmptyClass();

    const runningItems = options.manager.running({
      mode:
        options.manager.supportsMultipleViews && !this._listView
          ? 'tree'
          : 'list'
    });

    if (options.showToolbar !== false) {
      this._initializeToolbar(runningItems);
    }

    this._listWidget = new ListWidget({
      runningItems,
      collapseToggled: this._collapseToggled,
      ...options
    });
    this._listWidget.mode =
      options.manager.supportsMultipleViews && !this._listView
        ? 'tree'
        : 'list';
    this.addWidget(this._listWidget);
  }

  /**
   * Toggle between list and tree view.
   */
  toggleListView(forceOn?: boolean): void {
    const newState = typeof forceOn !== 'undefined' ? forceOn : !this._listView;
    this._listView = newState;
    if (this._buttons) {
      const switchViewButton = this._buttons['switch-view'];
      switchViewButton.pressed = newState;
    }
    this._collapseToggled.emit(false);
    if (this._manager.supportsMultipleViews === undefined) {
      this.toggleClass(LIST_VIEW_CLASS, newState);
    }
    this._updateButtons();
    this._listWidget.mode =
      this._manager.supportsMultipleViews && !this._listView ? 'tree' : 'list';
    this._viewChanged.emit({ mode: newState ? 'list' : 'tree' });
  }

  /**
   * Dispose the resources held by the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    Signal.clearData(this);
    super.dispose();
  }

  private get _shutdownAllLabel(): string {
    return this._manager.shutdownAllLabel || this._trans.__('Shut Down All');
  }

  private _initializeToolbar(runningItems: IRunningSessions.IRunningItem[]) {
    const enabled = runningItems.length > 0;

    const shutdownAllLabel = this._shutdownAllLabel;
    const shutdownTitle = `${shutdownAllLabel}?`;

    const onShutdown = () => {
      const shutdownAllConfirmationText =
        (typeof this._manager.shutdownAllConfirmationText === 'function'
          ? this._manager.shutdownAllConfirmationText()
          : this._manager.shutdownAllConfirmationText) ??
        `${shutdownAllLabel} ${this._manager.name}`;

      void showDialog({
        title: shutdownTitle,
        body: shutdownAllConfirmationText,
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({ label: shutdownAllLabel })
        ]
      }).then(result => {
        if (result.button.accept) {
          this._manager.shutdownAll();
        }
      });
    };

    const shutdownAllButton = new ToolbarButton({
      label: shutdownAllLabel,
      className: `${SHUTDOWN_ALL_BUTTON_CLASS}${
        !enabled ? ' jp-mod-disabled' : ''
      }`,
      enabled,
      onClick: onShutdown.bind(this)
    });
    const switchViewButton = new ToolbarButton({
      className: VIEW_BUTTON_CLASS,
      enabled,
      icon: tableRowsIcon,
      pressedIcon: treeViewIcon,
      onClick: () => this.toggleListView(),
      tooltip: this._trans.__('Switch to List View'),
      pressedTooltip: this._trans.__('Switch to Tree View')
    });
    const collapseExpandAllButton = new ToolbarButton({
      className: COLLAPSE_EXPAND_BUTTON_CLASS,
      enabled,
      icon: collapseAllIcon,
      pressedIcon: expandAllIcon,
      onClick: () => {
        const newState = !collapseExpandAllButton.pressed;
        this._collapseToggled.emit(newState);
        collapseExpandAllButton.pressed = newState;
      },
      tooltip: this._trans.__('Collapse All'),
      pressedTooltip: this._trans.__('Expand All')
    });

    this._buttons = {
      'switch-view': switchViewButton,
      'collapse-expand': collapseExpandAllButton,
      'shutdown-all': shutdownAllButton
    };
    // Update buttons once defined and before adding to DOM
    this._updateButtons();
    this._manager.runningChanged.connect(this._updateButtons, this);

    // Add manager-specific buttons
    if (this._manager.toolbarButtons) {
      this._manager.toolbarButtons.forEach(button =>
        this.toolbar.addItem(
          button instanceof CommandToolbarButton ? button.commandId : button.id,
          button
        )
      );
    }

    for (const name of ['collapse-expand', 'switch-view', 'shutdown-all']) {
      this.toolbar.addItem(
        name,
        this._buttons[name as keyof typeof this._buttons]
      );
    }
    this.toolbar.addClass('jp-RunningSessions-toolbar');
    this._toolbar.node.setAttribute(
      'aria-label',
      this._trans.__('%1 toolbar', this.title.label)
    );
  }

  private _onListChanged(): void {
    this._updateButtons();
    this._updateEmptyClass();
  }

  private _updateEmptyClass(): void {
    if (this._filterProvider) {
      const items = this._manager
        .running({
          mode:
            this._manager.supportsMultipleViews && !this._listView
              ? 'tree'
              : 'list'
        })
        .filter(this._filterProvider.filter);
      const empty = items.length === 0;
      if (empty) {
        this.node.classList.toggle('jp-mod-empty', true);
      } else {
        this.node.classList.toggle('jp-mod-empty', false);
      }
    }
  }

  get viewChanged(): ISignal<Section, Section.IViewState> {
    return this._viewChanged;
  }

  private _updateButtons(): void {
    if (!this._buttons) {
      return;
    }
    let runningItems = this._manager.running({
      mode:
        this._manager.supportsMultipleViews && !this._listView ? 'tree' : 'list'
    });
    const enabled = runningItems.length > 0;

    const hasNesting =
      // If the flag is undefined fallback to the old behavior
      // @deprecated we should remove the fallback in the next iteration
      this._manager.supportsMultipleViews === undefined
        ? runningItems.filter(item => item.children).length !== 0
        : this._manager.supportsMultipleViews;
    const inTreeView = hasNesting && !this._buttons['switch-view'].pressed;

    this._buttons['switch-view'].node.style.display = hasNesting
      ? 'flex'
      : 'none';
    this._buttons['collapse-expand'].node.style.display = inTreeView
      ? 'flex'
      : 'none';

    this._buttons['collapse-expand'].enabled = enabled;
    this._buttons['switch-view'].enabled = enabled;
    this._buttons['shutdown-all'].enabled = enabled;
  }

  private _buttons: {
    'collapse-expand': ToolbarButton;
    'switch-view': ToolbarButton;
    'shutdown-all': ToolbarButton;
  } | null = null;
  private _manager: IRunningSessions.IManager;
  private _listView: boolean = false;
  private _listWidget: ListWidget;
  private _filterProvider?: IFilterProvider;
  private _collapseToggled = new Signal<Section, boolean>(this);
  private _viewChanged = new Signal<Section, Section.IViewState>(this);
  private _trans: TranslationBundle;
}

/**
 * Statics for Section.
 */
namespace Section {
  /**
   * Initialisation options for section.
   */
  export interface IOptions {
    manager: IRunningSessions.IManager;
    showToolbar?: boolean;
    filterProvider?: IFilterProvider;
    translator?: ITranslator;
    viewMode?: 'tree' | 'list';
  }
  /**
   * Information about section view state.
   */
  export interface IViewState {
    /**
     * View mode
     */
    mode: 'tree' | 'list';
  }
}

/**
 * The interface exposing the running sessions sidebar widget properties.
 */
export interface IRunningSessionSidebar {
  /**
   * The toolbar of the running sidebar.
   */
  readonly toolbar: Toolbar;
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions
  extends SidePanel
  implements IRunningSessionSidebar
{
  /**
   * Construct a new running widget.
   */
  constructor(
    managers: IRunningSessionManagers,
    translator?: ITranslator,
    stateDB?: IStateDB | null
  ) {
    super();
    this.managers = managers;
    this._stateDB = stateDB ?? null;
    this.translator = translator ?? nullTranslator;
    const trans = this.translator.load('jupyterlab');

    this.addClass(RUNNING_CLASS);

    this.toolbar.addItem(
      'refresh',
      new ToolbarButton({
        tooltip: trans.__('Refresh List'),
        icon: refreshIcon,
        onClick: () =>
          managers.items().forEach(manager => manager.refreshRunning())
      })
    );

    managers.items().forEach(manager => this.addSection(managers, manager));
    managers.added.connect(this.addSection, this);
  }

  /**
   * Dispose the resources held by the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.managers.added.disconnect(this.addSection, this);
    super.dispose();
  }

  /**
   * Add a section for a new manager.
   *
   * @param managers Managers
   * @param manager New manager
   */
  protected async addSection(
    managers: unknown,
    manager: IRunningSessions.IManager
  ) {
    const section = new Section({ manager, translator: this.translator });
    this.addWidget(section);

    const state = await this._getState();
    const sectionsInListView = state.listViewSections;
    const sectionId = manager.name;

    if (sectionsInListView && sectionsInListView.includes(sectionId)) {
      section.toggleListView(true);
    }
    section.viewChanged.connect(
      async (_emitter, viewState: Section.IViewState) => {
        await this._updateState(sectionId, viewState.mode);
      }
    );
  }

  /**
   * Update state database with the new state of a given section.
   */
  private async _updateState(sectionId: string, mode: 'list' | 'tree') {
    const state = await this._getState();
    let listViewSections = state.listViewSections ?? [];
    if (mode === 'list' && !listViewSections.includes(sectionId)) {
      listViewSections.push(sectionId);
    } else {
      listViewSections = listViewSections.filter(e => e !== sectionId);
    }
    const newState = { listViewSections };
    if (this._stateDB) {
      await this._stateDB.save(STATE_DB_ID, newState);
    }
  }

  /**
   * Get current state from the state database.
   */
  private async _getState(): Promise<RunningSessions.IStateDBLayout> {
    if (!this._stateDB) {
      return {};
    }
    return (
      ((await this._stateDB.fetch(
        STATE_DB_ID
      )) as RunningSessions.IStateDBLayout) ?? {}
    );
  }

  protected managers: IRunningSessionManagers;
  protected translator: ITranslator;
  private _stateDB: IStateDB | null;
}

/**
 * Interfaces for RunningSessions implementation.
 */
namespace RunningSessions {
  /**
   * Layout of the state database.
   */
  export interface IStateDBLayout {
    /**
     * Names of sections to be presented in the list view.
     */
    listViewSections?: string[];
  }
}

/**
 * Section but rendering its own title before the content
 */
class TitledSection extends Section {
  constructor(options: Section.IOptions) {
    super(options);
    const titleNode = document.createElement('h3');
    titleNode.className = 'jp-SearchableSessions-title';
    const label = titleNode.appendChild(document.createElement('span'));
    label.className = 'jp-SearchableSessions-titleLabel';
    label.textContent = this.title.label;
    this.node.insertAdjacentElement('afterbegin', titleNode);
  }
}

class EmptyIndicator extends Widget {
  constructor(translator: ITranslator) {
    super();
    const trans = translator.load('jupyterlab');
    this.addClass('jp-SearchableSessions-emptyIndicator');
    this.node.textContent = trans.__('No matches');
  }
}

/**
 * A panel intended for use within `Dialog` to allow searching tabs and running sessions.
 */
export class SearchableSessions extends Panel {
  constructor(managers: IRunningSessionManagers, translator?: ITranslator) {
    super();
    this._translator = translator ?? nullTranslator;

    this.addClass(RUNNING_CLASS);
    this.addClass(SEARCHABLE_CLASS);
    this._filterWidget = new FilterWidget(this._translator);
    this.addWidget(this._filterWidget);
    this._list = new SearchableSessionsList(
      managers,
      this._filterWidget,
      translator
    );
    this.addWidget(this._list);

    this._filterWidget.filterChanged.connect(() => {
      this._activeIndex = 0;
      this._updateActive(0);
    }, this);
  }

  /**
   * Dispose the resources held by the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    Signal.clearData(this);
    super.dispose();
  }

  /**
   * Click active element when the user confirmed the choice in the dialog.
   */
  getValue() {
    const items = [
      ...this.node.querySelectorAll('.' + ITEM_LABEL_CLASS)
    ] as HTMLElement[];
    const pos = Math.min(Math.max(this._activeIndex, 0), items.length - 1);
    items[pos].click();
  }

  /**
   * Handle incoming events.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(_: Message): void {
    this._forceFocusInput();
    this.node.addEventListener('keydown', this);
    setTimeout(() => {
      this._updateActive(0);
    }, 0);
  }
  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(_: Message): void {
    this.node.removeEventListener('keydown', this);
  }

  /**
   * Force focus on the filter input.
   *
   * Note: forces focus because this widget is intended to be used in `Dialog`,
   * which does not support focusing React widget nested within a non-React
   * widget (a limitation of `focusNodeSelector` option implementation).
   */
  private _forceFocusInput(): void {
    this._filterWidget.renderPromise
      ?.then(() => {
        const jpSearch = this._filterWidget.node.querySelector('jp-search');
        const input = jpSearch?.shadowRoot?.querySelector('input');
        if (!input) {
          console.warn('Input element not found, cannot focus');
          return;
        }
        input.focus();
      })
      .catch(console.warn);
  }

  /**
   * Navigate between items using up/down keys by shifting focus.
   */
  private _evtKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const direction = event.key === 'ArrowDown' ? +1 : -1;
      const wasSet = this._updateActive(direction);
      if (wasSet) {
        event.preventDefault();
      }
    }
  }

  /**
   * Set and mark active item relative to the current.
   *
   * Returns whether an active item was set.
   */
  private _updateActive(direction: -1 | 0 | 1): boolean {
    const items = [...this.node.querySelectorAll('.' + ITEM_CLASS)].filter(e =>
      e.checkVisibility()
    ) as HTMLElement[];
    if (!items.length) {
      return false;
    }
    for (const item of items) {
      if (item.classList.contains('jp-mod-active')) {
        item.classList.toggle('jp-mod-active', false);
      }
    }
    const currentIndex = this._activeIndex;
    let newIndex: number | null = null;
    if (currentIndex === -1) {
      // First or last
      newIndex = direction === +1 ? 0 : items.length - 1;
    } else {
      newIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        items.length - 1
      );
    }
    if (newIndex !== null) {
      items[newIndex].classList.add('jp-mod-active');
      ElementExt.scrollIntoViewIfNeeded(this._list.node, items[newIndex]);
      this._activeIndex = newIndex;
      return true;
    }
    return false;
  }

  private _translator: ITranslator;
  private _filterWidget: FilterWidget;
  private _activeIndex = 0;
  private _list: SearchableSessionsList;
}

/**
 * A panel list of searchable sessions.
 */
export class SearchableSessionsList extends Panel {
  constructor(
    managers: IRunningSessionManagers,
    filterWidget: FilterWidget,
    translator?: ITranslator
  ) {
    super();
    this._managers = managers;
    this._translator = translator ?? nullTranslator;
    this._filterWidget = filterWidget;
    this.addClass('jp-SearchableSessions-list');

    this._emptyIndicator = new EmptyIndicator(this._translator);
    this.addWidget(this._emptyIndicator);

    managers.items().forEach(manager => this.addSection(managers, manager));
    managers.added.connect(this.addSection, this);
  }

  /**
   * Dispose the resources held by the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._managers.added.disconnect(this.addSection, this);
    super.dispose();
  }

  /**
   * Add a section for a new manager.
   *
   * @param managers Managers
   * @param manager New manager
   */
  protected addSection(managers: unknown, manager: IRunningSessions.IManager) {
    const section = new TitledSection({
      manager,
      translator: this._translator,
      showToolbar: false,
      filterProvider: this._filterWidget,
      viewMode: 'list'
    });
    // Do not use tree view in searchable list
    section.toggleListView(true);
    this.addWidget(section);
    // Move empty indicator to the end
    this.addWidget(this._emptyIndicator);
  }

  private _managers: IRunningSessionManagers;
  private _translator: ITranslator;
  private _emptyIndicator: EmptyIndicator;
  private _filterWidget: FilterWidget;
}

/**
 * The namespace for the `IRunningSessions` class statics.
 */
export namespace IRunningSessions {
  /**
   * A manager of running items grouped under a single section.
   */
  export interface IManager {
    /**
     * Name that is shown to the user in plural.
     */
    name: string;

    /**
     * Called when the shutdown all button is pressed.
     */
    shutdownAll(): void;

    /**
     * List the running models.
     *
     * If the manager supports tree view, it should set the flag
     * {@link supportsMultipleViews}.
     * It must return nested item if mode is `tree`.
     * Otherwise it must return a flat list.
     */
    running(options: { mode: 'tree' | 'list' }): IRunningItem[];

    /**
     * Force a refresh of the running models.
     */
    refreshRunning(): void;

    /**
     * A signal that should be emitted when the item list has changed.
     */
    runningChanged: ISignal<any, any>;

    /**
     * A string used to describe the shutdown action.
     */
    shutdownLabel?: string | ((item: IRunningSessions.IRunningItem) => string);

    /**
     * A string used to describe the shutdown all action.
     */
    shutdownAllLabel?: string;

    /**
     * A string used as the body text in the shutdown all confirmation dialog.
     */
    shutdownAllConfirmationText?: string | (() => string);

    /**
     * The icon to show for shutting down an individual item in this section.
     */
    shutdownItemIcon?: LabIcon;

    /**
     * Used to add arbitrary buttons to this section
     */
    toolbarButtons?: (ToolbarButton | CommandToolbarButton)[];

    /**
     * Whether the manager supports tree view for its items
     * or only a flat list.
     */
    supportsMultipleViews?: boolean;
  }

  /**
   * A running item.
   */
  export interface IRunningItem {
    /**
     * Optional child nodes that belong to a top-level running item.
     */
    children?: IRunningItem[];

    /**
     * Optional CSS class name to add to the running item.
     */
    className?: string;

    /**
     * Optional context hint to add to the `data-context` attribute of an item.
     */
    context?: string;

    /**
     * Called when the running item is clicked.
     */
    open?: () => void;

    /**
     * Called when the shutdown button is pressed on a particular item.
     */
    shutdown?: () => void;

    /**
     * The `LabIcon` to use as the icon for the running item or the string
     * `src` URL.
     */
    icon: () => LabIcon | string;

    /**
     * Called to determine the label for each item.
     */
    label: () => ReactNode;

    /**
     * Called to determine the `title` attribute for each item, which is
     * revealed on hover.
     */
    labelTitle?: () => string;

    /**
     * Called to determine the `detail` attribute, which is shown optionally in
     * a column after the label.
     */
    detail?: () => string;
  }
}
