import React from 'react';
import { IconItem } from '../component/icon';
import { TextItem } from '../component/text';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import {
    ServiceManager,
    Kernel,
    TerminalSession,
    TerminalManager,
    SessionManager
} from '@jupyterlab/services';
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { ISignal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { IDefaultsManager } from './manager';
import { GroupItem } from '../component/group';
import vars from '../style/variables';
import { interactiveItem } from '../style/statusBar';

// tslint:disable-next-line:variable-name
const RunningSessionsComponent = (
    props: RunningSessionsComponent.IProps
): React.ReactElement<RunningSessionsComponent.IProps> => {
    return (
        <GroupItem
            spacing="5px"
            onClick={props.handleClick}
            title={'Number of active sessions'}
        >
            <GroupItem spacing={vars.textIconHalfSpacing}>
                <TextItem source={props.kernels} />
                <IconItem source={'kernel-item'} />
            </GroupItem>
            <GroupItem spacing={vars.textIconHalfSpacing}>
                <TextItem source={props.terminals} />
                <IconItem source={'terminal-item'} />
            </GroupItem>
        </GroupItem>
    );
};

namespace RunningSessionsComponent {
    export interface IProps {
        handleClick: () => void;
        kernels: number;
        terminals: number;
    }
}

class RunningSessions extends VDomRenderer<RunningSessions.Model>
    implements IRunningSessions {
    constructor(opts: RunningSessions.IOptions) {
        super();
        this._serviceManager = opts.serviceManager;
        this._host = opts.host;

        this._serviceManager.sessions.runningChanged.connect(
            this._onKernelsRunningChanged
        );
        this._serviceManager.terminals.runningChanged.connect(
            this._onTerminalsRunningChanged
        );

        this.model = new RunningSessions.Model();

        this.addClass(interactiveItem);
    }

    render() {
        return (
            <RunningSessionsComponent
                kernels={this.model!.kernels}
                terminals={this.model!.terminals}
                handleClick={this._handleItemClick}
            />
        );
    }

    private _onKernelsRunningChanged = (
        manager: SessionManager,
        kernels: Kernel.IModel[]
    ) => {
        this.model!.kernels = kernels.length;
    };

    private _onTerminalsRunningChanged = (
        manager: TerminalManager,
        terminals: TerminalSession.IModel[]
    ) => {
        this.model!.terminals = terminals.length;
    };

    private _handleItemClick = () => {
        this._host.expandLeft();
        this._host.activateById('jp-running-sessions');
    };

    private _host: ApplicationShell;
    private _serviceManager: ServiceManager;
}

namespace RunningSessions {
    export class Model extends VDomModel implements IRunningSessions.IModel {
        get kernels() {
            return this._kernels;
        }

        set kernels(kernels: number) {
            this._kernels = kernels;

            this.stateChanged.emit(void 0);
        }

        get terminals() {
            return this._terminals;
        }

        set terminals(terminals: number) {
            this._terminals = terminals;

            this.stateChanged.emit(void 0);
        }

        private _terminals: number = 0;
        private _kernels: number = 0;
    }

    export interface IOptions {
        host: ApplicationShell;
        serviceManager: ServiceManager;
    }
}

export interface IRunningSessions extends IDisposable {
    readonly model: IRunningSessions.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace IRunningSessions {
    export interface IModel {
        readonly terminals: number;
        readonly kernels: number;
    }
}

// tslint:disable-next-line:variable-name
export const IRunningSessions = new Token<IRunningSessions>(
    'jupyterlab-statusbar/IRunningSessions'
);

/*
 * Initialization data for the statusbar extension.
 */
export const runningSessionsItem: JupyterLabPlugin<IRunningSessions> = {
    id: 'jupyterlab-statusbar/default-items:running-sessions',
    autoStart: true,
    provides: IRunningSessions,
    requires: [IDefaultsManager],
    activate: (app: JupyterLab, manager: IDefaultsManager) => {
        const item = new RunningSessions({
            host: app.shell,
            serviceManager: app.serviceManager
        });

        manager.addDefaultStatus('running-sessions-item', item, {
            align: 'left'
        });

        return item;
    }
};
