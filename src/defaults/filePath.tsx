import React from 'react';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { IDefaultsManager } from './manager';
import { TextItem } from '../component/text';
import {
    DocumentRegistry,
    IDocumentWidget,
    DocumentWidget
} from '@jupyterlab/docregistry';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { IDisposable } from '@phosphor/disposable';
import { ISignal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';
import { PathExt } from '@jupyterlab/coreutils';

namespace FilePathComponent {
    export interface IProps {
        path: string;
    }
}

// tslint:disable-next-line:variable-name
const FilePathComponent = (
    props: FilePathComponent.IProps
): React.ReactElement<FilePathComponent.IProps> => {
    return (
        <TextItem title={props.path} source={PathExt.basename(props.path)} />
    );
};

class FilePath extends VDomRenderer<FilePath.Model> implements IFilePath {
    constructor(opts: FilePath.IOptions) {
        super();

        this._shell = opts.shell;

        this._shell.currentChanged.connect(this._onShellCurrentChanged);

        const currentWidget = this._shell.currentWidget;
        this.model = new FilePath.Model(
            currentWidget && currentWidget instanceof DocumentWidget
                ? currentWidget
                : null
        );
    }

    render() {
        if (this.model === null) {
            return null;
        } else {
            return <FilePathComponent path={this.model.path} />;
        }
    }

    private _onShellCurrentChanged = (
        shell: ApplicationShell,
        change: ApplicationShell.IChangedArgs
    ) => {
        if (
            change.newValue !== null &&
            change.newValue instanceof DocumentWidget
        ) {
            this.model!.document = change.newValue;
        } else {
            this.model!.document = null;
        }
    };

    private _shell: ApplicationShell;
}

namespace FilePath {
    export class Model extends VDomModel implements IFilePath.IModel {
        constructor(document: IDocumentWidget | null) {
            super();

            this.document = document;
        }

        get path() {
            return this._path;
        }

        get document() {
            return this._document;
        }

        set document(document: IDocumentWidget | null) {
            this._document = document;

            if (this._document === null) {
                this._path = '';
            } else {
                this._path = this._document.context.path;

                this._document.context.pathChanged.connect(this._onPathChange);
            }

            this.stateChanged.emit(void 0);
        }

        private _onPathChange = (
            _documentModel: DocumentRegistry.IContext<DocumentRegistry.IModel>,
            newPath: string
        ) => {
            this._path = newPath;

            this.stateChanged.emit(void 0);
        };

        private _path: string = '';
        private _document: IDocumentWidget | null = null;
    }

    export interface IOptions {
        shell: ApplicationShell;
    }
}

export interface IFilePath extends IDisposable {
    readonly model: IFilePath.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace IFilePath {
    export interface IModel {
        readonly path: string;
        readonly document: IDocumentWidget | null;
    }
}

// tslint:disable-next-line:variable-name
export const IFilePath = new Token<IFilePath>('jupyterlab-statusbar/IFilePath');

export const filePathItem: JupyterLabPlugin<IFilePath> = {
    id: 'jupyterlab-statusbar/default-items:file-path-item',
    autoStart: true,
    provides: IFilePath,
    requires: [IDefaultsManager],
    activate: (app: JupyterLab, manager: IDefaultsManager) => {
        let item = new FilePath({ shell: app.shell });

        manager.addDefaultStatus('file-path-item', item, {
            align: 'right',
            priority: 0,
            isActive: () => {
                const currentWidget = app.shell.currentWidget;
                return (
                    !!currentWidget && currentWidget instanceof DocumentWidget
                );
            }
        });

        return item;
    }
};
