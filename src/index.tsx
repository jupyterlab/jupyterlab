// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';


import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import '../style/index.css';

/**
 * The CSS class to add to the Plotly Widget.
 */
const CSS_CLASS = 'jp-RenderedIFrame';

/**
 * The CSS class for a Plotly icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-HTMLIcon';

/**
 * The MIME type for HTML.
 */
export
const MIME_TYPE = 'application/jupyterlab_html';

export
const HTML_CLASS = 'jp-HTMLViewer';

export
const HTML_CONTAINER_CLASS = 'jp-HTMLContainer';

export
class RenderedIFrame extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering HTML.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super({ node: Private.createNode() });
    this.addClass(CSS_CLASS);
    this._mimeType = options.mimeType;
  }

  /**
   * Render HTML in IFrame into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    const blob = new Blob([data], {type: "text/html"});
    this.node.querySelector('iframe').setAttribute('src', URL.createObjectURL(blob));
    return Promise.resolve(void 0);
  }

  private _mimeType: string;
}


/**
 * A mime renderer factory for HTML data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new RenderedIFrame(options)
};


const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    id: '@jupyterlab_html:factory',
    rendererFactory,
    rank: 0,
    dataType: "string",
    fileTypes: [{
      name: 'html',
      mimeTypes: [MIME_TYPE],
      extensions: ['.html'],
      iconClass: CSS_ICON_CLASS
    }],
    documentWidgetFactoryOptions: {
      name: 'View HTML',
      primaryFileType: 'html',
      fileTypes: ['html'],
      defaultFor: ['html']
    }
  }
];

export default extensions;


/**
 * A namespace for HTML widget private data.
 */
namespace Private {
  /**
   * Create the node for the HTML widget.
   */
  export
  function createNode(): HTMLElement {
    let node = document.createElement('div');
    node.className = HTML_CONTAINER_CLASS;
    let iframe = document.createElement('iframe');
    iframe.style.height = '100%';
    iframe.style.width = '100%';
    iframe.className = HTML_CLASS;
    iframe.setAttribute('type', MIME_TYPE);
    node.appendChild(iframe);
    return node;
  }
}
