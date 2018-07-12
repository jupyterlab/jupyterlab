import React from 'react';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { VDomRenderer } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { ISignal, Signal } from '@phosphor/signaling';
import { Cell } from '@jupyterlab/cells';
import { IObservableMap } from '@jupyterlab/observables';
import {
    DocumentRegistry,
    IDocumentWidget,
    DocumentWidget
} from '@jupyterlab/docregistry';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { IDefaultStatusesManager } from './manager';

namespace LineColComponent {
    export interface IProps {
        line: number;
        column: number;
    }
}

// tslint:disable-next-line:variable-name
const LineColComponent = (
    props: LineColComponent.IProps
): React.ReactElement<LineColComponent.IProps> => {
    return (
        <div>
            Ln {props.line}, Col {props.column}
        </div>
    );
};

class LineCol extends VDomRenderer<LineCol.Model> implements ILineCol {
    constructor(opts: LineCol.IOptions) {
        super();

        this._notebookTracker = opts.notebookTracker;
        this._editorTracker = opts.editorTracker;
        this._shell = opts.shell;

        this._notebookTracker.currentChanged.connect(this._onNotebookChange);
        this._notebookTracker.activeCellChanged.connect(
            this._onActiveCellChange
        );
        this._notebookTracker.selectionChanged.connect(this._onNotebookChange);

        this._editorTracker.currentChanged.connect(this._onEditorChange);

        this._shell.currentChanged.connect(this._onMainAreaCurrentChange);

        this.model = new LineCol.Model(
            this._notebookTracker.activeCell &&
                this._notebookTracker.activeCell.editor
        );
    }

    protected render(): React.ReactElement<LineColComponent.IProps> | null {
        if (this.model === null) {
            return null;
        } else {
            return (
                <LineColComponent
                    line={this.model.line}
                    column={this.model.column}
                />
            );
        }
    }

    private _onNotebookChange = (tracker: INotebookTracker) => {
        this.model!.editor = tracker.activeCell.editor;
    };

    private _onActiveCellChange = (
        _tracker: INotebookTracker,
        cell: Cell | null
    ) => {
        this.model!.editor = cell && cell.editor;
    };

    private _onEditorChange = (
        _tracker: IEditorTracker,
        document: IDocumentWidget<FileEditor, DocumentRegistry.IModel> | null
    ) => {
        this.model!.editor = document && document.content.editor;
    };

    private _onMainAreaCurrentChange = (
        shell: ApplicationShell,
        change: ApplicationShell.IChangedArgs
    ) => {
        const { newValue } = change;
        if (newValue !== null) {
            if (newValue instanceof NotebookPanel) {
                const currentCell = this._notebookTracker.activeCell;
                this.model!.editor = currentCell && currentCell.editor;
            } else if (
                newValue instanceof DocumentWidget &&
                newValue.content instanceof FileEditor
            ) {
                const currentEditor = this._editorTracker.currentWidget;
                this.model!.editor =
                    currentEditor && currentEditor.content.editor;
            }
        }
    };

    private _notebookTracker: INotebookTracker;
    private _editorTracker: IEditorTracker;
    private _shell: ApplicationShell;
}

namespace LineCol {
    export class Model implements VDomRenderer.IModel, ILineCol.IModel {
        constructor(editor: CodeEditor.IEditor) {
            if (editor !== undefined && editor !== null) {
                this._editor = editor;
                const pos = editor.getCursorPosition();
                this._column = pos.column;
                this._line = pos.line;
            } else {
                this._editor = null;
                this._column = 0;
                this._line = 0;
            }
        }

        get stateChanged(): ISignal<this, void> {
            return this._stateChanged;
        }

        get editor(): CodeEditor.IEditor | null {
            return this._editor;
        }

        set editor(editor: CodeEditor.IEditor | null) {
            this._editor = editor;
            this._stateChanged.emit(void 0);

            if (this._editor === null) {
                this._column = 0;
                this._line = 0;
            } else {
                this._editor.model.selections.changed.connect(
                    this._onSelectionChanged
                );
            }
        }

        get line(): number {
            return this._line;
        }

        get column(): number {
            return this._column;
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

        private _onSelectionChanged = (
            selections: IObservableMap<CodeEditor.ITextSelection[]>,
            change: IObservableMap.IChangedArgs<CodeEditor.ITextSelection[]>
        ) => {
            let pos = this.editor!.getCursorPosition();
            this._line = pos.line;
            this._column = pos.column;

            this._stateChanged.emit(void 0);
        };

        private _stateChanged: Signal<this, void> = new Signal(this);
        private _isDisposed: boolean = false;
        private _line: number;
        private _column: number;
        private _editor: CodeEditor.IEditor | null;
    }

    export interface IOptions {
        notebookTracker: INotebookTracker;
        editorTracker: IEditorTracker;
        shell: ApplicationShell;
    }
}

export interface ILineCol extends IDisposable {
    readonly model: ILineCol.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace ILineCol {
    export interface IModel {
        readonly line: number;
        readonly column: number;
        readonly editor: CodeEditor.IEditor | null;
    }
}

// tslint:disable-next-line:variable-name
export const ILineCol = new Token<ILineCol>('jupyterlab-statusbar/ILineCol');

export const lineColItem: JupyterLabPlugin<ILineCol> = {
    id: 'jupyterlab-statusbar/default-items:line-col',
    autoStart: true,
    provides: ILineCol,
    requires: [IDefaultStatusesManager, INotebookTracker, IEditorTracker],
    activate: (
        app: JupyterLab,
        defaultsManager: IDefaultStatusesManager,
        notebookTracker: INotebookTracker,
        editorTracker: IEditorTracker
    ) => {
        let item = new LineCol({
            shell: app.shell,
            notebookTracker,
            editorTracker
        });

        defaultsManager.addDefaultStatus('line-col-item', item, {
            align: 'right',
            priority: 0
        });

        return item;
    }
};
