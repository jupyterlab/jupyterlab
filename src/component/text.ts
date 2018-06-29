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

export * from './icon';

export
class Text extends Widget {
    constructor(subject: string) {
        super();

        this._text = subject;

        VirtualDOM.render(h.div(new VirtualText(this._text)), this.node);
    }

    private _text: string;
}

/**
 * Initialization data for the statusbar extension.
 */
export
const textItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:hello-world',
    autoStart: true,
    requires: [IStatusBar],
    activate: (_app: JupyterLab, statusBar: IStatusBar) => {
      //
    }
};
