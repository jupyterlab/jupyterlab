import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';
import {
    INotebookTracker,
    NotebookPanel,
    INotebookModel,
    Notebook
} from '@jupyterlab/notebook';
import { toArray } from '@phosphor/algorithm';
import { IDefaultStatusesManager } from './manager';
import { Cell } from '@jupyterlab/cells';
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { IDisposable } from '@phosphor/disposable';
import { ISignal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';
import { IconItem } from '../component/icon';
import { IStatusContext } from '../contexts';

// tslint:disable-next-line:variable-name
const NotebookTrustComponent = (
    props: NotebookTrustComponent.IProps
): React.ReactElement<NotebookTrustComponent.IProps> => {
    if (props.allCellsTrusted || props.activeCellTrusted) {
        return (
            <div>
                <IconItem source={'trusted-item'} />
            </div>
        );
    } else {
        return (
            <div>
                <IconItem source={'not-trusted-item'} />
            </div>
        );
    }
};

namespace NotebookTrustComponent {
    export interface IProps {
        allCellsTrusted: boolean;
        activeCellTrusted: boolean;
    }
}

class NotebookTrust extends VDomRenderer<NotebookTrust.Model>
    implements INotebookTrust {
    constructor(opts: NotebookTrust.IOptions) {
        super();

        this._tracker = opts.tracker;

        this._tracker.currentChanged.connect(this._onNotebookChange);
        this.model = new NotebookTrust.Model(
            this._tracker.currentWidget && this._tracker.currentWidget.content
        );
    }

    private _onNotebookChange = (
        tracker: INotebookTracker,
        notebook: NotebookPanel | null
    ) => {
        if (notebook === null) {
            this.model!.notebook = null;
        } else {
            this.model!.notebook = notebook.content;
        }
    };

    render() {
        if (this.model === null) {
            return null;
        } else {
            return (
                <div>
                    <NotebookTrustComponent
                        allCellsTrusted={
                            this.model.trustedCells === this.model.totalCells
                        }
                        activeCellTrusted={this.model.activeCellTrusted}
                    />
                </div>
            );
        }
    }

    private _tracker: INotebookTracker;
}

namespace NotebookTrust {
    export class Model extends VDomModel implements INotebookTrust.IModel {
        constructor(notebook: Notebook | null) {
            super();

            this.notebook = notebook;
        }

        get trustedCells() {
            return this._trustedCells;
        }

        get totalCells() {
            return this._totalCells;
        }

        get activeCellTrusted() {
            return this._activeCellTrusted;
        }

        get notebook() {
            return this._notebook;
        }

        set notebook(model: Notebook | null) {
            this._notebook = model;
            this.stateChanged.emit(void 0);

            if (this._notebook === null) {
                this._trustedCells = 0;
                this._totalCells = 0;
                this._activeCellTrusted = false;
            } else {
                // Add listeners
                this._notebook.activeCellChanged.connect(
                    this._onActiveCellChanged
                );

                this._notebook.modelContentChanged.connect(
                    this._onModelChanged
                );

                // Derive values
                if (this._notebook!.activeCell !== undefined) {
                    this._activeCellTrusted = this._notebook!.activeCell!.model.trusted;
                } else {
                    this._activeCellTrusted = false;
                }

                const { total, trusted } = this._deriveCellTrustState(
                    this._notebook.model
                );

                this._totalCells = total;
                this._trustedCells = trusted;
            }

            this.stateChanged.emit(void 0);
        }

        private _onModelChanged = (notebook: Notebook) => {
            const { total, trusted } = this._deriveCellTrustState(
                notebook.model
            );

            this._totalCells = total;
            this._trustedCells = trusted;
            this.stateChanged.emit(void 0);
        };

        private _onActiveCellChanged = (model: Notebook, cell: Cell | null) => {
            if (cell !== null && cell !== undefined) {
                this._activeCellTrusted = cell.model.trusted;
            } else {
                this._activeCellTrusted = false;
            }

            this.stateChanged.emit(void 0);
        };

        private _deriveCellTrustState(
            model: INotebookModel
        ): { total: number; trusted: number } {
            let cells = toArray(model.cells);

            let trusted = cells.reduce((accum, current) => {
                if (current.trusted) {
                    return accum + 1;
                } else {
                    return accum;
                }
            }, 0);

            let total = cells.length;

            return {
                total,
                trusted
            };
        }

        private _trustedCells: number = 0;
        private _totalCells: number = 0;
        private _activeCellTrusted: boolean = false;
        private _notebook: Notebook | null = null;
    }

    export interface IOptions {
        tracker: INotebookTracker;
    }
}

export interface INotebookTrust extends IDisposable {
    readonly model: INotebookTrust.IModel | null;
    readonly modelChanged: ISignal<this, void>;
}

export namespace INotebookTrust {
    export interface IModel {
        readonly trustedCells: number;
        readonly totalCells: number;
        readonly activeCellTrusted: boolean;

        readonly notebook: Notebook | null;
    }
}

// tslint:disable-next-line:variable-name
export const INotebookTrust = new Token<INotebookTrust>(
    'jupyterlab-statusbar/INotebookTrust'
);

export const notebookTrustItem: JupyterLabPlugin<INotebookTrust> = {
    id: 'jupyterlab-statusbar/default-items:trusted-notebook',
    autoStart: true,
    provides: INotebookTrust,
    requires: [IDefaultStatusesManager, INotebookTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        tracker: INotebookTracker
    ) => {
        const item = new NotebookTrust({ tracker });

        manager.addDefaultStatus('notebook-trust-item', item, {
            align: 'right',
            priority: 3,
            isActive: IStatusContext.delegateActive(app.shell, [{ tracker }])
        });

        return item;
    }
};
