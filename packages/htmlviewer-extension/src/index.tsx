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
    this._resolver = options.resolver;
  }

  /**
   * Render HTML in IFrame into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    let data = model.data[this._mimeType] as string;
    data = await this._setBase(data);

    const blob = new Blob([data], {type: "text/html"});
    this._iframe.url = URL.createObjectURL(blob);
    return Promise.resolve(void 0);
  }

  /**
   * Set a <base> element in the HTML string so that the iframe
   * can correctly dereference relative links/
   */
  private async _setBase(data: string): Promise<string> {
    const doc = this._parser.parseFromString(data, 'text/html');
    let base: HTMLBaseElement;
    base = doc.querySelector('base');
    if (!base) {
      base = doc.createElement('base');
      doc.head.insertBefore(base, doc.head.firstChild);
    }
    const path = await this._resolver.resolveUrl('');
    const baseUrl = await this._resolver.getDownloadUrl(path);

    // Set the base href, plus a fake name for the url of this
    // document. The fake name doesn't really matter, as long
    // as the document can dereference relative links to resources
    // (e.g. CSS and scripts).
    base.href = `${baseUrl}/__fake__.html`;
    base.target = '_blank';
    return doc.documentElement.innerHTML;
  }

  private _parser = new DOMParser();
  private _resolver: IRenderMime.IResolver;
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
