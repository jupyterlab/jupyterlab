// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running
 */

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  caretDownIcon,
  caretRightIcon,
  closeIcon,
  collapseAllIcon,
  expandAllIcon,
  LabIcon,
  PanelWithToolbar,
  ReactWidget,
  refreshIcon,
  SidePanel,
  tableRowsIcon,
  ToolbarButton,
  ToolbarButtonComponent,
  treeViewIcon,
  UseSignal
} from '@jupyterlab/ui-components';
import { IStateDB } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import React, { ReactNode } from 'react';

/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-RunningSessions-section';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-RunningSessions-sectionContainer';

/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-RunningSessions-sectionList';

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
 * The class name added to a collapse/expand carets.
 */
const CARET_CLASS = 'jp-RunningSessions-caret';

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
 * The running sessions token.
 */
export const IRunningSessionManagers = new Token<IRunningSessionManagers>(
  '@jupyterlab/running:IRunningSessionManagers',
  'A service to add running session managers.'
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
  shutdownLabel?: string;
  shutdownItemIcon?: LabIcon;
  translator?: ITranslator;
  collapseToggled: ISignal<Section, boolean>;
}) {
  const { runningItem } = props;
  const classList = [ITEM_CLASS];
  const detail = runningItem.detail?.();
  const icon = runningItem.icon();
  const title = runningItem.labelTitle ? runningItem.labelTitle() : '';
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  // Handle shutdown requests.
  let stopPropagation = false;
  const shutdownItemIcon = props.shutdownItemIcon || closeIcon;
  const shutdownLabel = props.shutdownLabel || trans.__('Shut Down');
  const shutdown = () => {
    stopPropagation = true;
    runningItem.shutdown?.();
  };

  // Materialise getter to avoid triggering it repeatedly
  const children = runningItem.children;

  // Manage collapsed state. Use the shutdown flag in lieu of `stopPropagation`.
  const [collapsed, collapse] = React.useState(false);
  const collapsible = !!children?.length;
  const onClick = collapsible
    ? () => !stopPropagation && collapse(!collapsed)
    : undefined;

  // Listen to signal to collapse from outside
  props.collapseToggled.connect((_emitter, newCollapseState) =>
    collapse(newCollapseState)
  );

  if (runningItem.className) {
    classList.push(runningItem.className);
  }
  if (props.child) {
    classList.push('jp-mod-running-child');
  }
  if (props.child && !children) {
    classList.push('jp-mod-running-leaf');
  }

  return (
    <>
      <li>
        <div
          className={classList.join(' ')}
          onClick={onClick}
          data-context={runningItem.context || ''}
        >
          {collapsible &&
            (collapsed ? (
              <caretRightIcon.react tag="span" className={CARET_CLASS} />
            ) : (
              <caretDownIcon.react tag="span" className={CARET_CLASS} />
            ))}
          {icon ? (
            typeof icon === 'string' ? (
              <img src={icon} className={ITEM_ICON_CLASS} />
            ) : (
              <icon.react tag="span" className={ITEM_ICON_CLASS} />
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
            <ToolbarButtonComponent
              className={SHUTDOWN_BUTTON_CLASS}
              icon={shutdownItemIcon}
              onClick={shutdown}
              tooltip={shutdownLabel}
            />
          )}
        </div>
        {collapsible && !collapsed && (
          <List
            child={true}
            runningItems={children!}
            shutdownItemIcon={shutdownItemIcon}
            translator={translator}
            collapseToggled={props.collapseToggled}
          />
        )}
      </li>
    </>
  );
}

function List(props: {
  child?: boolean;
  runningItems: IRunningSessions.IRunningItem[];
  shutdownLabel?: string;
  shutdownAllLabel?: string;
  shutdownItemIcon?: LabIcon;
  translator?: ITranslator;
  collapseToggled: ISignal<Section, boolean>;
}) {
  return (
    <ul className={LIST_CLASS}>
      {props.runningItems.map((item, i) => (
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
    </ul>
  );
}

class ListWidget extends ReactWidget {
  constructor(
    private _options: {
      manager: IRunningSessions.IManager;
      runningItems: IRunningSessions.IRunningItem[];
      shutdownAllLabel: string;
      translator?: ITranslator;
      collapseToggled: ISignal<Section, boolean>;
    }
  ) {
    super();
    _options.manager.runningChanged.connect(this._emitUpdate, this);
  }

  dispose() {
    this._options.manager.runningChanged.disconnect(this._emitUpdate, this);
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
          // Cache the running items for the intial load and request from
          // the service every subsequent load.
          if (cached) {
            cached = false;
          } else {
            options.runningItems = options.manager.running();
          }
          return (
            <div className={CONTAINER_CLASS}>
              <List
                runningItems={options.runningItems}
                shutdownLabel={options.manager.shutdownLabel}
                shutdownAllLabel={options.shutdownAllLabel}
                shutdownItemIcon={options.manager.shutdownItemIcon}
                translator={options.translator}
                collapseToggled={options.collapseToggled}
              />
            </div>
          );
        }}
      </UseSignal>
    );
  }

  /**
   * Check if the widget or any of it's parents is hidden.
   *
   * Checking parents is necessary as lumino does not propagate visibility
   * changes from parents down to children (although it does notify parents
   * about changes to children visibility).
   */
  private _isAnyHidden() {
    let isHidden = this.isHidden;
    if (isHidden) {
      return isHidden;
    }
    let parent: Widget | null = this.parent;
    while (parent != null) {
      if (parent.isHidden) {
        isHidden = true;
        break;
      }
      parent = parent.parent;
    }
    return isHidden;
  }

  private _emitUpdate() {
    if (this._isAnyHidden()) {
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
  constructor(options: {
    manager: IRunningSessions.IManager;
    translator?: ITranslator;
  }) {
    super();
    this._manager = options.manager;
    const translator = options.translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    const shutdownAllLabel =
      options.manager.shutdownAllLabel || trans.__('Shut Down All');
    const shutdownTitle = `${shutdownAllLabel}?`;
    const shutdownAllConfirmationText =
      options.manager.shutdownAllConfirmationText ||
      `${shutdownAllLabel} ${options.manager.name}`;

    this.addClass(SECTION_CLASS);
    this.title.label = options.manager.name;

    function onShutdown() {
      void showDialog({
        title: shutdownTitle,
        body: shutdownAllConfirmationText,
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({ label: shutdownAllLabel })
        ]
      }).then(result => {
        if (result.button.accept) {
          options.manager.shutdownAll();
        }
      });
    }

    let runningItems = options.manager.running();
    const enabled = runningItems.length > 0;

    const shutdownAllButton = new ToolbarButton({
      label: shutdownAllLabel,
      className: `${SHUTDOWN_ALL_BUTTON_CLASS}${
        !enabled ? ' jp-mod-disabled' : ''
      }`,
      enabled,
      onClick: onShutdown
    });

    const switchViewButton = new ToolbarButton({
      className: VIEW_BUTTON_CLASS,
      enabled,
      icon: tableRowsIcon,
      pressedIcon: treeViewIcon,
      onClick: () => this.toggleListView(),
      tooltip: trans.__('Switch to List View'),
      pressedTooltip: trans.__('Switch to Tree View')
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
      tooltip: trans.__('Collapse All'),
      pressedTooltip: trans.__('Expand All')
    });

    this._buttons = {
      'switch-view': switchViewButton,
      'collapse-expand': collapseExpandAllButton,
      'shutdown-all': shutdownAllButton
    };
    // Update buttons once defined and before adding to DOM
    this._updateButtons();
    this._manager.runningChanged.connect(this._updateButtons, this);

    for (const name of ['collapse-expand', 'switch-view', 'shutdown-all']) {
      this.toolbar.addItem(
        name,
        this._buttons[name as keyof typeof this._buttons]
      );
    }
    this.toolbar.addClass('jp-RunningSessions-toolbar');

    this.addWidget(
      new ListWidget({
        runningItems,
        shutdownAllLabel,
        collapseToggled: this._collapseToggled,
        ...options
      })
    );
  }

  /**
   * Toggle between list and tree view.
   */
  toggleListView(forceOn?: boolean): void {
    const switchViewButton = this._buttons['switch-view'];
    const newState =
      typeof forceOn !== 'undefined' ? forceOn : !switchViewButton.pressed;
    switchViewButton.pressed = newState;
    this._collapseToggled.emit(false);
    this.toggleClass(LIST_VIEW_CLASS, newState);
    this._updateButtons();
    this._viewChanged.emit({ mode: newState ? 'list' : 'tree' });
  }

  /**
   * Dispose the resources held by the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager.runningChanged.disconnect(this._updateButtons, this);
    super.dispose();
  }

  get viewChanged(): ISignal<Section, Section.IViewState> {
    return this._viewChanged;
  }

  private _updateButtons(): void {
    let runningItems = this._manager.running();
    const enabled = runningItems.length > 0;

    const hasNesting = runningItems.filter(item => item.children).length !== 0;
    const inTreeView = hasNesting && !this._buttons['switch-view'].pressed;

    this._buttons['switch-view'].node.style.display = hasNesting
      ? 'block'
      : 'none';
    this._buttons['collapse-expand'].node.style.display = inTreeView
      ? 'block'
      : 'none';

    this._buttons['collapse-expand'].enabled = enabled;
    this._buttons['switch-view'].enabled = enabled;
    this._buttons['shutdown-all'].enabled = enabled;
  }

  private _buttons: {
    'collapse-expand': ToolbarButton;
    'switch-view': ToolbarButton;
    'shutdown-all': ToolbarButton;
  };
  private _manager: IRunningSessions.IManager;
  private _collapseToggled = new Signal<Section, boolean>(this);
  private _viewChanged = new Signal<Section, Section.IViewState>(this);
}

/**
 * Interfaces for Section implementation.
 */
namespace Section {
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
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends SidePanel {
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
  protected async addSection(_: unknown, manager: IRunningSessions.IManager) {
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
      (this._stateDB.fetch(STATE_DB_ID) as RunningSessions.IStateDBLayout) ?? {}
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
     */
    running(): IRunningItem[];

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
    shutdownLabel?: string;

    /**
     * A string used to describe the shutdown all action.
     */
    shutdownAllLabel?: string;

    /**
     * A string used as the body text in the shutdown all confirmation dialog.
     */
    shutdownAllConfirmationText?: string;

    /**
     * The icon to show for shutting down an individual item in this section.
     */
    shutdownItemIcon?: LabIcon;
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
