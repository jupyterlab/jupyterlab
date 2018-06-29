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
class Icon extends Widget {
    constructor(src: string) {
        super();

        this._src = src;

        VirtualDOM.render(h.img({src: this._src}, null), this.node);

    }

    private _src: string;
}

/**
 * Initialization data for the statusbar extension.
 */
export
const iconItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:icon-item',
    autoStart: true,
    requires: [IStatusBar],
    activate: (_app: JupyterLab, statusBar: IStatusBar) => {//
    }
};
