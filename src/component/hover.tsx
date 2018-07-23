import { Widget, PanelLayout } from '@phosphor/widgets';
import { HoverBox } from '@jupyterlab/apputils';

import { Message } from '@phosphor/messaging';

export function showPopup(options: Popup.IOptions) {
    let dialog = new Popup(options);
    dialog.launch();
    return dialog;
}

export class Popup<T> extends Widget {
    constructor(options: Popup.IOptions) {
        super();
        this._body = options.body;
        this._position = options.position;
        let layout = (this.layout = new PanelLayout());
        layout.addWidget(options.body);
    }

    launch() {
        Widget.attach(this, document.body);
        HoverBox.setGeometry({
            anchor: this._position,
            host: document.body,
            maxHeight: 50,
            minHeight: 20,
            node: this._body.node,
            offset: {},
            privilege: 'above',
            style: this.node.style
        });
    }

    protected onAfterAttach(msg: Message): void {
        let node = this.node;
        node.addEventListener('click', this, true);
    }

    protected onAfterDetach(msg: Message): void {
        let node = this.node;
        node.removeEventListener('click', this, true);
    }

    protected _evtClick(event: MouseEvent): void {
        // super.dispose();
        // this.dispose();
    }

    handleEvent(event: Event): void {
        this._evtClick(event as MouseEvent);
    }

    // private _original: HTMLElement;
    private _body: Widget;
    private _position: ClientRect;
}

export namespace Popup {
    export interface IOptions {
        body: Widget;
        position: ClientRect | DOMRect;
    }
}
