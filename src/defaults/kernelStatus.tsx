import * as React from 'react';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';
import { IClientSession, VDomRenderer } from '@jupyterlab/apputils';
import { Signal, ISignal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';
import { IDisposable } from '@phosphor/disposable';
import { Kernel, Session } from '@jupyterlab/services';
import { Widget } from '@phosphor/widgets';

// tslint:disable-next-line:variable-name
const KernelStatusComponent = (
    props: KernelStatusComponent.IProps
): React.ReactElement<KernelStatusComponent.IProps> => {
    return (
        <div>
            {props.name} | {props.status}
        </div>
    );
};

namespace KernelStatusComponent {
    export interface IProps {
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
        this._shell = opts.shell;

        this._notebookTracker.currentChanged.connect(this._onNotebookChange);
        this._consoleTracker.currentChanged.connect(this._onConsoleChange);

        this._shell.currentChanged.connect(this._onMainAreaCurrentChange);

        this.model = new KernelStatus.Model(
            this._getFocusedSession(this._shell.currentWidget)
        );
    }

    render() {
        if (this.model === null) {
            return null;
        } else {
            return (
                <KernelStatusComponent
                    status={this.model!.status}
                    name={this.model!.name}
                />
            );
        }
    }

    private _onNotebookChange = (
        _tracker: INotebookTracker,
        panel: NotebookPanel
    ) => {
        this.model!.session = panel.session;
    };

    private _onConsoleChange = (
        _tracker: IConsoleTracker,
        panel: ConsolePanel
    ) => {
        this.model!.session = panel.session;
    };

    private _getFocusedSession(val: Widget | null): IClientSession | null {
        if (val === null) {
            return null;
        } else {
            if (val instanceof NotebookPanel) {
                return (val as NotebookPanel).session;
            } else if (val instanceof ConsolePanel) {
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
    };

    private _notebookTracker: INotebookTracker;
    private _consoleTracker: IConsoleTracker;
    private _shell: ApplicationShell;
}

namespace KernelStatus {
    export class Model implements VDomRenderer.IModel, IKernelStatus.IModel {
        constructor(session: IClientSession | null) {
            this.session = session;
        }

        get name() {
            return this._kernelName;
        }

        get status() {
            return this._kernelStatus;
        }

        get session() {
            return this._session;
        }

        set session(session: IClientSession | null) {
            this._session = session;

            if (this._session === null) {
                this._kernelStatus = 'unknown';
                this._kernelName = 'unknown';
            } else {
                this._kernelStatus = this._session.status;
                this._kernelName = this._session.kernelDisplayName.toLowerCase();

                this._session.statusChanged.connect(
                    this._onKernelStatusChanged
                );
                this._session.kernelChanged.connect(this._onKernelChanged);
            }

            this._stateChanged.emit(void 0);
        }

        get stateChanged() {
            return this._stateChanged;
        }

        get isDisposed() {
            return this._isDisposed;
        }

        dispose() {
            if (this._isDisposed) {
                return;
            }

            Signal.clearData(this);
            this._isDisposed = true;
        }

        private _onKernelStatusChanged = (
            _session: IClientSession,
            status: Kernel.Status
        ) => {
            this._kernelStatus = status;
            this._stateChanged.emit(void 0);
        };

        private _onKernelChanged = (
            _session: IClientSession,
            change: Session.IKernelChangedArgs
        ) => {
            const { newValue } = change;
            if (newValue !== null) {
                this._kernelStatus = newValue.status;
                this._kernelName = newValue.model.name.toLowerCase();
            } else {
                this._kernelStatus = 'unknown';
                this._kernelName = 'unknown';
            }

            this._stateChanged.emit(void 0);
        };

        private _kernelName: string;
        private _kernelStatus: Kernel.Status;
        private _session: IClientSession | null;

        private _isDisposed: boolean = false;
        private _stateChanged: Signal<this, void> = new Signal(this);
    }

    export interface IOptions {
        notebookTracker: INotebookTracker;
        consoleTracker: IConsoleTracker;
        shell: ApplicationShell;
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
        readonly session: IClientSession | null;
    }
}

// tslint:disable-next-line:variable-name
export const IKernelStatus = new Token<IKernelStatus>(
    'jupyterlab-statusbar/IKernelStatus'
);

export const kernelStatusItem: JupyterLabPlugin<IKernelStatus> = {
    id: 'jupyterlab-statusbar/default-items:kernel-status',
    autoStart: true,
    requires: [IDefaultStatusesManager, INotebookTracker, IConsoleTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        notebookTracker: INotebookTracker,
        consoleTracker: IConsoleTracker
    ) => {
        const item = new KernelStatus({
            shell: app.shell,
            notebookTracker,
            consoleTracker
        });

        manager.addDefaultStatus('kernel-status-item', item, {
            align: 'left',
            priority: 0
        });

        return item;
    }
};
