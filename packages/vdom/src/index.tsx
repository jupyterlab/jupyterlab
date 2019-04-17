// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import { IClientSession, IInstanceTracker } from '@jupyterlab/apputils';

import { DocumentRegistry, MimeDocument } from '@jupyterlab/docregistry';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Kernel } from '@jupyterlab/services';

import VDOM, { SerializedEvent } from '@nteract/transform-vdom';

import { Token } from '@phosphor/coreutils';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import '../style/index.css';

/**
 * The CSS class to add to the VDOM Widget.
 */
const CSS_CLASS = 'jp-RenderedVDOM';

/**
 * A class that tracks VDOM widgets.
 */
export interface IVDOMTracker extends IInstanceTracker<MimeDocument> {}

/**
 * The VDOM tracker token.
 */
export const IVDOMTracker = new Token<IVDOMTracker>(
  '@jupyterlab/vdom:IVDOMTracker'
);

/**
 * A renderer for declarative virtual DOM content.
 */
export class RenderedVDOM extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering DOM.
   */
  constructor(
    options: IRenderMime.IRendererOptions,
    context?: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ) {
    super();
    this.addClass(CSS_CLASS);
    this.addClass('jp-RenderedHTML');
    this.addClass('jp-RenderedHTMLCommon');
    this._mimeType = options.mimeType;
    if (context) {
      this._session = context.session;
    }
  }

  /**
   * Dispose of the widget.
   */
  dispose(): void {
    // Dispose of comm disposables
    for (let targetName in this._comms) {
      this._comms[targetName].dispose();
    }
    super.dispose();
  }

  /**
   * Called before the widget is detached from the DOM.
   */
  protected onBeforeDetach(msg: Message): void {
    // Dispose of React component(s).
    ReactDOM.unmountComponentAtNode(this.node);
  }

  /**
   * Render VDOM into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = model.data[this._mimeType] as any;
      ReactDOM.render(
        <VDOM data={data} onVDOMEvent={this.handleVDOMEvent} />,
        this.node,
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Handle events for VDOM element.
   */
  handleVDOMEvent = (targetName: string, event: SerializedEvent<any>): void => {
    // When a VDOM element's event handler is called, send a serialized
    // representation of the event to the registered comm channel for the
    // kernel to handle
    if (this._timer) {
      window.clearTimeout(this._timer);
    }
    if (this._session) {
      this._timer = window.setTimeout(() => {
        if (!this._comms[targetName]) {
          this._comms[targetName] = this._session.kernel.connectToComm(
            targetName
          );
          this._comms[targetName].open();
        }
        this._comms[targetName].send(JSON.stringify(event));
      }, 16);
    }
  };

  private _mimeType: string;
  private _session?: IClientSession;
  private _comms: { [targetName: string]: Kernel.IComm } = {};
  private _timer: number;
}
