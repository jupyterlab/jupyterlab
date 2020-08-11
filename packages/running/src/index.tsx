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
import { nullTranslator, ITranslator } from '@jupyterlab/translation';
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

function Item(props: {
  runningItem: IRunningSessions.IRunningItem;
  translator?: ITranslator;
}) {
  const { runningItem } = props;
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
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
        {trans.__('SHUT DOWN')}
      </button>
    </li>
  );
}

function ListView(props: {
  runningItems: IRunningSessions.IRunningItem[];
  translator?: ITranslator;
}) {
  return (
    <ul className={LIST_CLASS}>
      {props.runningItems.map((item, i) => (
        <Item
          key={i}
          runningItem={item}
          translator={props.translator || nullTranslator}
        />
      ))}
    </ul>
  );
}

function List(props: {
  manager: IRunningSessions.IManager;
  translator?: ITranslator;
}) {
  return (
    <UseSignal signal={props.manager.runningChanged}>
      {() => (
        <ListView
          runningItems={props.manager.running()}
          translator={props.translator || nullTranslator}
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
  function onShutdown() {
    void showDialog({
      title: trans.__('Shut Down All?'),
      body: `${props.manager.name}`,
      buttons: [
        Dialog.cancelButton({ label: trans.__('Cancel') }),
        Dialog.warnButton({ label: trans.__('SHUT DOWN') })
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
          <h2>{props.manager.name}</h2>
          <ToolbarButtonComponent
            icon={closeIcon}
            onClick={onShutdown}
            tooltip={trans.__('Shut Down All…')}
          />
        </header>

        <div className={CONTAINER_CLASS}>
          <List manager={props.manager} translator={props.translator} />
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
