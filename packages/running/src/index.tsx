// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running
 */

import { Dialog, showDialog } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  caretDownIcon,
  caretRightIcon,
  closeIcon,
  FilterBox,
  IScore,
  LabIcon,
  PanelWithToolbar,
  ReactWidget,
  refreshIcon,
  SidePanel,
  Toolbar,
  ToolbarButton,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/ui-components';
import { Token } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ElementExt } from '@lumino/domutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Panel, Widget } from '@lumino/widgets';
import * as React from 'react';

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
  shutdownLabel?: string;
  shutdownItemIcon?: LabIcon;
  translator?: ITranslator;
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

  // Manage collapsed state. Use the shutdown flag in lieu of `stopPropagation`.
  const [collapsed, collapse] = React.useState(false);
  const collapsible = !!runningItem.children?.length;
  const onClick = collapsible
    ? () => !stopPropagation && collapse(!collapsed)
    : undefined;

  if (runningItem.className) {
    classList.push(runningItem.className);
  }
  if (props.child) {
    classList.push('jp-mod-running-child');
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
              <caretRightIcon.react tag="span" stylesheet="runningItem" />
            ) : (
              <caretDownIcon.react tag="span" stylesheet="runningItem" />
            ))}
          {icon ? (
            typeof icon === 'string' ? (
              <img src={icon} />
            ) : (
              <icon.react tag="span" stylesheet="runningItem" />
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
            runningItems={runningItem.children!}
            shutdownItemIcon={shutdownItemIcon}
            translator={translator}
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
  filter?: (item: IRunningSessions.IRunningItem) => Partial<IScore> | null;
  translator?: ITranslator;
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
    <ul className={LIST_CLASS}>
      {items.map((item, i) => (
        <Item
          child={props.child}
          key={i}
          runningItem={item}
          shutdownLabel={props.shutdownLabel}
          shutdownItemIcon={props.shutdownItemIcon}
          translator={props.translator}
        />
      ))}
    </ul>
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
    let labels = [item.label()];
    for (const child of item.children ?? []) {
      labels.push(child.label());
    }
    return this._filterFn(labels.join(''));
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
  constructor(
    private _options: {
      manager: IRunningSessions.IManager;
      runningItems: IRunningSessions.IRunningItem[];
      shutdownAllLabel: string;
      filterProvider?: IFilterProvider;
      translator?: ITranslator;
    }
  ) {
    super();
    _options.manager.runningChanged.connect(this._emitUpdate, this);
    if (_options.filterProvider) {
      _options.filterProvider.filterChanged.connect(this._emitUpdate, this);
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
            options.runningItems = options.manager.running();
          }
          return (
            <div className={CONTAINER_CLASS}>
              <List
                runningItems={options.runningItems}
                shutdownLabel={options.manager.shutdownLabel}
                shutdownAllLabel={options.shutdownAllLabel}
                shutdownItemIcon={options.manager.shutdownItemIcon}
                filter={options.filterProvider?.filter}
                translator={options.translator}
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
  constructor(options: Section.IOptions) {
    super();
    this._manager = options.manager;
    this._filterProvider = options.filterProvider;
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
    this._button = new ToolbarButton({
      label: shutdownAllLabel,
      className: `${SHUTDOWN_ALL_BUTTON_CLASS}${
        !enabled ? ' jp-mod-disabled' : ''
      }`,
      enabled,
      onClick: onShutdown
    });
    this._manager.runningChanged.connect(this._onListChanged, this);
    if (options.filterProvider) {
      options.filterProvider.filterChanged.connect(this._onListChanged, this);
    }
    this._updateEmptyClass();

    if (options.showToolbar !== false) {
      this.toolbar.addItem('shutdown-all', this._button);
    }

    this.addWidget(
      new ListWidget({
        runningItems,
        shutdownAllLabel,
        ...options
      })
    );
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

  private _onListChanged(): void {
    this._updateButton();
    this._updateEmptyClass();
  }

  private _updateEmptyClass(): void {
    if (this._filterProvider) {
      const items = this._manager.running().filter(this._filterProvider.filter);
      const empty = items.length === 0;
      if (empty) {
        this.node.classList.toggle('jp-mod-empty', true);
      } else {
        this.node.classList.toggle('jp-mod-empty', false);
      }
    }
  }

  private _updateButton(): void {
    const button = this._button;
    button.enabled = this._manager.running().length > 0;
    if (button.enabled) {
      button.node
        .querySelector('jp-button')
        ?.classList.remove('jp-mod-disabled');
    } else {
      button.node.querySelector('jp-button')?.classList.add('jp-mod-disabled');
    }
  }

  private _button: ToolbarButton;
  private _manager: IRunningSessions.IManager;
  private _filterProvider?: IFilterProvider;
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
  constructor(managers: IRunningSessionManagers, translator?: ITranslator) {
    super();
    this.managers = managers;
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
  protected addSection(_: unknown, manager: IRunningSessions.IManager) {
    this.addWidget(new Section({ manager, translator: this.translator }));
  }

  protected managers: IRunningSessionManagers;
  protected translator: ITranslator;
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
        this._filterWidget.node.querySelector('input')?.focus();
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
    const items = [
      ...this.node.querySelectorAll('.' + ITEM_CLASS)
    ] as HTMLElement[];
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
  protected addSection(_: unknown, manager: IRunningSessions.IManager) {
    const section = new TitledSection({
      manager,
      translator: this._translator,
      showToolbar: false,
      filterProvider: this._filterWidget
    });
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
    label: () => string;

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
