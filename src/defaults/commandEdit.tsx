import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import {
    INotebookTracker,
    Notebook,
    NotebookPanel
} from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { Widget } from '@phosphor/widgets';

export namespace CommandEditComponent {
    export interface IState {
        mode: string;
    }
    export interface IProps {
        tracker: INotebookTracker;
    }
}

export class CommandEditComponent extends React.Component<
    CommandEditComponent.IProps,
    CommandEditComponent.IState
> {
    state = {
        mode: ''
    };
    constructor(props: CommandEditComponent.IProps) {
        super(props);
        this.props.tracker.currentChanged.connect(this.notebookChanged);
    }

    notebookChanged = (tracker: INotebookTracker, panel: NotebookPanel) => {
        if (panel) {
            this.setState({
                mode: panel.content.mode
            });
            panel.content.stateChanged.connect(this.notebookStateChanged);
        }
    };

    notebookStateChanged = (notebook: Notebook) => {
        this.setState({
            mode: notebook.mode
        });
    };
    // onClick = {this.handleClick}

    handleClick = () => {
        if (this.props.tracker.currentWidget.content.mode === 'edit') {
            this.props.tracker.currentWidget.content.mode = 'command';
        } else if (
            this.props.tracker.currentWidget.content.mode === 'command'
        ) {
            this.props.tracker.currentWidget.content.mode = 'edit';
        }
    };
    render() {
        if (this.state.mode === 'edit') {
            return (
                <div onClick={this.handleClick}>
                    <img className={'edit-item icon-item'} />
                </div>
            );
        } else {
            return (
                <div onClick={this.handleClick}>
                    <img className={'command-item icon-item'} />
                </div>
            );
        }
    }
}

export class CommandEditStatus extends Widget {
    constructor(opts: CommandEditStatus.IOptions) {
        super();
        this._tracker = opts.tracker;
    }
    onBeforeAttach() {
        ReactDOM.render(
            <CommandEditComponent tracker={this._tracker} />,
            this.node
        );
    }

    private _tracker: INotebookTracker;
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
            new CommandEditStatus({ tracker }),
            { align: 'left' }
        );
    }
};

export namespace CommandEditStatus {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        tracker: INotebookTracker;
    }
}
