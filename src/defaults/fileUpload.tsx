import * as React from 'react';
import { TextItem } from '../component/text';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { IDefaultStatusesManager } from './manager';
import {
    IUploadModel,
    FileBrowserModel,
    IFileBrowserFactory,
    FileBrowser
} from '@jupyterlab/filebrowser';

import { IChangedArgs } from '@jupyterlab/coreutils';
import { Signal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';

import { ProgressBar } from '../component/progressBar';
import { VDomRenderer } from '@jupyterlab/apputils';
import { GroupItem } from '../component/group';

// tslint:disable-next-line:variable-name
const FileUploadComponent = (
    props: FileUploadComponent.IProps
): React.ReactElement<FileUploadComponent.IProps> => {
    return (
        <GroupItem>
            <TextItem source={'Uploading'} />
            <ProgressBar percentage={props.upload} />
        </GroupItem>
    );
};

namespace FileUploadComponent {
    export interface IProps {
        upload: IUploadModel['progress'];
    }
}

class FileUpload extends VDomRenderer<FileUpload.Model> implements IFileUpload {
    constructor(opts: FileUpload.IOptions) {
        super();
        this._browser = opts.browser;
        this._browser.tracker.currentChanged.connect(this._onDefaultChange);

        this.model = new FileUpload.Model(this._browser.defaultBrowser);
    }

    render() {
        if (
            this.model === null ||
            this.model === undefined ||
            this.model.upload === undefined ||
            this.model.upload === 100
        ) {
            return null;
        } else {
            return <FileUploadComponent upload={this.model.upload} />;
        }
    }

    private _onDefaultChange = ({}, defaultBrowser: FileBrowser | null) => {
        if (defaultBrowser === null) {
            this.model!.defaultBrowser = null;
        } else {
            this.model!.defaultBrowser = defaultBrowser;
        }
    };

    private _browser: IFileBrowserFactory;
}

namespace FileUpload {
    export class Model implements VDomRenderer.IModel, IFileUpload.IModel {
        constructor(defaultBrowser: FileBrowser | null) {
            this.defaultBrowser = defaultBrowser;
        }
        get upload() {
            return this._upload;
        }

        set defaultBrowser(defaultBrowser: FileBrowser | null) {
            this._defaultBrowser = defaultBrowser;

            if (this._defaultBrowser === null) {
                this._upload = 0;
            } else {
                this._defaultBrowser.model.uploadChanged.connect(
                    this._uploadChanged
                );
            }

            this._stateChanged.emit(void 0);
        }

        get stateChanged() {
            return this._stateChanged;
        }

        get isDisposed() {
            return this._isDisposed;
        }

        dispose() {
            if (this._isDisposed) {
                return;
            }

            Signal.clearData(this);
            this._isDisposed = true;
        }

        private _uploadChanged = (
            browse: FileBrowserModel,
            uploads: IChangedArgs<IUploadModel>
        ) => {
            if (uploads.newValue) {
                this._upload = uploads.newValue.progress * 100;
            } else {
                this._upload = 100;
            }

            this._stateChanged.emit(void 0);
        };

        private _isDisposed: boolean = false;
        private _upload: IUploadModel['progress'];
        private _defaultBrowser: FileBrowser | null;
        private _stateChanged: Signal<this, void> = new Signal(this);
    }

    export interface IOptions {
        readonly browser: IFileBrowserFactory;
    }
}

export interface IFileUpload extends IDisposable {
    readonly model: IFileUpload.IModel | null;
}

// tslint:disable-next-line:variable-name
export const IFileUpload = new Token<IFileUpload>(
    'jupyterlab-statusbar/IFileUpload'
);

export namespace IFileUpload {
    export interface IModel {
        readonly upload: IUploadModel['progress'];
    }
}

export const fileUploadItem: JupyterLabPlugin<IFileUpload> = {
    id: 'jupyterlab-statusbar/default-items:file-upload',
    autoStart: true,
    provides: IFileUpload,
    requires: [IDefaultStatusesManager, IFileBrowserFactory],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        browser: IFileBrowserFactory
    ) => {
        const item = new FileUpload({
            browser
        });

        manager.addDefaultStatus('file-upload-item', item, {
            align: 'middle'
        });

        return item;
    }
};
