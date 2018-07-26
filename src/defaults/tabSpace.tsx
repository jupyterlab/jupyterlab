import React from 'react';
import { TextItem } from '../component/text';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { ISignal } from '@phosphor/signaling';
import { Cell } from '@jupyterlab/cells';
import { IObservableMap } from '@jupyterlab/observables';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { IDefaultsManager } from './manager';
import { Widget } from '@phosphor/widgets';
import { IStatusContext } from '../contexts';
import { CommandRegistry } from '@phosphor/commands';
import { Menu } from '@phosphor/widgets';

import { JSONObject } from '@phosphor/coreutils';
import { showPopup } from '../component/hover';
import { interactiveItem } from '../style/statusBar';
import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';
import { ISettingRegistry } from '@jupyterlab/coreutils';

namespace TabSpaceComponent {
    export interface IProps {
        tabSpace: number;
        handleClick: () => void;
    }
}

// tslint:disable-next-line:variable-name
const TabSpaceComponent = (
    props: TabSpaceComponent.IProps
): React.ReactElement<TabSpaceComponent.IProps> => {
    return (
        <TextItem
            onClick={props.handleClick}
            source={`Spaces: ${props.tabSpace}`}
        />
    );
};

class TabSpace extends VDomRenderer<TabSpace.Model> implements ITabSpace {
    constructor(opts: TabSpace.IOptions) {
        super();

        this._notebookTracker = opts.notebookTracker;
        this._editorTracker = opts.editorTracker;
        this._consoleTracker = opts.consoleTracker;
        this._shell = opts.shell;
        this._commands = opts.commands;

        this._notebookTracker.currentChanged.connect(this._onNotebookChange);
        this._notebookTracker.activeCellChanged.connect(
            this._onActiveCellChange
        );
        this._notebookTracker.selectionChanged.connect(this._onNotebookChange);

        this._editorTracker.currentChanged.connect(this._onEditorChange);

        this._consoleTracker.currentChanged.connect(this._onConsoleChange);

        this._shell.currentChanged.connect(this._onMainAreaCurrentChange);

        this.model = new TabSpace.Model(
            this._getFocusedEditor(this._shell.currentWidget)
        );

        this.node.title = 'Change tab spacing';

        this.addClass(interactiveItem);
    }

    private _handleClick = () => {
        const tabMenu = new Menu({ commands: this._commands });
        let command = 'fileeditor:change-tabs';

        for (let size of [1, 2, 4, 8]) {
            let args: JSONObject = {
                insertSpaces: true,
                size,
                name: `Spaces: ${size}`
            };
            tabMenu.addItem({ command, args });
        }

        showPopup({
            body: tabMenu,
            anchor: this,
            align: 'right'
        });
    };

    protected render(): React.ReactElement<TabSpaceComponent.IProps> | null {
        if (this.model === null) {
            return null;
        } else {
            return (
                <TabSpaceComponent
                    tabSpace={this.model.tabSpace}
                    handleClick={this._handleClick}
                />
            );
        }
    }

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

    private _onConsoleChange = (tracker: IConsoleTracker) => {
        const prompt =
            tracker.currentWidget && tracker.currentWidget.console.promptCell;
        this.model!.editor = prompt && prompt.editor;
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
            } else if (this._consoleTracker.has(val)) {
                const prompt = (val as ConsolePanel).console.promptCell;
                if (prompt !== null) {
                    return prompt.editor;
                } else {
                    return null;
                }
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
    private _consoleTracker: IConsoleTracker;
    private _shell: ApplicationShell;
    private _commands: CommandRegistry;
}

namespace TabSpace {
    export class Model extends VDomModel implements ITabSpace.IModel {
        constructor(editor: CodeEditor.IEditor | null) {
            super();

            this.editor = editor;
        }

        get editor(): CodeEditor.IEditor | null {
            return this._editor;
        }

        set editor(editor: CodeEditor.IEditor | null) {
            this._editor = editor;

            if (this._editor === null) {
                this._tabSpace = 4;
            } else {
                this._editor.model.selections.changed.connect(
                    this._onSelectionChanged
                );

                this._editor.model.value.changed.connect(this._onValueChanged);

                this._tabSpace = this.editor!.getOption('tabSize');
            }

            this.stateChanged.emit(void 0);
        }

        get tabSpace() {
            return this._tabSpace;
        }

        private _onSelectionChanged = (
            selections: IObservableMap<CodeEditor.ITextSelection[]>,
            change: IObservableMap.IChangedArgs<CodeEditor.ITextSelection[]>
        ) => {
            this._tabSpace = this.editor!.getOption('tabSize');
            this.stateChanged.emit(void 0);
        };

        private _onValueChanged = () => {
            this._tabSpace = this.editor!.getOption('tabSize');
            this.stateChanged.emit(void 0);
        };

        private _tabSpace: number = 4;
        private _editor: CodeEditor.IEditor | null = null;
    }

    export interface IOptions {
        notebookTracker: INotebookTracker;
        editorTracker: IEditorTracker;
        consoleTracker: IConsoleTracker;
        shell: ApplicationShell;
        commands: CommandRegistry;
    }
}

export interface ITabSpace extends IDisposable {
    readonly model: ITabSpace.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace ITabSpace {
    export interface IModel {
        readonly tabSpace: number;
        readonly editor: CodeEditor.IEditor | null;
    }
}

// tslint:disable-next-line:variable-name
export const ITabSpace = new Token<ITabSpace>('jupyterlab-statusbar/ITabSpace');

export const tabSpaceItem: JupyterLabPlugin<ITabSpace> = {
    id: 'jupyterlab-statusbar/default-items:tab-space',
    autoStart: true,
    provides: ITabSpace,
    requires: [
        IDefaultsManager,
        INotebookTracker,
        IEditorTracker,
        IConsoleTracker,
        ISettingRegistry
    ],
    activate: (
        app: JupyterLab,
        defaultsManager: IDefaultsManager,
        notebookTracker: INotebookTracker,
        editorTracker: IEditorTracker,
        consoleTracker: IConsoleTracker,
        settings: ISettingRegistry
    ) => {
        let item = new TabSpace({
            shell: app.shell,
            notebookTracker,
            editorTracker,
            consoleTracker,
            commands: app.commands
        });

        defaultsManager.addDefaultStatus('tab-space-item', item, {
            align: 'right',
            priority: 1,
            isActive: IStatusContext.delegateActive(app.shell, [
                { tracker: notebookTracker },
                { tracker: editorTracker },
                { tracker: consoleTracker }
            ])
        });

        return item;
    }
};
