import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { Widget } from '@phosphor/widgets';

import { IConsoleTracker } from '@jupyterlab/console';
import { TextItem } from '../component/text';

export namespace FilePathComponent {
    export interface IState {
        path: string;
    }
    export interface IProps {
        tracker: INotebookTracker;
    }
}
export class FilePathComponent extends React.Component<
    FilePathComponent.IProps,
    FilePathComponent.IState
> {
    state = {
        path: ''
    };
    constructor(props: FilePathComponent.IProps) {
        super(props);
        this.props.tracker.currentChanged.connect(this.notebookChanged);
    }

    notebookChanged = (tracker: INotebookTracker, panel: NotebookPanel) => {
        this.setState({ path: panel.context.path });
        console.log(panel.context.path);
    };

    render() {
        return <TextItem source={this.state.path} />;
    }
}

export class FilePath extends Widget {
    constructor(opts: FilePath.IOptions) {
        super();
        this._tracker = opts.tracker;
    }

    onBeforeAttach() {
        ReactDOM.render(
            <FilePathComponent tracker={this._tracker} />,
            this.node
        );
    }

    private _tracker: INotebookTracker;
}
export const filePathItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:file-path-item',
    autoStart: true,
    requires: [IDefaultStatusesManager, INotebookTracker, IConsoleTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        tracker: INotebookTracker
    ) => {
        manager.addDefaultStatus('file-path-item', new FilePath({ tracker }), {
            align: 'right',
            priority: 0
        });
    }
};

export namespace FilePath {
    export interface IOptions {
        tracker: INotebookTracker;
    }
}
