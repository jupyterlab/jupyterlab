import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
    Widget,
} from '@phosphor/widgets';

import {
    IStatusBar
} from './../statusBar';

import {
  IUploadModel, FileBrowserModel, IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import {
    IChangedArgs
} from '@jupyterlab/coreutils';

export
namespace FileUploadComponent {
    export
    interface IState {
        upload: number;
    }
    export
    interface IProps {
        browser: IFileBrowserFactory;
    }
}

export class FileUploadComponent extends React.Component<FileUploadComponent.IProps, FileUploadComponent.IState> {
    state = {
        upload: 0
    };
    constructor(props: FileUploadComponent.IProps) {
        super(props);
        this.props.browser.defaultBrowser.model.uploadChanged.connect(this.uploadChanger);
    }

    uploadChanger = (browse: FileBrowserModel, uploads: IChangedArgs<IUploadModel>)  => {
        // console.log(uploads.newValue.progress);
        if (uploads.newValue) {
            this.setState({upload: uploads.newValue.progress});
        } else {
            this.setState({upload: 100});
        }
    }

    render() {
        return(<div>Upload Progress: {this.state.upload}%</div>);
    }
}


export
class FileUpload extends Widget {
    constructor(opts: FileUpload.IOptions) {
        super();
        console.log('hello');
        this._browser = opts.browser;
    }

    onBeforeAttach() {
        ReactDOM.render(<FileUploadComponent browser = {this._browser} />, this.node);
    }
    private _browser: IFileBrowserFactory;
}

export
namespace FileUpload {
    export
    interface IOptions {
        browser: IFileBrowserFactory;
    }
}

export
const fileUploadItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:file-upload',
    autoStart: true,
    requires: [IStatusBar, IFileBrowserFactory],
    activate: (app: JupyterLab, statusBar: IStatusBar, browser: IFileBrowserFactory) => {
        statusBar.registerStatusItem('file-upload-item', new FileUpload( {browser} ), {align: 'left'});
    }
};
