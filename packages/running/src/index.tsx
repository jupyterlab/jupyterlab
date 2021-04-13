// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module running
 */

import {
  Dialog,
  ReactWidget,
  showDialog,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/apputils';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { closeIcon, LabIcon, refreshIcon } from '@jupyterlab/ui-components';

import { Token } from '@lumino/coreutils';

import { DisposableDelegate, IDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import * as React from 'react';

/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to a running widget header.
 */
const HEADER_CLASS = 'jp-RunningSessions-header';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-RunningSessions-section';

/**
 * The class name added to the running sessions section header.
 */
const SECTION_HEADER_CLASS = 'jp-RunningSessions-sectionHeader';

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

/* tslint:disable */
/**
 * The running sessions token.
 */
export const IRunningSessionManagers = new Token<IRunningSessionManagers>(
  '@jupyterlab/running:IRunningSessionManagers'
);
/* tslint:enable */

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
   * Return an array of managers.
   */
  items(): ReadonlyArray<IRunningSessions.IManager>;
}

export class RunningSessionManagers implements IRunningSessionManagers {
  /**
   * Add a running item manager.
   *
   * @param manager - The running item manager.
   *
   */
  add(manager: IRunningSessions.IManager): IDisposable {
    this._managers.push(manager);
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

function ListView(props: {
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

function List(props: {
  manager: IRunningSessions.IManager;
  shutdownLabel?: string;
  shutdownAllLabel?: string;
  translator?: ITranslator;
}) {
  return (
    <UseSignal signal={props.manager.runningChanged}>
      {() => (
        <ListView
          runningItems={props.manager.running()}
          shutdownLabel={props.shutdownLabel}
          shutdownAllLabel={props.shutdownAllLabel}
          shutdownItemIcon={props.manager.shutdownItemIcon}
          translator={props.translator}
        />
      )}
    </UseSignal>
  );
}

/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on its props.
 */
function Section(props: {
  manager: IRunningSessions.IManager;
  translator?: ITranslator;
}) {
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const shutdownAllLabel =
    props.manager.shutdownAllLabel || trans.__('Shut Down All');
  const shutdownTitle = `${shutdownAllLabel}?`;
  const shutdownAllConfirmationText =
    props.manager.shutdownAllConfirmationText ||
    `${shutdownAllLabel} ${props.manager.name}`;
  function onShutdown() {
    void showDialog({
      title: shutdownTitle,
      body: shutdownAllConfirmationText,
      buttons: [
        Dialog.cancelButton({ label: trans.__('Cancel') }),
        Dialog.warnButton({ label: shutdownAllLabel })
      ]
    }).then(result => {
      if (result.button.accept) {
        props.manager.shutdownAll();
      }
    });
  }

  return (
    <div className={SECTION_CLASS}>
      <>
        <div className={`${SECTION_HEADER_CLASS} jp-stack-panel-header`}>
          <h2>{props.manager.name}</h2>
          <UseSignal signal={props.manager.runningChanged}>
            {() => {
              const disabled = props.manager.running().length === 0;
              return (
                <button
                  className={`${SHUTDOWN_ALL_BUTTON_CLASS} jp-mod-styled ${
                    disabled && 'jp-mod-disabled'
                  }`}
                  disabled={disabled}
                  onClick={onShutdown}
                >
                  {shutdownAllLabel}
                </button>
              );
            }}
          </UseSignal>
        </div>

        <div className={CONTAINER_CLASS}>
          <List
            manager={props.manager}
            shutdownLabel={props.manager.shutdownLabel}
            shutdownAllLabel={shutdownAllLabel}
            translator={props.translator}
          />
        </div>
      </>
    </div>
  );
}

function RunningSessionsComponent(props: {
  managers: IRunningSessionManagers;
  translator?: ITranslator;
}) {
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  return (
    <>
      <div className={HEADER_CLASS}>
        <ToolbarButtonComponent
          tooltip={trans.__('Refresh List')}
          icon={refreshIcon}
          onClick={() =>
            props.managers.items().forEach(manager => manager.refreshRunning())
          }
        />
      </div>
      {props.managers.items().map(manager => (
        <Section
          key={manager.name}
          manager={manager}
          translator={props.translator}
        />
      ))}
    </>
  );
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends ReactWidget {
  /**
   * Construct a new running widget.
   */
  constructor(managers: IRunningSessionManagers, translator?: ITranslator) {
    super();
    this.managers = managers;
    this.translator = translator || nullTranslator;

    // this can't be in the react element, because then it would be too nested
    this.addClass(RUNNING_CLASS);
  }

  protected render() {
    return (
      <RunningSessionsComponent
        managers={this.managers}
        translator={this.translator}
      />
    );
  }

  private managers: IRunningSessionManagers;
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
