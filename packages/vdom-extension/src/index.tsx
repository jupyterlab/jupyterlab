// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import VDOM from '@nteract/transform-vdom';

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
export
const MIME_TYPE = 'application/vdom.v1+json';


export
class RenderedVDOM extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering DOM.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.addClass(CSS_CLASS);
    this._mimeType = options.mimeType;
  }

  /**
   * Render VDOM into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as any;
    // const metadata = model.metadata[this._mimeType] as any || {};
    return new Promise<void>((resolve, reject) => {
      ReactDOM.render(<VDOM data={data} />, this.node, () => {
        resolve(undefined);
      });
    });
  }

  private _mimeType: string;
}


/**
 * A mime renderer factory for VDOM data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
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
    fileTypes: [{
      name: 'vdom',
      mimeTypes: [MIME_TYPE],
      extensions: ['.vdom', '.vdom.json'],
      iconClass: CSS_ICON_CLASS
    }],
    documentWidgetFactoryOptions: {
      name: 'VDOM',
      primaryFileType: 'vdom',
      fileTypes: ['vdom', 'json'],
      defaultFor: ['vdom']
    }
  }
];

export default extensions;
