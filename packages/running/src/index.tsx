// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running
 */

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  closeIcon,
  LabIcon,
  PanelWithToolbar,
  ReactWidget,
  refreshIcon,
  SidePanel,
  ToolbarButton,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/ui-components';
import { Token } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import * as React from 'react';

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
 * The running sessions token.
 */
export const IRunningSessionManagers = new Token<IRunningSessionManagers>(
  '@jupyterlab/running:IRunningSessionManagers'
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
  runningItem: IRunningSessions.IRunningItem;
  shutdownLabel?: string;
  shutdownItemIcon?: LabIcon;
  translator?: ITranslator;
}) {
  const { runningItem } = props;
  const icon = runningItem.icon();
  const detail = runningItem.detail?.();
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const shutdownLabel = props.shutdownLabel || trans.__('Shut Down');
  const shutdownItemIcon = props.shutdownItemIcon || closeIcon;

  return (
    <li className={ITEM_CLASS}>
      <icon.react tag="span" stylesheet="runningItem" />
      <span
        className={ITEM_LABEL_CLASS}
        title={runningItem.labelTitle ? runningItem.labelTitle() : ''}
        onClick={() => runningItem.open()}
      >
        {runningItem.label()}
      </span>
      {detail && <span className={ITEM_DETAIL_CLASS}>{detail}</span>}
      <ToolbarButtonComponent
        className={SHUTDOWN_BUTTON_CLASS}
        icon={shutdownItemIcon}
        onClick={() => runningItem.shutdown()}
        tooltip={shutdownLabel}
      />
    </li>
  );
}

function List(props: {
  runningItems: IRunningSessions.IRunningItem[];
  shutdownLabel?: string;
  shutdownAllLabel?: string;
  shutdownItemIcon?: LabIcon;
  translator?: ITranslator;
}) {
  return (
    <ul className={LIST_CLASS}>
      {props.runningItems.map((item, i) => (
        <Item
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

    const runningItems = options.manager.running();
    const enabled = runningItems.length > 0;
    this._button = new ToolbarButton({
      label: shutdownAllLabel,
      className: `${SHUTDOWN_ALL_BUTTON_CLASS} jp-mod-styled ${
        !enabled && 'jp-mod-disabled'
      }`,
      enabled,
      onClick: onShutdown
    });
    this._manager.runningChanged.connect(this._updateButton, this);

    this.toolbar.addItem('shutdown-all', this._button);

    this.addWidget(
      ReactWidget.create(
        <UseSignal signal={options.manager.runningChanged}>
          {() => {
            return (
              <div className={CONTAINER_CLASS}>
                <List
                  runningItems={runningItems}
                  shutdownLabel={options.manager.shutdownLabel}
                  shutdownAllLabel={shutdownAllLabel}
                  shutdownItemIcon={options.manager.shutdownItemIcon}
                  translator={options.translator}
                />
              </div>
            );
          }}
        </UseSignal>
      )
    );
  }

  /**
   * Dispose the resources held by the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager.runningChanged.disconnect(this._updateButton, this);
    super.dispose();
  }

  private _updateButton(): void {
    this._button.enabled = this._manager.running().length > 0;
    if (this._button.enabled) {
      this._button.node
        .querySelector('button')
        ?.classList.remove('jp-mod-disabled');
    } else {
      this._button.node
        .querySelector('button')
        ?.classList.add('jp-mod-disabled');
    }
  }

  private _button: ToolbarButton;
  private _manager: IRunningSessions.IManager;
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends SidePanel {
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
  protected addSection(
    managers: IRunningSessionManagers,
    manager: IRunningSessions.IManager
  ) {
    this.addWidget(new Section({ manager, translator: this.translator }));
  }

  protected managers: IRunningSessionManagers;
  protected translator: ITranslator;
}

/**
 * The namespace for the `IRunningSessions` class statics.
 */
export namespace IRunningSessions {
  /**
   * A manager of running items grouped under a single section.
   */
  export interface IManager {
    // Name that is shown to the user in plural
    name: string;
    // called when the shutdown all button is pressed
    shutdownAll(): void;
    // list the running models.
    running(): IRunningItem[];
    // Force a refresh of the running models.
    refreshRunning(): void;
    // A signal that should be emitted when the item list has changed.
    runningChanged: ISignal<any, any>;
    // A string used to describe the shutdown action.
    shutdownLabel?: string;
    // A string used to describe the shutdown all action.
    shutdownAllLabel?: string;
    // A string used as the body text in the shutdown all confirmation dialog.
    shutdownAllConfirmationText?: string;
    // The icon to show for shutting down an individual item in this section.
    shutdownItemIcon?: LabIcon;
  }

  /**
   * A running item.
   */
  export interface IRunningItem {
    // called when the running item is clicked
    open: () => void;
    // called when the shutdown button is pressed on a particular item
    shutdown: () => void;
    // LabIcon to use as the icon
    icon: () => LabIcon;
    // called to determine the label for each item
    label: () => string;
    // called to determine the `title` attribute for each item, which is revealed on hover
    labelTitle?: () => string;
    // called to determine the `detail` attribute which is shown optionally
    // in a column after the label
    detail?: () => string;
  }
}
