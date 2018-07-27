import React from 'react';
import { TextItem } from '../component/text';
import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import {
    VDomRenderer,
    VDomModel,
    ReactElementWidget
} from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { ISignal } from '@phosphor/signaling';
import { Cell } from '@jupyterlab/cells';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';
import { IStatusContext } from '../contexts';
import { showPopup, Popup } from '../component/hover';
import { IDefaultsManager } from './manager';
import { interactiveItem } from '../style/statusBar';
import {
    lineFormWrapper,
    lineFormInput,
    lineFormSearch,
    lineFormWrapperFocusWithin,
    lineFormCaption,
    lineFormButton
} from '../style/lineForm';
import { classes } from 'typestyle/lib';
import { Message } from '@phosphor/messaging';

namespace LineForm {
    export interface IProps {
        handleSubmit: (value: number) => void;
        currentLine: number;
        maxLine: number;
    }

    export interface IState {
        value: string;
        hasFocus: boolean;
    }
}

class LineForm extends React.Component<LineForm.IProps, LineForm.IState> {
    state = {
        value: '',
        hasFocus: false
    };

    private _handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: event.currentTarget.value });
    };

    private _handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const value = parseInt(this._textInput!.value, 10);
        if (
            !isNaN(value) &&
            isFinite(value) &&
            1 <= value &&
            value <= this.props.maxLine
        ) {
            this.props.handleSubmit(value);
        }

        return false;
    };

    private _handleFocus = () => {
        this.setState({ hasFocus: true });
    };

    private _handleBlur = () => {
        this.setState({ hasFocus: false });
    };

    componentDidMount() {
        this._textInput!.focus();
    }

    render() {
        return (
            <div className={lineFormSearch}>
                <form
                    name="lineColumnForm"
                    onSubmit={this._handleSubmit}
                    noValidate
                >
                    <div
                        className={classes(
                            lineFormWrapper,
                            'p-lineForm-wrapper',
                            this.state.hasFocus
                                ? lineFormWrapperFocusWithin
                                : undefined
                        )}
                    >
                        <input
                            type="text"
                            className={lineFormInput}
                            onChange={this._handleChange}
                            onFocus={this._handleFocus}
                            onBlur={this._handleBlur}
                            value={this.state.value}
                            ref={input => {
                                this._textInput = input;
                            }}
                        />

                        <input
                            type="submit"
                            className={classes(
                                lineFormButton,
                                'lineForm-enter-icon'
                            )}
                            value=""
                        />
                    </div>
                    <label className={lineFormCaption}>
                        Go to line number between 1 and {this.props.maxLine}
                    </label>
                </form>
            </div>
        );
    }

    private _textInput: HTMLInputElement | null = null;
}

namespace LineColComponent {
    export interface IProps {
        line: number;
        column: number;
        handleClick: () => void;
    }
}

// tslint:disable-next-line:variable-name
const LineColComponent = (
    props: LineColComponent.IProps
): React.ReactElement<LineColComponent.IProps> => {
    return (
        <TextItem
            onClick={props.handleClick}
            source={`Ln ${props.line}, Col ${props.column}`}
        />
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
            this._getFocusedEditor(this._shell.currentWidget)
        );

        this.node.title = 'Go to line number';
        this.addClass(interactiveItem);
    }

    render(): React.ReactElement<LineColComponent.IProps> | null {
        if (this.model === null) {
            return null;
        } else {
            return (
                <LineColComponent
                    line={this.model.line}
                    column={this.model.column}
                    handleClick={this._handleClick}
                />
            );
        }
    }

    dispose() {
        super.dispose();

        this._notebookTracker.currentChanged.disconnect(this._onNotebookChange);
        this._notebookTracker.activeCellChanged.disconnect(
            this._onActiveCellChange
        );
        this._notebookTracker.selectionChanged.disconnect(
            this._onNotebookChange
        );
        this._editorTracker.currentChanged.disconnect(this._onEditorChange);
        this._shell.currentChanged.disconnect(this._onMainAreaCurrentChange);
    }

    protected onUpdateRequest(msg: Message) {
        this.model!.editor = this._getFocusedEditor(this._shell.currentWidget);

        super.onUpdateRequest(msg);
    }

    private _handleClick = () => {
        const body = new ReactElementWidget(
            (
                <LineForm
                    handleSubmit={this._handleSubmit}
                    currentLine={this.model!.line}
                    maxLine={this.model!.editor!.lineCount}
                />
            )
        );

        this._popup = showPopup({
            body: body,
            anchor: this,
            align: 'right'
        });
    };

    private _handleSubmit = (value: number) => {
        this.model!.editor!.setCursorPosition({ line: value - 1, column: 0 });
        this._popup!.dispose();
        this.model!.editor!.focus();
    };

    private _onNotebookChange = (tracker: INotebookTracker) => {
        this.model!.editor = tracker.activeCell && tracker.activeCell.editor;
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

    private _getFocusedEditor(val: Widget | null): CodeEditor.IEditor | null {
        if (val === null) {
            return null;
        } else {
            if (this._notebookTracker.has(val)) {
                const activeCell = (val as NotebookPanel).content.activeCell;
                if (activeCell === undefined) {
                    return null;
                } else {
                    return activeCell.editor;
                }
            } else if (this._editorTracker.has(val)) {
                return (val as IDocumentWidget<FileEditor>).content.editor;
            } else {
                return null;
            }
        }
    }

    private _onMainAreaCurrentChange = (
        shell: ApplicationShell,
        change: ApplicationShell.IChangedArgs
    ) => {
        const { newValue } = change;
        const editor = this._getFocusedEditor(newValue);
        this.model!.editor = editor;
    };

    private _notebookTracker: INotebookTracker;
    private _editorTracker: IEditorTracker;
    private _shell: ApplicationShell;
    private _popup: Popup | undefined;
}

namespace LineCol {
    export class Model extends VDomModel implements ILineCol.IModel {
        constructor(editor: CodeEditor.IEditor | null) {
            super();

            this.editor = editor;
        }

        get editor(): CodeEditor.IEditor | null {
            return this._editor;
        }

        set editor(editor: CodeEditor.IEditor | null) {
            const oldEditor = this._editor;
            if (oldEditor !== null) {
                oldEditor.model.selections.changed.disconnect(
                    this._onSelectionChanged
                );
            }

            const oldState = this._getAllState();
            this._editor = editor;
            if (this._editor === null) {
                this._column = 1;
                this._line = 1;
            } else {
                this._editor.model.selections.changed.connect(
                    this._onSelectionChanged
                );

                const pos = this._editor.getCursorPosition();
                this._column = pos.column + 1;
                this._line = pos.line + 1;
            }

            this._triggerChange(oldState, this._getAllState());
        }

        get line(): number {
            return this._line;
        }

        get column(): number {
            return this._column;
        }

        private _onSelectionChanged = () => {
            const oldState = this._getAllState();
            const pos = this.editor!.getCursorPosition();
            this._line = pos.line + 1;
            this._column = pos.column + 1;

            this._triggerChange(oldState, this._getAllState());
        };

        private _getAllState(): [number, number] {
            return [this._line, this._column];
        }

        private _triggerChange(
            oldState: [number, number],
            newState: [number, number]
        ) {
            if (oldState[0] !== newState[0] || oldState[1] !== newState[1]) {
                this.stateChanged.emit(void 0);
            }
        }

        private _line: number = 1;
        private _column: number = 1;
        private _editor: CodeEditor.IEditor | null = null;
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
    requires: [IDefaultsManager, INotebookTracker, IEditorTracker],
    activate: (
        app: JupyterLab,
        defaultsManager: IDefaultsManager,
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
            priority: 2,
            isActive: IStatusContext.delegateActive(app.shell, [
                { tracker: notebookTracker },
                { tracker: editorTracker }
            ])
        });

        return item;
    }
};
