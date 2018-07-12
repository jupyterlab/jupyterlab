import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { IDefaultStatusesManager } from './manager';

import { ServiceManager, Kernel, TerminalSession } from '@jupyterlab/services';

import { Widget } from '@phosphor/widgets';

export namespace RunningSessionsComponent {
    export interface IState {
        kernelSession: number;
        terminalSession: number;
    }
    export interface IProps {
        serviceManager: ServiceManager;
        shellHost: ApplicationShell;
    }
}

export class RunningSessionsComponent extends React.Component<
    RunningSessionsComponent.IProps,
    RunningSessionsComponent.IState
> {
    state = {
        kernelSession: 0,
        terminalSession: 0
    };

    constructor(props: RunningSessionsComponent.IProps) {
        super(props);
        this.props.serviceManager.sessions.runningChanged.connect(
            this.updateKernel
        );
        this.props.serviceManager.terminals.runningChanged.connect(
            this.updateTerminal
        );
    }

    componentDidMount() {
        this.setState({
            kernelSession: this.props.serviceManager.sessions.running.length,
            terminalSession: this.props.serviceManager.terminals.running.length
        });
    }

    updateKernel = ({}, kernels: Kernel.IModel[]) => {
        this.setState({ kernelSession: kernels.length });
    };

    updateTerminal = ({}, terminals: TerminalSession.IModel[]) => {
        this.setState({ terminalSession: terminals.length });
    };

    handleClick = () => {
        this.props.shellHost.expandLeft();
        this.props.shellHost.activateById('jp-running-sessions');
    };
    render() {
        return (
            <div onClick={this.handleClick}>
                <div className={'text-item'}>{this.state.kernelSession}</div>
                <div className={'kernel-item icon-item'} />
                <div className={'text-item'}>{this.state.terminalSession}</div>
                <div className={'terminal-item icon-item'} />
            </div>
        );
    }
}

export class RunningSessions extends Widget {
    constructor(opts: RunningSessions.IOptions) {
        super();
        this._serviceManager = opts.serviceManager;
        this._host = opts.host;
    }
    onBeforeAttach() {
        ReactDOM.render(
            <RunningSessionsComponent
                serviceManager={this._serviceManager}
                shellHost={this._host}
            />,
            this.node
        );
    }

    private _host: ApplicationShell;
    private _serviceManager: ServiceManager;
}

/*
 * Initialization data for the statusbar extension.
 */

export const runningSessionsItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:running-sessions',
    autoStart: true,
    requires: [IDefaultStatusesManager],
    activate: (app: JupyterLab, manager: IDefaultStatusesManager) => {
        manager.addDefaultStatus(
            'running-sessions-item',
            new RunningSessions({
                host: app.shell,
                serviceManager: app.serviceManager
            }),
            { align: 'left' }
        );
    }
};

export namespace RunningSessions {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        host: ApplicationShell;
        serviceManager: ServiceManager;
    }
}
