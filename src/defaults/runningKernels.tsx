import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';

import { Kernel, SessionManager } from '@jupyterlab/services';

import { Widget } from '@phosphor/widgets';

import { IStatusBar } from './../statusBar';

export namespace RunningKernelsComponent {
    export interface IState {
        kernelSession: number;
    }
    export interface IProps {
        sessionManager: SessionManager;
        shellHost: ApplicationShell;
    }
}

export class RunningKernelsComponent extends React.Component<
    RunningKernelsComponent.IProps,
    RunningKernelsComponent.IState
> {
    state = {
        kernelSession: 0
    };

    constructor(props: RunningKernelsComponent.IProps) {
        super(props);
        this.props.sessionManager.runningChanged.connect(this.updateKernel);
    }

    componentDidMount() {
        Kernel.listRunning().then(value =>
            this.setState({ kernelSession: value.length })
        );
    }

    updateKernel = (kernelManage: SessionManager, kernels: Kernel.IModel[]) => {
        this.setState({ kernelSession: kernels.length });
    };

    handleClick = () => {
        this.props.shellHost.expandLeft();
        this.props.shellHost.activateById('jp-running-sessions');
    };
    render() {
        return (
            <div onClick={this.handleClick}>
                {this.state.kernelSession} Kernels Active
            </div>
        );
    }
}

export class RunningKernels extends Widget {
    constructor(opts: RunningKernels.IOptions) {
        super();
        this._manager = opts.sessionManager;
        this._host = opts.host;
    }
    onBeforeAttach() {
        ReactDOM.render(
            <RunningKernelsComponent
                sessionManager={this._manager}
                shellHost={this._host}
            />,
            this.node
        );
    }

    private _host: ApplicationShell = null;
    private _manager: SessionManager;
}

/*
 * Initialization data for the statusbar extension.
 */

export const runningKernelsItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:running-kernels',
    autoStart: true,
    requires: [IStatusBar],
    activate: (app: JupyterLab, statusBar: IStatusBar) => {
        statusBar.registerStatusItem(
            'running-kernels-item',
            new RunningKernels({
                host: app.shell,
                sessionManager: app.serviceManager.sessions
            }),
            { align: 'left' }
        );
    }
};

export namespace RunningKernels {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        host: ApplicationShell;
        sessionManager: SessionManager;
    }
}
