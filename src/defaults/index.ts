import {
    JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
    Widget
} from '@phosphor/widgets';

import {
    IStatusBar
} from './../statusBar';

import { VirtualDOM, h } from '@phosphor/virtualdom';

export
class HelloStatus extends Widget {
    constructor(subject: string) {
        super();

        this._text = `Hello ${subject}!`;
    }

    onAfterAttach() {
        VirtualDOM.render(h.p(this._text), this.node);
    }

    private _text: string;
}

/**
 * Initialization data for the statusbar extension.
 */
export
const helloStatusItem: JupyterLabPlugin<HelloStatus> = {
    id: 'jupyterlab-statusbar/default-items:hello-world',
    autoStart: true,
    requires: [IStatusBar],
    activate: (_app: JupyterLab, statusBar: IStatusBar) => {
        console.log('Initialized hello status item!');
        let helloStatus =  new HelloStatus('world');
        let helloStatusOpts = { align: 'left' } as IStatusBar.IStatusItemOptions;

        statusBar.registerStatusItem('hello-world-status-item', helloStatus, helloStatusOpts);

        return helloStatus;
    }
};
