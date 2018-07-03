import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
   Kernel, KernelManager
} from '@jupyterlab/services';

import {
    Widget
} from '@phosphor/widgets';

import {
    IStatusBar
} from './../statusBar';


export
namespace RunningComponent {
    export
    interface IState {
        kernelSession: number;
    }
    export
    interface IProps {
        kernelManager: KernelManager;
    }
}

export
class RunningComponent extends React.Component<RunningComponent.IProps, RunningComponent.IState> {
    state = {
        kernelSession: 0,
    };

    constructor(props: RunningComponent.IProps) {
        super(props);
        this.props.kernelManager.runningChanged.connect(this.updateKernel);
    }

    componentDidMount() {
        this.updateKernel();
    }

    updateKernel = () =>  {
        Kernel.listRunning().then(value => this.setState({kernelSession: value.length}));
    }

    render() {
        return(<div>{this.state.kernelSession} Kernels Active</div>);
    }

}

export
class RunningSession extends Widget {
    constructor() {
        super();
        this._manager = new KernelManager();
    }

      onBeforeAttach() {
            ReactDOM.render(<RunningComponent kernelManager = {this._manager} />, this.node);
      }

      private _manager: KernelManager;
}

/*
 * Initialization data for the statusbar extension.
 */

export
const runningSessionItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:icon-item',
    autoStart: true,
    requires: [IStatusBar],
    activate: (_app: JupyterLab, statusBar: IStatusBar, manager: KernelManager) => {
        statusBar.registerStatusItem('image', new RunningSession(), {align: 'left'});
    }
};

