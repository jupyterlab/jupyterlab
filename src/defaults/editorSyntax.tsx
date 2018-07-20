import React from 'react';

import { TextItem } from '../component';
import { ISignal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';
import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';
import { IDefaultsManager } from './manager';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { IStatusContext } from '../contexts';
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { IDocumentWidget, DocumentRegistry } from '@jupyterlab/docregistry';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { Mode } from '@jupyterlab/codemirror';
import { IChangedArgs } from '@jupyterlab/coreutils';

namespace EditorSyntaxComponent {
    export interface IProps {
        mode: string;
    }
}

// tslint:disable-next-line:variable-name
const EditorSyntaxComponent = (
    props: EditorSyntaxComponent.IProps
): React.ReactElement<EditorSyntaxComponent.IProps> => {
    return <TextItem title="Set programming language" source={props.mode} />;
};

class EditorSyntax extends VDomRenderer<EditorSyntax.Model>
    implements IEditorSyntax {
    constructor(opts: EditorSyntax.IOptions) {
        super();

        this._tracker = opts.tracker;

        this._tracker.currentChanged.connect(this._onEditorChange);
        this.model = new EditorSyntax.Model(
            this._tracker.currentWidget &&
                this._tracker.currentWidget.content.editor
        );
    }

    render() {
        if (this.model === null) {
            return null;
        } else {
            return <EditorSyntaxComponent mode={this.model.mode} />;
        }
    }

    private _onEditorChange = (
        tracker: IEditorTracker,
        editor: IDocumentWidget<FileEditor, DocumentRegistry.IModel> | null
    ) => {
        this.model!.editor = editor && editor.content.editor;
    };

    private _tracker: IEditorTracker;
}

namespace EditorSyntax {
    export class Model extends VDomModel implements IEditorSyntax.IModel {
        constructor(editor: CodeEditor.IEditor | null) {
            super();

            this.editor = editor;
        }

        get mode() {
            return this._mode;
        }

        get editor() {
            return this._editor;
        }

        set editor(editor: CodeEditor.IEditor | null) {
            this._editor = editor;

            if (this._editor === null) {
                this._mode = '';
            } else {
                const spec = Mode.findByMIME(this._editor.model.mimeType);
                this._mode = spec.name || spec.mode;

                this._editor.model.mimeTypeChanged.connect(
                    this._onMIMETypeChange
                );
            }

            this.stateChanged.emit(void 0);
        }

        private _onMIMETypeChange = (
            mode: CodeEditor.IModel,
            change: IChangedArgs<string>
        ) => {
            const spec = Mode.findByMIME(change.newValue);
            this._mode = spec.name || spec.mode;

            this.stateChanged.emit(void 0);
        };

        private _mode: string = '';
        private _editor: CodeEditor.IEditor | null = null;
    }

    export interface IOptions {
        tracker: IEditorTracker;
    }
}

export interface IEditorSyntax {
    readonly model: IEditorSyntax.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace IEditorSyntax {
    export interface IModel {
        readonly mode: string;
        readonly editor: CodeEditor.IEditor | null;
    }
}

// tslint:disable-next-line:variable-name
export const IEditorSyntax = new Token<IEditorSyntax>(
    'jupyterlab-statusbar/IEditorSyntax'
);

export const editorSyntax: JupyterLabPlugin<IEditorSyntax> = {
    id: 'jupyterlab-statusbar/default-items:editor-syntax-item',
    autoStart: true,
    provides: IEditorSyntax,
    requires: [IDefaultsManager, IEditorTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultsManager,
        tracker: IEditorTracker
    ) => {
        let item = new EditorSyntax({ tracker });

        manager.addDefaultStatus('editor-syntax-item', item, {
            align: 'left',
            priority: 0,
            isActive: IStatusContext.delegateActive(app.shell, [{ tracker }])
        });

        return item;
    }
};
