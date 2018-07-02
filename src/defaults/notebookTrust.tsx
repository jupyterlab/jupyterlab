import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { IStatusBar } from './../statusBar';

import { INotebookTracker } from '@jupyterlab/notebook';

import { toArray } from '@phosphor/algorithm';

import { Widget } from '@phosphor/widgets';

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

        this.props.tracker.currentChanged.connect(this.onDocumentChange);
        this.props.tracker.activeCellChanged.connect(this.onDocumentChange);
    }

    onDocumentChange = (tracker: INotebookTracker) => {
        if (tracker.currentWidget) {
            let cells = toArray(tracker.currentWidget.model.cells);
            let numTrustedCells = cells.reduce((accum, current) => {
                if (current.trusted) {
                    return accum + 1;
                } else {
                    return accum;
                }
            }, 0);
            let numCells = cells.length;

            this.setState({
                numTrustedCells,
                numCells
            });
        } else {
            this.setState({
                numTrustedCells: 0,
                numCells: 0
            });
        }
    };

    render() {
        return (
            <div>
                Trusting {this.state.numTrustedCells} of {this.state.numCells}
            </div>
        );
    }
}

export namespace NotebookTrustStatus {
    export interface IState {
        numTrustedCells: number;
        numCells: number;
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
    requires: [IStatusBar, INotebookTracker],
    activate: (
        _app: JupyterLab,
        statusBar: IStatusBar,
        tracker: INotebookTracker
    ) => {
        statusBar.registerStatusItem(
            'notebook-trust-status',
            new NotebookTrust({ tracker }),
            {}
        );
    }
};
