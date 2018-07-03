import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { Widget } from '@phosphor/widgets';

import { IStatusBar } from './../statusBar';

import { IconItem } from '../component';

export class RunningSession extends Widget {
    constructor(src: string) {
        super();

        this._src = src;

        ReactDOM.render(<IconItem source={this._src} />, this.node);
    }

    private _src: string;
}

/*
 * Initialization data for the statusbar extension.
 */
export const runningSessionItem: JupyterLabPlugin<void> = {
    id: 'jupyterlab-statusbar/default-items:icon-item',
    autoStart: true,
    requires: [IStatusBar],
    activate: (_app: JupyterLab, statusBar: IStatusBar) => {
        statusBar.registerStatusItem(
            'image-1',
            new RunningSession(
                'https://emojipedia-us.s3.amazonaws.com/thumbs/120/apple/129/waving-hand-sign_1f44b.png'
            ),
            { align: 'right' }
        );
    }
};
