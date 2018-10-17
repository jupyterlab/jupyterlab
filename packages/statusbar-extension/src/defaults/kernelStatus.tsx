/**
 * Default item to display the status of the kernel of the active notbeook or console.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
import React from 'react';
import { TextItem } from '../component/text';

import {
  JupyterLabPlugin,
  JupyterLab,
  ApplicationShell
} from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { IDefaultsManager } from './manager';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';
import { IClientSession, VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { ISignal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';
import { IDisposable } from '@phosphor/disposable';
import { Kernel, Session } from '@jupyterlab/services';
import { Widget } from '@phosphor/widgets';
import { IStatusContext } from '../contexts';
import { TextExt } from '../util/text';
import { CommandRegistry } from '@phosphor/commands';
import { interactiveItem } from '../style/statusBar';
import { Message } from '@phosphor/messaging';
import { IFilePath } from './filePath';

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
    this._filePath = opts.filePath;

    this._shell.currentChanged.connect(this._onMainAreaCurrentChange);
    this._filePath.model!.stateChanged.connect(this._onFilePathChange);

    this.model = new KernelStatus.Model(
      this._getFocusedSession(this._shell.currentWidget)
    );

    if (this.model!.type === 'notebook') {
      this.addClass(interactiveItem);
    }

    this._onFilePathChange();
  }

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

    this._shell.currentChanged.disconnect(this._onMainAreaCurrentChange);
  }

  protected onUpdateRequest(msg: Message) {
    this.model!.session = this._getFocusedSession(this._shell.currentWidget);

    if (this.model!.type === 'notebook') {
      this.addClass(interactiveItem);
    } else {
      this.removeClass(interactiveItem);
    }

    super.onUpdateRequest(msg);
  }

  private _handleClick = () => {
    if (this.model!.type === 'notebook') {
      this._commands.execute('notebook:change-kernel');
    }
  };

  private _onFilePathChange = () => {
    if (this.model!.type === 'notebook') {
      this.node.title = `Change active kernel for ${
        this._filePath.model!.name
      }`;
    } else {
      this.node.title = `Active kernel type for ${this._filePath.model!.name}`;
    }
  };

  private _getFocusedSession(val: Widget | null): IClientSession | null {
    if (val === null) {
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

  private _onMainAreaCurrentChange = (
    shell: ApplicationShell,
    change: ApplicationShell.IChangedArgs
  ) => {
    const { newValue } = change;
    const editor = this._getFocusedSession(newValue);
    this.model!.session = editor;
    if (this.model!.type === 'notebook') {
      this.addClass(interactiveItem);
    } else {
      this.removeClass(interactiveItem);
    }
  };

  private _notebookTracker: INotebookTracker;
  private _consoleTracker: IConsoleTracker;
  private _shell: ApplicationShell;
  private _commands: CommandRegistry;
  private _filePath: IFilePath;
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
    filePath: IFilePath;
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

// tslint:disable-next-line:variable-name
export const IKernelStatus = new Token<IKernelStatus>(
  '@jupyterlab/statusbar:IKernelStatus'
);

export const kernelStatusItem: JupyterLabPlugin<IKernelStatus> = {
  id: '@jupyterlab/statusbar:kernel-status-item',
  autoStart: true,
  requires: [IDefaultsManager, INotebookTracker, IConsoleTracker, IFilePath],
  activate: (
    app: JupyterLab,
    manager: IDefaultsManager,
    notebookTracker: INotebookTracker,
    consoleTracker: IConsoleTracker,
    filePath: IFilePath
  ) => {
    const item = new KernelStatus({
      shell: app.shell,
      notebookTracker,
      consoleTracker,
      commands: app.commands,
      filePath
    });

    manager.addDefaultStatus('kernel-status-item', item, {
      align: 'left',
      priority: 1,
      isActive: IStatusContext.delegateActive(app.shell, [
        { tracker: notebookTracker },
        { tracker: consoleTracker }
      ])
    });

    return item;
  }
};
