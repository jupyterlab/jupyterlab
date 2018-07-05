import * as ReactDOM from 'react-dom';
import * as React from 'react';

import {
    JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
    INotebookTracker
} from '@jupyterlab/notebook';

import {
    Widget,
} from '@phosphor/widgets';

import {
    IStatusBar
} from './../statusBar';

export
namespace LineColComponent {
    export
    interface IState {
        line: number;
        col: number;
    }

    export
    interface IProps {
        tracker: INotebookTracker;
    }
}

export
class LineColComponent extends React.Component<LineColComponent.IProps, LineColComponent.IState> {

    state = {
        line: 0,
        col: 0
    };

    constructor(props: LineColComponent.IProps) {
        super(props);

        this.props.tracker.currentChanged.connect(this.posChange);
        this.props.tracker.activeCellChanged.connect(this.posChange);
        this.props.tracker.selectionChanged.connect(this.posChange);
    }

    posChange = (tracker: INotebookTracker) => {
        if (tracker.activeCell) {
            this.setState({col: tracker.activeCell.editor.getCursorPosition().column});
            this.setState({line: tracker.activeCell.editor.getCursorPosition().line});
        }
    }

    render() {
        return(<div>Line:{this.state.line} Col:{this.state.col}</div>);
    }




}

export
class LineCol extends Widget {
    constructor(opts: LineCol.IOptions) {
        super();
        this._tracker = opts.tracker;
    }

    onBeforeAttach() {
        ReactDOM.render (<LineColComponent tracker = {this._tracker} />, this.node);
        }
    private _tracker: INotebookTracker;
}
export
const lineColItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:line-col',
    autoStart: true,
    requires: [IStatusBar, INotebookTracker],
    activate: (app: JupyterLab, statusBar: IStatusBar, tracker: INotebookTracker) => {
        statusBar.registerStatusItem('line-col-item', new LineCol( {tracker} ), {align: 'left'});
    }
};

export
namespace LineCol {
    export
    interface IOptions {
        tracker: INotebookTracker;
    }
}

