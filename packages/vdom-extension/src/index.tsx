// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Kernel, Session } from '@jupyterlab/services';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import VDOM, { EventPayload } from '@nteract/transform-vdom';

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
 * The comm target name for communication with vdom.
 */
export const TARGET_NAME = 'vdom';

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
    this._comm = Session.listRunning().then(sessionModels => {
      const model = sessionModels.find(
        session => session.path === (options.resolver as any)._session.path // Hack
      );
      const session = Session.connectTo(model);
      const comm = session.kernel.connectToComm(TARGET_NAME);
      comm.open();
      return comm;
    });
  }

  /**
   * Dispose of the widget.
   */
  dispose(): void {
    // Dispose of comm disposable
    this._comm.then(comm => {
      comm.dispose();
    });
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
    return this._comm.then(() => {
      const data = model.data[this._mimeType] as any;
      // const metadata = model.metadata[this._mimeType] as any || {};
      ReactDOM.render(
        <VDOM data={data} onVDOMEvent={this.handleVDOMEvent} />,
        this.node
      );
    });
  }

  /**
   * Handle events for VDOM element.
   */
  handleVDOMEvent = (event: EventPayload): void => {
    // When a VDOM element's event handler is called, send a serialized
    // representation of the event to the registered comm channel for the
    // kernel to handle
    this._comm.then(comm => {
      // Debounce comm messages
      if (this._timer) {
        window.clearTimeout(this._timer);
      }
      this._timer = window.setTimeout(() => {
        comm.send(JSON.stringify(event));
      }, 16);
    });
  };

  private _mimeType: string;
  private _comm: Promise<Kernel.IComm>;
  private _timer: number;
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
