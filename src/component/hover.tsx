import { Widget, PanelLayout } from '@phosphor/widgets';
import { HoverBox } from '@jupyterlab/apputils';

import { Message } from '@phosphor/messaging';
import { ElementExt } from '@phosphor/domutils';
import { hoverItem } from './style/lineForm';

export function showPopup(options: Popup.IOptions) {
    let dialog = new Popup(options);
    dialog.launch();
    return dialog;
}

export class Popup extends Widget {
    constructor(options: Popup.IOptions) {
        super();
        this._body = options.body;
        this._body.addClass(hoverItem);
        this._position = options.position;
        let layout = (this.layout = new PanelLayout());
        layout.addWidget(options.body);
    }

    launch() {
        this.setGeometry();
        Widget.attach(this, document.body);
        this.update();
    }

    setGeometry() {
        const style = window.getComputedStyle(this._body.node);
        HoverBox.setGeometry({
            anchor: this._position,
            host: document.body,
            maxHeight: 500,
            minHeight: 20,
            node: this._body.node,
            offset: {},
            privilege: 'forceAbove',
            style
        });
    }

    protected onUpdateRequest(msg: Message): void {
        this.setGeometry();
        super.onUpdateRequest(msg);
    }

    protected onAfterAttach(msg: Message): void {
        document.addEventListener('click', this, true);
    }

    protected onAfterDetach(msg: Message): void {
        document.removeEventListener('click', this, true);
    }

    protected _evtClick(event: MouseEvent): void {
        if (ElementExt.hitTest(this._body.node, event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
        } else {
            super.dispose();
            this.dispose();
        }
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
