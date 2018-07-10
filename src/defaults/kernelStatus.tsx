import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { Widget } from '@phosphor/widgets';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';
import { IClientSession } from '@jupyterlab/apputils';

// import { Kernel, KernelManager } from '@jupyterlab/services';

export namespace StatusComponent {
    export interface IState {
        kernelStatus: string;
    }
    export interface IProps {
        notebookTracker: INotebookTracker;
        consoleTracker: IConsoleTracker;
    }
}

export class StatusComponent extends React.Component<
    StatusComponent.IProps,
    StatusComponent.IState
> {
    state = {
        kernelStatus: ''
    };
    constructor(props: StatusComponent.IProps) {
        super(props);
        this.props.notebookTracker.currentChanged.connect(this.cellChanged);
        this.props.notebookTracker.activeCellChanged.connect(this.cellChanged);
        this.props.consoleTracker.currentChanged.connect(this.consoleChanged);
    }

    consoleChanged = (tracker: IConsoleTracker, consoler: ConsolePanel) => {
        if (consoler.session.kernel) {
            this.setState({ kernelStatus: consoler.session.kernel.status });
            tracker.currentWidget.session.statusChanged.connect(
                this.kernelChanged
            );
            tracker.currentWidget.session.kernelChanged.connect(
                this.kernelChanged
            );
        }
    };
    cellChanged = (tracker: INotebookTracker) => {
        if (tracker.currentWidget.session.kernel) {
            this.setState({
                kernelStatus: tracker.currentWidget.session.kernel.status
            });
            tracker.currentWidget.session.statusChanged.connect(
                this.kernelChanged
            );
            tracker.currentWidget.session.kernelChanged.connect(
                this.kernelChanged
            );
        }
    };

    kernelChanged = (session: IClientSession) => {
        if (session.kernel) {
            this.setState({
                kernelStatus: session.kernel.status
            });
        } else {
            this.setState({ kernelStatus: 'dead' });
        }
    };

    render() {
        return <div> Kernel Status: {this.state.kernelStatus} </div>;
    }
}

export class KernelStatus extends Widget {
    constructor(opts: KernelStatus.IOptions) {
        super();
        this._notebookTracker = opts.notebookTracker;
        this._consoleTracker = opts.consoleTracker;
    }
    onBeforeAttach() {
        ReactDOM.render(
            <StatusComponent
                notebookTracker={this._notebookTracker}
                consoleTracker={this._consoleTracker}
            />,
            this.node
        );
    }

    private _notebookTracker: INotebookTracker;
    private _consoleTracker: IConsoleTracker;
}

/*
 * Initialization data for the statusbar extension.
 */

export const kernelStatusItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:kernel-status',
    autoStart: true,
    requires: [IDefaultStatusesManager, INotebookTracker, IConsoleTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        notebookTracker: INotebookTracker,
        consoleTracker: IConsoleTracker
    ) => {
        manager.addDefaultStatus(
            'kernel-status-item',
            new KernelStatus({ notebookTracker, consoleTracker }),
            { align: 'left' }
        );
    }
};

export namespace KernelStatus {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        notebookTracker: INotebookTracker;
        consoleTracker: IConsoleTracker;
    }
}
