import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';
import {
    INotebookTracker,
    NotebookPanel,
    INotebookModel
} from '@jupyterlab/notebook';
import { toArray } from '@phosphor/algorithm';
import { Widget } from '@phosphor/widgets';
import { IDefaultStatusesManager } from './manager';
import { Cell } from '@jupyterlab/cells';

export class NotebookTrustStatus extends React.Component<
    NotebookTrustStatus.IProps,
    NotebookTrustStatus.IState
> {
    state = {
        numTrustedCells: 0,
        numCells: 0
    };

    constructor(props: NotebookTrustStatus.IProps) {
        super(props);

        const { tracker } = this.props;
        tracker.currentChanged.connect(this.onDocumentChange);
        tracker.activeCellChanged.connect(this.onCellsChange);

        if (tracker.currentWidget !== null) {
            this.state = this.deriveCellTrustState(tracker.currentWidget.model);
        } else {
            this.state = {
                numCells: 0,
                numTrustedCells: 0
            };
        }
    }

    deriveCellTrustState(model: INotebookModel): NotebookTrustStatus.IState {
        let cells = toArray(model.cells);

        let numTrustedCells = cells.reduce((accum, current) => {
            if (current.trusted) {
                return accum + 1;
            } else {
                return accum;
            }
        }, 0);

        let numCells = cells.length;

        return {
            numCells,
            numTrustedCells
        };
    }

    onDocumentChange = (
        tracker: INotebookTracker,
        panel: NotebookPanel | null
    ) => {
        if (panel !== null) {
            this.setState(this.deriveCellTrustState(panel.model));
        } else {
            this.setState({
                numTrustedCells: 0,
                numCells: 0
            });
        }
    };

    onCellsChange = (tracker: INotebookTracker, cell: Cell) => {
        this.setState(
            this.deriveCellTrustState(this.props.tracker.currentWidget!.model)
        );
    };

    render() {
        return (
            <div>
                Trusting {this.state.numTrustedCells} of {this.state.numCells}{' '}
                cells.
            </div>
        );
    }
}

export namespace NotebookTrustStatus {
    export interface IState {
        numCells: number;
        numTrustedCells: number;
    }

    export interface IProps {
        tracker: INotebookTracker;
    }
}

export class NotebookTrust extends Widget {
    constructor(opts: NotebookTrust.IOptions) {
        super();

        this._tracker = opts.tracker;
    }

    onBeforeAttach() {
        ReactDOM.render(
            <NotebookTrustStatus tracker={this._tracker} />,
            this.node
        );
    }

    private _tracker: INotebookTracker;
}

export namespace NotebookTrust {
    export interface IOptions {
        tracker: INotebookTracker;
    }
}

export const notebookTrustItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:trusted-notebook',
    autoStart: true,
    requires: [IDefaultStatusesManager, INotebookTracker],
    activate: (
        _app: JupyterLab,
        manager: IDefaultStatusesManager,
        tracker: INotebookTracker
    ) => {
        manager.addDefaultStatus(
            'notebook-trust-item',
            new NotebookTrust({ tracker }),
            {}
        );
    }
};
