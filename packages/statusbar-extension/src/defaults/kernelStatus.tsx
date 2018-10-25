/**
 * Default item to display the status of the kernel of the active notbeook or console.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
import React from 'react';

import {
  JupyterLabPlugin,
  JupyterLab,
  ApplicationShell
} from '@jupyterlab/application';

import { IClientSession, VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Kernel, Session } from '@jupyterlab/services';

import {
  interactiveItem,
  IStatusBar,
  TextItem,
  TextExt
} from '@jupyterlab/statusbar';

import { CommandRegistry } from '@phosphor/commands';

import { IDisposable } from '@phosphor/disposable';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import { IStatusContext } from '../contexts';

// tslint:disable-next-line:variable-name
const KernelStatusComponent = (
  props: KernelStatusComponent.IProps
): React.ReactElement<KernelStatusComponent.IProps> => {
  return (
    <TextItem
      onClick={props.handleClick}
      source={`${TextExt.titleCase(props.name)} | ${TextExt.titleCase(
        props.status
      )}`}
    />
  );
};

namespace KernelStatusComponent {
  export interface IProps {
    handleClick: () => void;
    name: string;
    status: Kernel.Status;
  }
}

class KernelStatus extends VDomRenderer<KernelStatus.Model>
  implements IKernelStatus {
  constructor(opts: KernelStatus.IOptions) {
    super();

    this._notebookTracker = opts.notebookTracker;
    this._consoleTracker = opts.consoleTracker;
    this._commands = opts.commands;
    this._shell = opts.shell;

    this._shell.currentChanged.connect(
      this._onCurrentChanged,
      this
    );

    this.model = new KernelStatus.Model(
      this._getFocusedSession(this._shell.currentWidget)
    );

    this.addClass(interactiveItem);
  }

  readonly model: KernelStatus.Model;

  render() {
    if (this.model === null) {
      return null;
    } else {
      return (
        <KernelStatusComponent
          status={this.model.status}
          name={this.model.name}
          handleClick={this._handleClick}
        />
      );
    }
  }

  dispose() {
    super.dispose();
    Signal.disconnectAll(this);
    this._shell.currentChanged.disconnect(this._onCurrentChanged);
  }

  protected onUpdateRequest(msg: Message) {
    this.model.session = this._getFocusedSession(this._shell.currentWidget);
    super.onUpdateRequest(msg);
  }

  private _handleClick = () => {
    // The kernel menu flavor of change kernel delegates
    // based on the active widget, so use that.
    this._commands.execute('kernelmenu:change');
  };

  private _onTitleChanged = () => {
    const name = this._shell.currentWidget
      ? this._shell.currentWidget.title.label
      : 'activity';
    this.node.title = `Change active kernel for ${name}`;
  };

  private _getFocusedSession(val: Widget | null): IClientSession | null {
    if (!val) {
      return null;
    } else {
      if (this._notebookTracker.has(val)) {
        return (val as NotebookPanel).session;
      } else if (this._consoleTracker.has(val)) {
        return (val as ConsolePanel).session;
      } else {
        return null;
      }
    }
  }

  private _onCurrentChanged(
    shell: ApplicationShell,
    change: ApplicationShell.IChangedArgs
  ): void {
    if (this._current) {
      this._current.title.changed.disconnect(this._onTitleChanged, this);
    }
    this._current = change.newValue;
    this._current.title.changed.connect(
      this._onTitleChanged,
      this
    );
    const session = this._getFocusedSession(this._current);
    this.model.session = session;
  }

  private _current: Widget | undefined;
  private _notebookTracker: INotebookTracker;
  private _consoleTracker: IConsoleTracker;
  private _shell: ApplicationShell;
  private _commands: CommandRegistry;
}

namespace KernelStatus {
  export class Model extends VDomModel implements IKernelStatus.IModel {
    constructor(session: IClientSession | null) {
      super();
      this.session = session;
    }

    get name() {
      return this._kernelName;
    }

    get status() {
      return this._kernelStatus;
    }

    get type() {
      return this._session && this._session.type;
    }

    get session() {
      return this._session;
    }

    set session(session: IClientSession | null) {
      const oldSession = this._session;
      if (oldSession !== null) {
        oldSession.statusChanged.disconnect(this._onKernelStatusChanged);
        oldSession.kernelChanged.disconnect(this._onKernelChanged);
      }

      const oldState = this._getAllState();
      this._session = session;
      if (this._session === null) {
        this._kernelStatus = 'unknown';
        this._kernelName = 'unknown';
      } else {
        this._kernelStatus = this._session.status;
        this._kernelName = this._session.kernelDisplayName.toLowerCase();

        this._session.statusChanged.connect(this._onKernelStatusChanged);
        this._session.kernelChanged.connect(this._onKernelChanged);
      }

      this._triggerChange(oldState, this._getAllState());
    }

    private _onKernelStatusChanged = (
      _session: IClientSession,
      status: Kernel.Status
    ) => {
      this._kernelStatus = status;
      this.stateChanged.emit(void 0);
    };

    private _onKernelChanged = (
      _session: IClientSession,
      change: Session.IKernelChangedArgs
    ) => {
      const oldState = this._getAllState();
      const { newValue } = change;
      if (newValue !== null) {
        this._kernelStatus = newValue.status;
        this._kernelName = newValue.model.name.toLowerCase();
      } else {
        this._kernelStatus = 'unknown';
        this._kernelName = 'unknown';
      }

      this._triggerChange(oldState, this._getAllState());
    };

    private _getAllState(): [string, string] {
      return [this._kernelName, this._kernelStatus];
    }

    private _triggerChange(
      oldState: [string, string],
      newState: [string, string]
    ) {
      if (oldState[0] !== newState[0] || oldState[1] !== newState[1]) {
        this.stateChanged.emit(void 0);
      }
    }

    private _kernelName: string = 'unknown';
    private _kernelStatus: Kernel.Status = 'unknown';
    private _session: IClientSession | null = null;
  }

  export interface IOptions {
    notebookTracker: INotebookTracker;
    consoleTracker: IConsoleTracker;
    shell: ApplicationShell;
    commands: CommandRegistry;
  }
}

export interface IKernelStatus extends IDisposable {
  readonly model: IKernelStatus.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

export namespace IKernelStatus {
  export interface IModel {
    readonly name: string;
    readonly status: Kernel.Status;
    readonly type: string | null;
    readonly session: IClientSession | null;
  }
}

export const kernelStatus: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar:kernel-status',
  autoStart: true,
  requires: [IStatusBar, INotebookTracker, IConsoleTracker],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    notebookTracker: INotebookTracker,
    consoleTracker: IConsoleTracker
  ) => {
    const item = new KernelStatus({
      shell: app.shell,
      notebookTracker,
      consoleTracker,
      commands: app.commands
    });

    statusBar.registerStatusItem('kernel-status-item', item, {
      align: 'left',
      rank: 1,
      isActive: IStatusContext.delegateActive(app.shell, [
        { tracker: notebookTracker },
        { tracker: consoleTracker }
      ])
    });
  }
};
