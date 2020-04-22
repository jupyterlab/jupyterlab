// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';
import * as React from 'react';

import {
  Dialog,
  ReactWidget,
  showDialog,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/apputils';
import { closeIcon, LabIcon, refreshIcon } from '@jupyterlab/ui-components';

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
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';

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

function Item(props: { runningItem: IRunningSessions.IRunningItem }) {
  const { runningItem } = props;
  const icon = runningItem.icon();

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
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => runningItem.shutdown()}
      >
        SHUT&nbsp;DOWN
      </button>
    </li>
  );
}

function ListView(props: { runningItems: IRunningSessions.IRunningItem[] }) {
  return (
    <ul className={LIST_CLASS}>
      {props.runningItems.map((item, i) => (
        <Item key={i} runningItem={item} />
      ))}
    </ul>
  );
}

function List(props: { manager: IRunningSessions.IManager }) {
  return (
    <UseSignal signal={props.manager.runningChanged}>
      {() => <ListView runningItems={props.manager.running()} />}
    </UseSignal>
  );
}

/**
 * The Section component contains the shared look and feel for an interactive
 * list of kernels and sessions.
 *
 * It is specialized for each based on its props.
 */
function Section(props: { manager: IRunningSessions.IManager }) {
  function onShutdown() {
    void showDialog({
      title: `Shut Down All ${props.manager.name} Sessions?`,
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({ label: 'SHUT DOWN' })
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
        <header className={SECTION_HEADER_CLASS}>
          <h2>{props.manager.name} Sessions</h2>
          <ToolbarButtonComponent
            icon={closeIcon}
            onClick={onShutdown}
            tooltip={`Shut Down All ${props.manager.name} Sessions…`}
          />
        </header>

        <div className={CONTAINER_CLASS}>
          <List manager={props.manager} />
        </div>
      </>
    </div>
  );
}

function RunningSessionsComponent(props: {
  managers: IRunningSessionManagers;
}) {
  return (
    <>
      <div className={HEADER_CLASS}>
        <ToolbarButtonComponent
          tooltip="Refresh List"
          icon={refreshIcon}
          onClick={() =>
            props.managers.items().forEach(manager => manager.refreshRunning())
          }
        />
      </div>
      {props.managers.items().map(manager => (
        <Section key={manager.name} manager={manager} />
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
  constructor(managers: IRunningSessionManagers) {
    super();
    this.managers = managers;

    // this can't be in the react element, because then it would be too nested
    this.addClass(RUNNING_CLASS);
  }

  protected render() {
    return <RunningSessionsComponent managers={this.managers} />;
  }

  private managers: IRunningSessionManagers;
}

/**
 * The namespace for the `IRunningSessions` class statics.
 */
export namespace IRunningSessions {
  /**
   * A manager of running items grouped under a single section.
   */
  export interface IManager {
    // Name that is shown to the user
    name: string;
    // called when the shutdown all button is pressed
    shutdownAll(): void;
    // list the running models.
    running(): IRunningItem[];
    // Force a refresh of the running models.
    refreshRunning(): void;
    // A signal that should be emitted when the item list has changed.
    runningChanged: ISignal<any, any>;
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
  }
}
