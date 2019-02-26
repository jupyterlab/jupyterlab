// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { IIterator, iter, toArray } from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

import { ReactWidget } from '@jupyterlab/apputils';

import { ToolbarButtonComponent } from '@jupyterlab/apputils';

import { currentCollaborations } from '@jupyterlab/datastore';

import '../style/index.css';

/**
 * The class name added to a running widget.
 */
const RUNNING_CLASS = 'jp-RunningSessions';

/**
 * The class name added to a running widget header.
 */
const HEADER_CLASS = 'jp-RunningSessions-header';

/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-RunningSessions-sectionList';

/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-RunningSessions-item';

/**
 * The class name added to a running session item icon.
 */
const ITEM_ICON_CLASS = 'jp-RunningSessions-itemIcon';

/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-RunningSessions-itemLabel';

/**
 * The class name added to a file icon.
 */
const FILE_ICON_CLASS = 'jp-mod-file';

/**
 * Props for a collaboration, with items of type M
 */
type SessionProps<M> = {
  // A signal that ttracks when the `open` is clicked on a session item
  openRequested: Signal<Collaborations, M>;
  manager: {
    // A signal that should emit a new list of items whenever they are changed
    changed: ISignal<any, M[]>;
    // list the current values.
    values(): IIterator<M>;
    // refresh the values.
    refresh(): Promise<void>;
  };
  // Class for the icon
  iconClass: (model: M) => string;
  // called to determine the label for each item
  label: (model: M) => string;
  // called to determine the `title` attribute for each item, which is revealed on hover
  labelTitle?: (model: M) => string;
};

function Item<M>(props: SessionProps<M> & { model: M }) {
  const { model } = props;
  return (
    <li className={ITEM_CLASS}>
      <span className={`${ITEM_ICON_CLASS} ${props.iconClass(model)}`} />
      <span
        className={ITEM_LABEL_CLASS}
        title={props.labelTitle ? props.labelTitle(model) : ''}
        onClick={() => props.openRequested.emit(model)}
      >
        {props.label(model)}
      </span>
    </li>
  );
}

function ListView<M>(props: { models: M[] } & SessionProps<M>) {
  const { models, ...rest } = props;
  return (
    <ul className={LIST_CLASS}>
      {models.map((m, i) => (
        <Item key={i} model={m} {...rest} />
      ))}
    </ul>
  );
}

function List<M>(props: SessionProps<M>) {
  const models = toArray(props.manager.values());
  return <ListView models={models} {...props} />;
}

interface ICollaborationProps {
  openRequested: Signal<
    Collaborations,
    currentCollaborations.CollaborationInfo
  >;
}

class Manager {
  values() {
    return iter(this._values);
  }

  async refresh() {
    const infoMap = (await currentCollaborations()).collaborations;
    this._values = [];
    for (let key in infoMap) {
      this._values.push(infoMap[key]);
    }
    this._changed.emit(this._values);
  }

  get changed(): ISignal<this, currentCollaborations.CollaborationInfo[]> {
    return this._changed;
  }

  private _changed = new Signal<
    this,
    currentCollaborations.CollaborationInfo[]
  >(this);
  private _values: currentCollaborations.CollaborationInfo[] = [];
}

function CollaborationsComponent({ openRequested }: ICollaborationProps) {
  const manager = new Manager();
  return (
    <>
      <div className={HEADER_CLASS}>
        <ToolbarButtonComponent
          tooltip="Refresh List"
          iconClassName="jp-RefreshIcon jp-Icon jp-Icon-16"
          onClick={() => {
            manager.refresh();
          }}
        />
      </div>
      <List
        openRequested={openRequested}
        iconClass={() => `${ITEM_ICON_CLASS} ${FILE_ICON_CLASS}`}
        label={info => info.friendlyName}
        manager={manager}
      />
    </>
  );
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class Collaborations extends ReactWidget {
  /**
   * Construct a new running widget.
   */
  constructor() {
    super();

    // this can't be in the react element, because then it would be too nested
    this.addClass(RUNNING_CLASS);
  }

  protected render() {
    return <CollaborationsComponent openRequested={this._openRequested} />;
  }

  /**
   * A signal emitted when a kernel session open is requested.
   */
  get openRequested(): ISignal<this, currentCollaborations.CollaborationInfo> {
    return this._openRequested;
  }

  private _openRequested = new Signal<
    this,
    currentCollaborations.CollaborationInfo
  >(this);
}
