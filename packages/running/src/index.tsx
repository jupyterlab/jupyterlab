// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { PathExt } from '@jupyterlab/coreutils';

import { ServiceManager, Session, TerminalSession } from '@jupyterlab/services';

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
 * The class name added to a running widget header refresh button.
 */
const REFRESH_CLASS = 'jp-RunningSessions-headerRefresh';

/**
 * The class name added to shutdown all buttons.
 */
const SHUTDOWN_CLASS = 'jp-RunningSessions-shutdownAll';

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
 * The class name added to a running session item icon.
 */
const ITEM_ICON_CLASS = 'jp-RunningSessions-itemIcon';

/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-RunningSessions-itemLabel';

/**
 * The class name added to a running session item shutdown button.
 */
const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';

/**
 * The class name added to a notebook icon.
 */
const NOTEBOOK_ICON_CLASS = 'jp-mod-notebook';

/**
 * The class name added to a console icon.
 */
const CONSOLE_ICON_CLASS = 'jp-mod-console';

/**
 * The class name added to a file icon.
 */
const FILE_ICON_CLASS = 'jp-mod-file';

/**
 * The class name added to a terminal icon.
 */
const TERMINAL_ICON_CLASS = 'jp-mod-terminal';

/**
 * Props for a Session, with items of type M
 */
type SessionProps<M> = {
  // A signal that ttracks when the `open` is clicked on a session item
  openRequested: Signal<RunningSessions, M>;
  manager: {
    // called when the shutdown all button is pressed
    shutdownAll(): void;
    // A signal that should emit a new list of items whenever they are changed
    runningChanged: ISignal<any, M[]>;
  };
  // called when the shutdown button is pressed on a particular item
  shutdown: (model: M) => void;
  // optitonal filter that is applied to the items from `runningChanged`
  filterRunning?: (model: M) => boolean;
  // Name that is shown to the user
  name: string;
  // Class for the icon
  iconClass: (model: M) => string;
  // called to determine the label for each item
  label: (model: M) => string;
  // called to determine the `title` attribute for each item, which is revealed on hover
  labelTitle?: (model: M) => string;
  // flag that set's whether it should display
  available: boolean;
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
      <button
        className={`${SHUTDOWN_BUTTON_CLASS} jp-mod-styled`}
        onClick={() => props.shutdown(model)}
      >
        SHUTDOWN
      </button>
    </li>
  );
}

class List<M> extends React.Component<SessionProps<M>, { models: M[] }> {
  constructor(props: SessionProps<M>) {
    super(props);
    this.state = { models: [] };
  }
  render() {
    return (
      <ul className={LIST_CLASS}>
        {this.state.models.map((m, i) => (
          <Item key={i} model={m} {...this.props} />
        ))}
      </ul>
    );
  }
  componentDidMount() {
    if (this.props.available) {
      this.props.manager.runningChanged.connect((_, models) =>
        this.setState({
          models: models.filter(this.props.filterRunning || (_ => true))
        })
      );
    }
  }
}

/**
 * The Section component contains the shared look and feel for an interactive list of kernels and sessions.
 *
 * It is specialized for each based on it's props.
 */
function Section<M>(props: SessionProps<M>) {
  function onShutdown() {
    showDialog({
      title: `Shutdown All ${props.name} Sessions?`,
      buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'SHUTDOWN' })]
    }).then(result => {
      if (result.button.accept) {
        props.manager.shutdownAll();
      }
    });
  }
  return (
    <div className={SECTION_CLASS}>
      {props.available && (
        <>
          <div className={SECTION_HEADER_CLASS}>
            {props.name} Sessions
            <button
              title={`Shutdown All ${props.name} Sessions…`}
              className={SHUTDOWN_CLASS}
              onClick={onShutdown}
            />
          </div>

          <div className={CONTAINER_CLASS}>
            <List {...props} />
          </div>
        </>
      )}
    </div>
  );
}

interface IRunningSessionsProps {
  manager: ServiceManager.IManager;
  sessionOpenRequested: Signal<RunningSessions, Session.IModel>;
  terminalOpenRequested: Signal<RunningSessions, TerminalSession.IModel>;
}

function RunningSessionsComponent({
  manager,
  sessionOpenRequested,
  terminalOpenRequested
}: IRunningSessionsProps) {
  const terminalsAvailable = manager.terminals.isAvailable();

  return (
    <>
      <div className={HEADER_CLASS}>
        <button
          title="Refresh List"
          className={REFRESH_CLASS}
          onClick={() => {
            if (terminalsAvailable) {
              manager.terminals.refreshRunning();
            }
            manager.sessions.refreshRunning();
          }}
        />
      </div>
      <Section
        openRequested={terminalOpenRequested}
        manager={manager.terminals}
        name="Terminal"
        iconClass={() => `${ITEM_ICON_CLASS} ${TERMINAL_ICON_CLASS}`}
        label={m => `terminals/${m.name}`}
        available={terminalsAvailable}
        shutdown={m => manager.terminals.shutdown(m.name)}
      />
      <Section
        openRequested={sessionOpenRequested}
        manager={manager.sessions}
        filterRunning={m =>
          !!((m.name || PathExt.basename(m.path)).indexOf('.') !== -1 || m.name)
        }
        name="Kernel"
        iconClass={m => {
          if ((m.name || PathExt.basename(m.path)).indexOf('.ipynb') !== -1) {
            return NOTEBOOK_ICON_CLASS;
          } else if (m.type.toLowerCase() === 'console') {
            return CONSOLE_ICON_CLASS;
          }
          return FILE_ICON_CLASS;
        }}
        label={m => m.name || PathExt.basename(m.path)}
        available={true}
        labelTitle={m => {
          let kernelName = m.kernel.name;
          if (manager.specs) {
            kernelName = manager.specs.kernelspecs[kernelName].display_name;
          }
          return `Path: ${m.path}\nKernel: ${kernelName}`;
        }}
        shutdown={m => manager.sessions.shutdown(m.id)}
      />
    </>
  );
}

/**
 * A class that exposes the running terminal and kernel sessions.
 */
export class RunningSessions extends Widget {
  /**
   * Construct a new running widget.
   */
  constructor(options: RunningSessions.IOptions) {
    super();
    this.options = options;

    // this can't be in the react element, because then it would be too nested
    this.addClass(RUNNING_CLASS);
  }

  protected onUpdateRequest(msg: Message): void {
    ReactDOM.render(
      <RunningSessionsComponent
        manager={this.options.manager}
        sessionOpenRequested={this._sessionOpenRequested}
        terminalOpenRequested={this._terminalOpenRequested}
      />,
      this.node
    );
  }

  /* Called after the widget is attached to the DOM
   *
   * Make sure the widget is rendered, even if the model has not changed.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * A signal emitted when a kernel session open is requested.
   */
  get sessionOpenRequested(): ISignal<this, Session.IModel> {
    return this._sessionOpenRequested;
  }

  /**
   * A signal emitted when a terminal session open is requested.
   */
  get terminalOpenRequested(): ISignal<this, TerminalSession.IModel> {
    return this._terminalOpenRequested;
  }

  private _sessionOpenRequested = new Signal<this, Session.IModel>(this);
  private _terminalOpenRequested = new Signal<this, TerminalSession.IModel>(
    this
  );
  private options: RunningSessions.IOptions;
}

/**
 * The namespace for the `RunningSessions` class statics.
 */
export namespace RunningSessions {
  /**
   * An options object for creating a running sessions widget.
   */
  export interface IOptions {
    /**
     * A service manager instance.
     */
    manager: ServiceManager.IManager;
  }
}
