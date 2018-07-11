import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { IDefaultStatusesManager } from './manager';

import { TerminalManager, TerminalSession } from '@jupyterlab/services';

import { Widget } from '@phosphor/widgets';

export namespace RunningTerminalComponent {
    export interface IState {
        terminalSession: number;
    }
    export interface IProps {
        terminalManager: TerminalManager;
        shellHost: ApplicationShell;
    }
}

export class RunningTerminalComponent extends React.Component<
    RunningTerminalComponent.IProps,
    RunningTerminalComponent.IState
> {
    state = {
        terminalSession: 0
    };

    constructor(props: RunningTerminalComponent.IProps) {
        super(props);
        this.props.terminalManager.runningChanged.connect(this.updateTerminal);
    }

    componentDidMount() {
        this.setState({
            terminalSession: this.props.terminalManager.running.length
        });
    }

    updateTerminal = (
        terminalManage: TerminalManager,
        terminals: TerminalSession.IModel[]
    ) => {
        this.setState({ terminalSession: terminals.length });
    };

    handleClick = () => {
        this.props.shellHost.expandLeft();
        this.props.shellHost.activateById('jp-running-sessions');
    };
    render() {
        return (
            <div onClick={this.handleClick}>
                {this.state.terminalSession} Terminals Active
            </div>
        );
    }
}

export class RunningTerminals extends Widget {
    constructor(opts: RunningTerminals.IOptions) {
        super();
        this._manager = opts.terminalManager;
        this._host = opts.host;
    }
    onBeforeAttach() {
        ReactDOM.render(
            <RunningTerminalComponent
                terminalManager={this._manager}
                shellHost={this._host}
            />,
            this.node
        );
    }

    private _host: ApplicationShell = null;
    private _manager: TerminalManager;
}

/*
 * Initialization data for the statusbar extension.
 */

export const runningTerminalsItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:running-terminals',
    autoStart: true,
    requires: [IDefaultStatusesManager],
    activate: (app: JupyterLab, manager: IDefaultStatusesManager) => {
        manager.addDefaultStatus(
            'running-terminals-item',
            new RunningTerminals({
                host: app.shell,
                terminalManager: app.serviceManager.terminals
            }),
            { align: 'left', priority: 2 }
        );
    }
};

export namespace RunningTerminals {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        host: ApplicationShell;
        terminalManager: TerminalManager;
    }
}
