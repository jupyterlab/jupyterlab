import {
    JupyterLabPlugin, JupyterLab
} from '@jupyterlab/application';

import {
    Widget
} from '@phosphor/widgets';

import {
    IStatusBar
} from './..';

import { VirtualDOM, h } from '@phosphor/virtualdom';

const HELLO_WORLD_STATUS_ITEM_ID = 'jupyterlab-statusbar/hello-world';

/**
 * Initialization data for the statusbar extension.
 */
const helloWorldStatusItem: JupyterLabPlugin<void> = {
    id: HELLO_WORLD_STATUS_ITEM_ID,
    autoStart: true,
    requires: [IStatusBar],
    activate: (app: JupyterLab, statusBar: IStatusBar) => {
        let helloStatusItem = createTextStatusItem('Hello world!');
        let helloStatusItemOpts = { align: 'left' } as IStatusBar.IStatusItemOptions;
        statusBar.registerStatusItem(HELLO_WORLD_STATUS_ITEM_ID, helloStatusItem, helloStatusItemOpts);
    }
};

function createTextStatusItem(text: string): Widget {
    let widget = new Widget();

    VirtualDOM.render(h.div(text), widget.node);

    return widget;
}
