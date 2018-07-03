import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin, JupyterLab, ApplicationShell,
} from '@jupyterlab/application';

import {
   Kernel, KernelManager
} from '@jupyterlab/services';

import {
    Widget,
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
        shellHost: ApplicationShell;
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
        Kernel.listRunning().then(value => this.setState({kernelSession: value.length}));
    }

    updateKernel = (kernelManage: KernelManager, kernels: Kernel.IModel[]) =>  {
        this.setState({kernelSession: kernels.length});
    }

    handleClick = () => {
        this.props.shellHost.expandLeft();
        this.props.shellHost.activateById('jp-running-sessions');
    }
    render() {
        return(<div onClick = {this.handleClick}>{this.state.kernelSession} Kernels Active</div>);
    }

}

export
class RunningKernels extends Widget {
    constructor(opts: RunningKernels.IOptions) {
        super();
        this._manager = new KernelManager();
        this._host = opts.host;
    }
      onBeforeAttach() {
            ReactDOM.render(<RunningComponent kernelManager = {this._manager} shellHost = {this._host}/>, this.node);
      }

      private _host: ApplicationShell = null;
      private _manager: KernelManager;
}

/*
 * Initialization data for the statusbar extension.
 */

export
const runningKernelsItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:running-kernels',
    autoStart: true,
    requires: [IStatusBar],
    activate: (app: JupyterLab, statusBar: IStatusBar, manager: KernelManager) => {
        statusBar.registerStatusItem('running-kernels-item', new RunningKernels( {host: app.shell} ), {align: 'left'});
    }
};

export
namespace RunningKernels {

  /**
   * Options for creating a new StatusBar instance
   */
  export
  interface IOptions {
    host: ApplicationShell;
  }
}
