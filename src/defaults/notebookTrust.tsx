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
import { IconItem } from '../component/icon';

// tslint:disable-next-line:variable-name
const NotebookTrustComponent = (
    props: NotebookTrustComponent.IProps
): React.ReactElement<NotebookTrustComponent.IProps> => {
    if (props.allCellsTrusted || props.activeCellTrusted) {
        return (
            <div onMouseOver={props.handleClick}>
                {' '}
                <IconItem source={'trusted-item'} />{' '}
            </div>
        );
    } else {
        return (
            <div onMouseOver={props.handleClick}>
                {' '}
                <IconItem source={'not-trusted-item'} />{' '}
            </div>
        );
    }
};

// tslint:disable-next-line:variable-name
const NotebookTrustPopUp = () => {
    return (
        <div style={{ position: 'absolute', zIndex: 100 }}>
            <label> this cell is trusted </label>
        </div>
    );
};

namespace NotebookTrustComponent {
    export interface IProps {
        handleClick: () => void;
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
        this._handleItemClick = this._handleItemClick.bind(this);
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
        const overlay = this.model!.hover ? <NotebookTrustPopUp /> : null;
        if (this.model === null) {
            return null;
        } else {
            return (
                <div>
                    {overlay}
                    <NotebookTrustComponent
                        allCellsTrusted={
                            this.model.trustedCells === this.model.totalCells
                        }
                        handleClick={this._handleItemClick}
                        activeCellTrusted={this.model.activeCellTrusted}
                    />
                </div>
            );
        }
    }

    _handleItemClick = () => {
        this.model!.hover = true;
    };
    private _tracker: INotebookTracker;
}

namespace NotebookTrust {
    export class Model implements VDomRenderer.IModel, INotebookTrust.IModel {
        constructor(notebook: Notebook | null) {
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

        get hover() {
            return this._hover;
        }

        set hover(hover: boolean) {
            this._hover = hover;

            this._stateChanged.emit(void 0);
        }

        set notebook(model: Notebook | null) {
            this._notebook = model;
            this._stateChanged.emit(void 0);

            if (this._notebook === null) {
                this._trustedCells = 0;
                this._totalCells = 0;
                this._activeCellTrusted = false;
                this._hover = false;
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
                this._hover = false;
                this._totalCells = total;
                this._trustedCells = trusted;
            }

            this._stateChanged.emit(void 0);
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
        private _hover: boolean;

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
        readonly hover: boolean;
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
            priority: 3
        });

        return item;
    }
};
