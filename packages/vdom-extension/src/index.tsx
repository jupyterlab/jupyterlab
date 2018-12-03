// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Kernel, Session } from '@jupyterlab/services';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import VDOM, { SerializedEvent } from '@nteract/transform-vdom';

import '../style/index.css';

/**
 * The CSS class to add to the VDOM Widget.
 */
const CSS_CLASS = 'jp-RenderedVDOM';

/**
 * The CSS class for a VDOM icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-VDOMIcon';

/**
 * The MIME type for VDOM.
 */
export const MIME_TYPE = 'application/vdom.v1+json';

/**
 * A renderer for declarative virtual DOM content.
 */
export class RenderedVDOM extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering DOM.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.addClass(CSS_CLASS);
    this.addClass('jp-RenderedHTML');
    this.addClass('jp-RenderedHTMLCommon');
    this._mimeType = options.mimeType;
    // Get current kernel session (hack for mimerender extension)
    this._session = Session.listRunning().then(sessionModels => {
      const session = sessionModels.find(
        session => session.path === (options.resolver as any)._session.path
      );
      return Session.connectTo(session);
    });
  }

  /**
   * Dispose of the widget.
   */
  dispose(): void {
    // Dispose of React element
    ReactDOM.unmountComponentAtNode(this.node);
    // Dispose of open comms
    for (let targetName in this._comms) {
      this._comms[targetName].dispose();
    }
    // Dispose of open kernel session
    this._session.then(session => {
      session.dispose();
    });
    super.dispose();
  }

  /**
   * Render VDOM into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    return this._session.then(session => {
      const data = model.data[this._mimeType] as any;
      // const metadata = model.metadata[this._mimeType] as any || {};
      this.initVDOMEventHandlers(data, session);
      ReactDOM.render(
        <VDOM data={data} onVDOMEvent={this.handleVDOMEvent} />,
        this.node
      );
    });
  }
  /**
   * Initialize event handlers for VDOM elements.
   */
  initVDOMEventHandlers = (vdomEl: any, session: Session.ISession): void => {
    if (vdomEl.eventHandlers) {
      // For each event handler, connect to its comm by target name and open it
      for (let eventType in vdomEl.eventHandlers) {
        const targetName = vdomEl.eventHandlers[eventType];
        if (!this._comms[targetName]) {
          this._comms[targetName] = session.kernel.connectToComm(targetName);
          this._comms[targetName].open();
        }
      }
    }
    if (vdomEl.children) {
      if (Array.isArray(vdomEl.children)) {
        vdomEl.children.forEach((child: any) => {
          this.initVDOMEventHandlers(child, session);
        });
      }
      this.initVDOMEventHandlers(vdomEl.children, session);
    }
  };

  /**
   * Handle events for VDOM element.
   */
  handleVDOMEvent = (targetName: string, event: SerializedEvent<any>): void => {
    // When a VDOM element's event handler is called, send a serialized
    // representation of the event to the registered comm channel for the
    // kernel to handle
    this._comms[targetName].send(JSON.stringify(event));
  };

  /**
   * Called before the widget is detached from the DOM.
   */
  protected onBeforeDetach(msg: Message): void {
    // Unmount the component so it can tear down.
    ReactDOM.unmountComponentAtNode(this.node);
  }

  private _mimeType: string;
  private _session: Promise<Session.ISession>;
  private _comms: { [key: string]: Kernel.IComm } = {};
}

/**
 * A mime renderer factory for VDOM data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new RenderedVDOM(options)
};

const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    id: '@jupyterlab/vdom-extension:factory',
    rendererFactory,
    rank: 0,
    dataType: 'json',
    fileTypes: [
      {
        name: 'vdom',
        mimeTypes: [MIME_TYPE],
        extensions: ['.vdom', '.vdom.json'],
        iconClass: CSS_ICON_CLASS
      }
    ],
    documentWidgetFactoryOptions: {
      name: 'VDOM',
      primaryFileType: 'vdom',
      fileTypes: ['vdom', 'json'],
      defaultFor: ['vdom']
    }
  }
];

export default extensions;
