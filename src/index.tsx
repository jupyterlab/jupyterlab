// Distributed under the terms of the Modified BSD License.

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  IFrame
} from '@jupyterlab/apputils';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import '../style/index.css';

/**
 * The CSS class to add to the Plotly Widget.
 */
const CSS_CLASS = 'jp-RenderedIFrame';

/**
 * The CSS class for an HTML5 icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-HTMLIcon';

/**
 * The MIME type for HTML. We don't use `text/html` because that
 * will conflict with the already existing `text/html` mimetype
 * used for inline HTML in JupyterLab.
 */
export
const MIME_TYPE = 'application/vnd.jupyter.iframe.text';

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
    super();
    const layout = this.layout = new PanelLayout();
    this.addClass(CSS_CLASS);
    this._iframe = new IFrame();
    layout.addWidget(this._iframe);
    this._mimeType = options.mimeType;
  }

  /**
   * Render HTML in IFrame into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    const blob = new Blob([data], {type: "text/html"});
    this._iframe.url = URL.createObjectURL(blob);
    return Promise.resolve(void 0);
  }

  private _iframe: IFrame;
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
