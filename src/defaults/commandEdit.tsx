import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import {
    INotebookTracker,
    Notebook,
    NotebookPanel
} from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { IconItem } from '../component/icon';

import { Widget } from '@phosphor/widgets';
import { CommandRegistry } from '@phosphor/commands';

export namespace CommandEditComponent {
    export interface IState {
        notebookMode: string;
    }
    export interface IProps {
        tracker: INotebookTracker;
        commands: CommandRegistry;
    }
}

export class CommandEditComponent extends React.Component<
    CommandEditComponent.IProps,
    CommandEditComponent.IState
> {
    state = {
        notebookMode: ''
    };
    constructor(props: CommandEditComponent.IProps) {
        super(props);
        this.props.tracker.currentChanged.connect(this.notebookChanged);
    }

    notebookChanged = (tracker: INotebookTracker, panel: NotebookPanel) => {
        if (panel) {
            this.setState({
                notebookMode: panel.content.mode
            });
            panel.content.stateChanged.connect(this.notebookStateChanged);
        }
    };

    notebookStateChanged = (notebook: Notebook) => {
        this.setState({
            notebookMode: notebook.mode
        });
    };

    handleClick = () => {
        if (this.props.tracker.currentWidget) {
            if (this.props.tracker.currentWidget.content.mode === 'edit') {
                this.props.commands.execute('notebook:enter-command-mode');
            } else if (
                this.props.tracker.currentWidget.content.mode === 'command'
            ) {
                this.props.commands.execute('notebook:enter-edit-mode');
            }
        }
    };
    render() {
        if (this.state.notebookMode === 'edit') {
            return (
                <div onClick={this.handleClick}>
                    <IconItem source={'edit-item'} />
                </div>
            );
        } else {
            return (
                <div onClick={this.handleClick}>
                    <IconItem source={'command-item'} />
                </div>
            );
        }
    }
}

export class CommandEditStatus extends Widget {
    constructor(opts: CommandEditStatus.IOptions) {
        super();
        this._tracker = opts.tracker;
        this._commands = opts.commands;
    }
    onBeforeAttach() {
        ReactDOM.render(
            <CommandEditComponent
                tracker={this._tracker}
                commands={this._commands}
            />,
            this.node
        );
    }

    private _tracker: INotebookTracker;
    private _commands: CommandRegistry;
}

/*
 * Initialization data for the statusbar extension.
 */

export const commandEditStatusItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:command-edit-status',
    autoStart: true,
    requires: [IDefaultStatusesManager, INotebookTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        tracker: INotebookTracker
    ) => {
        manager.addDefaultStatus(
            'command-edit-status-item',
            new CommandEditStatus({ tracker, commands: app.commands }),
            { align: 'right', priority: 2 }
        );
    }
};

export namespace CommandEditStatus {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        tracker: INotebookTracker;
        commands: CommandRegistry;
    }
}
