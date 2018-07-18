import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { Widget } from '@phosphor/widgets';

import { TextItem } from '../component/text';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { IStatusContext } from '../contexts';

export namespace FilePathComponent {
    export interface IState {
        path: string;
    }
    export interface IProps {
        notebookTracker: INotebookTracker;
        // imageTracker: IImageTracker;
        editorTracker: IEditorTracker;
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
        this.props.notebookTracker.currentChanged.connect(
            this._onNotebookChanged
        );
        // this.props.imageTracker.currentChanged.connect(this.imageChanged);
        this.props.editorTracker.currentChanged.connect(this._onTextChanged);
    }

    private _onNotebookChanged = (
        tracker: INotebookTracker,
        panel: NotebookPanel | null
    ) => {
        if (panel) {
            this.setState({ path: panel.context.path });
        } else {
            this.setState({ path: '' });
        }
    };

    private _onTextChanged = (
        {},
        text: IDocumentWidget<FileEditor, DocumentRegistry.IModel> | null
    ) => {
        if (text) {
            this.setState({ path: text.context.path });
        } else {
            this.setState({ path: '' });
        }
    };

    render() {
        return <TextItem source={this.state.path} />;
    }
}

export class FilePath extends Widget {
    constructor(opts: FilePath.IOptions) {
        super();
        this._notebookTracker = opts.notebookTracker;
        // this._imageTracker = opts.imageTracker;
        this._editorTracker = opts.editorTracker;
    }

    onBeforeAttach() {
        ReactDOM.render(
            <FilePathComponent
                notebookTracker={this._notebookTracker}
                editorTracker={this._editorTracker}
                // imageTracker={this._imageTracker}
            />,
            this.node
        );
    }

    private _notebookTracker: INotebookTracker;
    // private _imageTracker: IImageTracker;
    private _editorTracker: IEditorTracker;
}

export const filePathItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:file-path-item',
    autoStart: true,
    requires: [
        IDefaultStatusesManager,
        INotebookTracker,
        IEditorTracker
        // IImageTracker
    ],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        notebookTracker: INotebookTracker,
        editorTracker: IEditorTracker
        // imageTracker: IImageTracker
    ) => {
        manager.addDefaultStatus(
            'file-path-item',
            new FilePath({ notebookTracker, editorTracker }),
            {
                align: 'right',
                priority: 0,
                isActive: IStatusContext.delegateActive(app.shell, [
                    { tracker: notebookTracker },
                    { tracker: editorTracker }
                ])
            }
        );
    }
};

export namespace FilePath {
    export interface IOptions {
        notebookTracker: INotebookTracker;
        // imageTracker: IImageTracker;
        editorTracker: IEditorTracker;
    }
}
