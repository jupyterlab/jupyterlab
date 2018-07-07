import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IDefaultStatusesManager } from './manager';

import { Widget } from '@phosphor/widgets';

// import { Kernel, KernelManager } from '@jupyterlab/services';

export namespace StatusComponent {
    export interface IState {
        kernelStatus: string;
    }
    export interface IProps {
        tracker: INotebookTracker;
    }
}

export class StatusComponent extends React.Component<
    StatusComponent.IProps,
    StatusComponent.IState
> {
    state = {
        kernelStatus: 'waiting'
    };
    constructor(props: StatusComponent.IProps) {
        super(props);
        this.props.tracker.currentChanged.connect(this.printed);
        this.props.tracker.activeCellChanged.connect(this.printed);
    }

    printed = () => {
        console.log('bi');
        if (this.props.tracker.currentWidget.session.kernel) {
            this.setState({
                kernelStatus: this.props.tracker.currentWidget.session.kernel
                    .status
            });
            this.props.tracker.currentWidget.session.statusChanged.connect(
                this.printing
            );
            this.props.tracker.currentWidget.session.kernelChanged.connect(
                this.printing
            );
        }
    };

    printing = () => {
        console.log('hi');
        if (this.props.tracker.currentWidget.session.kernel) {
            this.setState({
                kernelStatus: this.props.tracker.currentWidget.session.kernel
                    .status
            });
        } else {
            this.setState({ kernelStatus: 'dead' });
        }
    };

    render() {
        return <div> Kernel Status: {this.state.kernelStatus} </div>;
    }
}

export class KernelStatus extends Widget {
    constructor(opts: KernelStatus.IOptions) {
        super();
        this._tracker = opts.tracker;
    }
    onBeforeAttach() {
        ReactDOM.render(<StatusComponent tracker={this._tracker} />, this.node);
    }

    private _tracker: INotebookTracker;
}

/*
 * Initialization data for the statusbar extension.
 */

export const kernelStatusItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:kernel-status',
    autoStart: true,
    requires: [IDefaultStatusesManager, INotebookTracker],
    activate: (
        app: JupyterLab,
        manager: IDefaultStatusesManager,
        tracker: INotebookTracker
    ) => {
        manager.addDefaultStatus(
            'kernel-status-item',
            new KernelStatus({ tracker }),
            { align: 'left' }
        );
    }
};

export namespace KernelStatus {
    /**
     * Options for creating a new StatusBar instance
     */
    export interface IOptions {
        tracker: INotebookTracker;
    }
}
