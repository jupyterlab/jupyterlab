import React from 'react';
import { TextItem } from '../component/text';

import {
    JupyterLabPlugin,
    JupyterLab,
    ApplicationShell
} from '@jupyterlab/application';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ISignal } from '@phosphor/signaling';
import { Cell } from '@jupyterlab/cells';
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
import { Message } from '@phosphor/messaging';
import { SettingsConnector } from '../util/settings';

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

        this._settingsConnectors = {
            notebook: {
                code: new SettingsConnector({
                    registry: opts.settings,
                    pluginId: '@jupyterlab/notebook-extension:tracker',
                    settingKey: 'codeCellConfig'
                }),
                markdown: new SettingsConnector({
                    registry: opts.settings,
                    pluginId: '@jupyterlab/notebook-extension:tracker',
                    settingKey: 'markdownCellConfig'
                }),
                raw: new SettingsConnector({
                    registry: opts.settings,
                    pluginId: '@jupyterlab/notebook-extension:tracker',
                    settingKey: 'rawCellConfig'
                })
            },
            editor: new SettingsConnector({
                registry: opts.settings,
                pluginId: '@jupyterlab/fileeditor-extension:plugin',
                settingKey: 'editorConfig'
            })
        };

        this._notebookTracker.activeCellChanged.connect(
            this._onActiveCellChange
        );
        this._shell.currentChanged.connect(this._onMainAreaCurrentChange);

        this.model = new TabSpace.Model(
            this._getFocusedSettingsConnector(this._shell.currentWidget)
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

    render(): React.ReactElement<TabSpaceComponent.IProps> | null {
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

    dispose() {
        super.dispose();

        this._notebookTracker.activeCellChanged.disconnect(
            this._onActiveCellChange
        );
        this._shell.currentChanged.disconnect(this._onMainAreaCurrentChange);
    }

    protected onUpdateRequest(msg: Message) {
        this.model!.settingConnector = this._getFocusedSettingsConnector(
            this._shell.currentWidget
        );

        super.onUpdateRequest(msg);
    }

    private _onActiveCellChange = (
        _tracker: INotebookTracker,
        cell: Cell | null
    ) => {
        let settingsConnector: SettingsConnector<{ tabSize: number }> | null;
        if (cell !== null) {
            if (cell.model.type === 'code') {
                settingsConnector = this._settingsConnectors.notebook.code;
            } else if (cell.model.type === 'raw') {
                settingsConnector = this._settingsConnectors.notebook.raw;
            } else {
                settingsConnector = this._settingsConnectors.notebook.markdown;
            }
        } else {
            settingsConnector = null;
        }

        this.model!.settingConnector = settingsConnector;
    };

    private _getFocusedSettingsConnector(
        val: Widget | null
    ): SettingsConnector<{ tabSize: number }> | null {
        if (val === null) {
            return null;
        } else {
            if (this._notebookTracker.has(val)) {
                const activeCell = (val as NotebookPanel).content.activeCell;
                if (activeCell === undefined) {
                    return null;
                } else {
                    if (activeCell.model.type === 'code') {
                        return this._settingsConnectors.notebook.code;
                    } else if (activeCell.model.type === 'raw') {
                        return this._settingsConnectors.notebook.raw;
                    } else {
                        return this._settingsConnectors.notebook.markdown;
                    }
                }
            } else if (this._editorTracker.has(val)) {
                return this._settingsConnectors.editor;
            } else if (this._consoleTracker.has(val)) {
                const prompt = (val as ConsolePanel).console.promptCell;
                if (prompt !== null) {
                    return this._settingsConnectors.notebook.code;
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
        const settingConnector = this._getFocusedSettingsConnector(newValue);
        this.model!.settingConnector = settingConnector;
    };

    private _notebookTracker: INotebookTracker;
    private _editorTracker: IEditorTracker;
    private _consoleTracker: IConsoleTracker;
    private _shell: ApplicationShell;
    private _commands: CommandRegistry;
    private _settingsConnectors: Private.ISettingConnectorContainer;
}

namespace Private {
    export interface ISettingConnectorContainer {
        notebook: {
            markdown: SettingsConnector<{ tabSize: number }>;
            code: SettingsConnector<{ tabSize: number }>;
            raw: SettingsConnector<{ tabSize: number }>;
        };
        editor: SettingsConnector<{ tabSize: number }>;
    }
}

namespace TabSpace {
    export class Model extends VDomModel implements ITabSpace.IModel {
        constructor(
            settingConnector: SettingsConnector<{ tabSize: number }> | null
        ) {
            super();

            this.settingConnector = settingConnector;
        }

        get settingConnector(): SettingsConnector<{ tabSize: number }> | null {
            return this._settingConnector;
        }

        set settingConnector(
            settingConnector: SettingsConnector<{ tabSize: number }> | null
        ) {
            const oldTabSpace = this._tabSpace;
            const oldSettingConnector = this._settingConnector;
            if (oldSettingConnector !== null) {
                oldSettingConnector.changed.disconnect(this._onTabSizeChanged);
            }
            this._settingConnector = settingConnector;

            if (this._settingConnector === null) {
                this._tabSpace = 4;
            } else {
                this._settingConnector.changed.connect(this._onTabSizeChanged);

                this._tabSpace = this._settingConnector.currentValue!.tabSize;
            }

            this._triggerChange(oldTabSpace, this._tabSpace);
        }

        get tabSpace() {
            return this._tabSpace;
        }

        private _onTabSizeChanged = () => {
            const oldTabSpace = this._tabSpace;
            this._tabSpace = this.settingConnector!.currentValue!.tabSize;

            this._triggerChange(oldTabSpace, this._tabSpace);
        };

        private _triggerChange(oldValue: number, newValue: number): void {
            if (oldValue !== newValue) {
                this.stateChanged.emit(void 0);
            }
        }

        private _tabSpace: number = 4;
        private _settingConnector: SettingsConnector<{
            tabSize: number;
        }> | null = null;
    }

    export interface IOptions {
        notebookTracker: INotebookTracker;
        editorTracker: IEditorTracker;
        consoleTracker: IConsoleTracker;
        shell: ApplicationShell;
        commands: CommandRegistry;
        settings: ISettingRegistry;
    }
}

export interface ITabSpace extends IDisposable {
    readonly model: ITabSpace.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace ITabSpace {
    export interface IModel {
        readonly tabSpace: number;
        readonly settingConnector: SettingsConnector<{
            tabSize: number;
        }> | null;
    }
}

// tslint:disable-next-line:variable-name
export const ITabSpace = new Token<ITabSpace>(
    '@jupyterlab/statusbar:ITabSpace'
);

export const tabSpaceItem: JupyterLabPlugin<ITabSpace> = {
    id: '@jupyterlab/statusbar:tab-space-item',
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
            commands: app.commands,
            settings
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
