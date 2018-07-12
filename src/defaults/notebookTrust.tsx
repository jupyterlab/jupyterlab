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
import { VDomRenderer } from '@jupyterlab/apputils';
import { IDisposable } from '@phosphor/disposable';
import { ISignal, Signal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';

// tslint:disable-next-line:variable-name
const NotebookTrustComponent = (
    props: NotebookTrustComponent.IProps
): React.ReactElement<NotebookTrustComponent.IProps> => {
    if (props.allCellsTrusted || props.activeCellTrusted) {
        return <div className="icon-item trusted-item" />;
    } else {
        return <div className="icon-item not-trusted-item" />;
    }
};

export namespace NotebookTrustComponent {
    export interface IProps {
        allCellsTrusted: boolean;
        activeCellTrusted: boolean;
    }
}

export class NotebookTrust extends VDomRenderer<NotebookTrust.Model> {
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
                <NotebookTrustComponent
                    allCellsTrusted={
                        this.model.trustedCells === this.model.totalCells
                    }
                    activeCellTrusted={this.model.activeCellTrusted}
                />
            );
        }
    }

    private _tracker: INotebookTracker;
}

export namespace NotebookTrust {
    export class Model implements VDomRenderer.IModel, INotebookTrust.IModel {
        constructor(notebook: Notebook | null) {
            this._notebook = notebook;
            if (notebook === null) {
                this._trustedCells = 0;
                this._totalCells = 0;
                this._activeCellTrusted = false;
            } else {
                if (this._notebook!.activeCell !== undefined) {
                    this._activeCellTrusted = this._notebook!.activeCell!.model.trusted;
                } else {
                    this._activeCellTrusted = false;
                }

                const { total, trusted } = this._deriveCellTrustState(
                    this._notebook!.model
                );

                this._totalCells = total;
                this._trustedCells = trusted;
            }
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
            this._stateChanged.emit(void 0);

            if (this._notebook === null) {
                this._trustedCells = 0;
                this._totalCells = 0;
                this._activeCellTrusted = false;
            } else {
                this._notebook.activeCellChanged.connect(
                    this._onActiveCellChanged
                );

                this._notebook.modelContentChanged.connect(
                    this._onModelChanged
                );
            }
        }

        get stateChanged(): ISignal<this, void> {
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
        }

        private _onModelChanged = (notebook: Notebook) => {
            const { total, trusted } = this._deriveCellTrustState(
                notebook.model
            );

            this._totalCells = total;
            this._trustedCells = trusted;
            this._stateChanged.emit(void 0);
        };

        private _onActiveCellChanged = (model: Notebook, cell: Cell | null) => {
            if (cell !== null && cell !== undefined) {
                this._activeCellTrusted = cell.model.trusted;
            } else {
                this._activeCellTrusted = false;
            }

            this._stateChanged.emit(void 0);
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

        private _trustedCells: number;
        private _totalCells: number;
        private _activeCellTrusted: boolean;
        private _notebook: Notebook | null;

        private _stateChanged: Signal<this, void> = new Signal(this);
        private _isDisposed: boolean = false;
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
        _app: JupyterLab,
        manager: IDefaultStatusesManager,
        tracker: INotebookTracker
    ) => {
        const item = new NotebookTrust({ tracker });

        manager.addDefaultStatus('notebook-trust-item', item, {
            align: 'right',
            priority: 1
        });

        return item;
    }
};
