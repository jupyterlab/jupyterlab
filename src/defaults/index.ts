import {
    JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
    Widget
} from '@phosphor/widgets';

import {
    IStatusBar
} from './../statusBar';

import { VirtualDOM, VirtualText, h } from '@phosphor/virtualdom';

export
class HelloStatus extends Widget {
    constructor(subject: string) {
        super();

        this._text = `Hello ${subject}!`;

        VirtualDOM.render(h.div(new VirtualText(this._text)), this.node);
    }

    private _text: string;
}

/**
 * Initialization data for the statusbar extension.
 */
export
const helloStatusItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:hello-world',
    autoStart: true,
    requires: [IStatusBar],
    activate: (_app: JupyterLab, statusBar: IStatusBar) => {
        statusBar.registerStatusItem(
            'hello-world-status-item-left', new HelloStatus('left world'), { align: 'left' });
        statusBar.registerStatusItem(
            'hello-world-status-item-left-2', new HelloStatus('left world 2'), { align: 'left' });

        statusBar.registerStatusItem(
            'hello-world-status-item-right', new HelloStatus('right world'), { align: 'right' });
        statusBar.registerStatusItem(
            'hello-world-status-item-right-2', new HelloStatus('right world 2'), { align: 'right' });
    }
};
