import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { Widget } from '@phosphor/widgets';

import { IStatusBar } from './../statusBar';

import {
    IUploadModel,
    FileBrowserModel,
    IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import { IChangedArgs } from '@jupyterlab/coreutils';

import { ProgressBar } from '../component/progressBar';

export namespace FileUploadComponent {
    export interface IState {
        upload: number;
        present: boolean;
    }
    export interface IProps {
        browser: IFileBrowserFactory;
    }
}

export class FileUploadComponent extends React.Component<
    FileUploadComponent.IProps,
    FileUploadComponent.IState
> {
    state = {
        upload: 0,
        present: false
    };
    constructor(props: FileUploadComponent.IProps) {
        super(props);
        this.props.browser.defaultBrowser.model.uploadChanged.connect(
            this.uploadChanger
        );
    }

    uploadChanger = (
        browse: FileBrowserModel,
        uploads: IChangedArgs<IUploadModel>
    ) => {
        if (uploads.newValue) {
            this.setState({ present: true });
            this.setState({ upload: uploads.newValue.progress });
        } else {
            this.setState({ upload: 1 });
            setTimeout(() => {
                this.setState({ present: false });
            }, 2000);
        }
    };

    render() {
        if (this.state.present === true) {
            return (
                <div>
                    Uploading...
                    <ProgressBar percentage={this.state.upload * 100} />
                </div>
            );
        } else {
            return null;
        }
    }
}

export class FileUpload extends Widget {
    constructor(opts: FileUpload.IOptions) {
        super();
        this._browser = opts.browser;
    }

    onBeforeAttach() {
        ReactDOM.render(
            <FileUploadComponent browser={this._browser} />,
            this.node
        );
    }
    private _browser: IFileBrowserFactory;
}

export namespace FileUpload {
    export interface IOptions {
        browser: IFileBrowserFactory;
    }
}

export const fileUploadItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:file-upload',
    autoStart: true,
    requires: [IStatusBar, IFileBrowserFactory],
    activate: (
        app: JupyterLab,
        statusBar: IStatusBar,
        browser: IFileBrowserFactory
    ) => {
        statusBar.registerStatusItem(
            'file-upload-item',
            new FileUpload({ browser }),
            { align: 'left' }
        );
    }
};
