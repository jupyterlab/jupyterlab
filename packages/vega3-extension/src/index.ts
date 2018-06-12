/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import vegaEmbed, { Mode, vega, EmbedOptions } from 'vega-embed';

import '../style/index.css';


/**
 * The CSS class to add to the Vega and Vega-Lite widget.
 */
const VEGA_COMMON_CLASS = 'jp-RenderedVegaCommon3';

/**
 * The CSS class to add to the Vega.
 */
const VEGA_CLASS = 'jp-RenderedVega3';

/**
 * The CSS class to add to the Vega-Lite.
 */
const VEGALITE_CLASS = 'jp-RenderedVegaLite2';

/**
 * The MIME type for Vega.
 *
 * #### Notes
 * The version of this follows the major version of Vega.
 */
export
const VEGA_MIME_TYPE = 'application/vnd.vega.v3+json';

/**
 * The MIME type for Vega-Lite.
 *
 * #### Notes
 * The version of this follows the major version of Vega-Lite.
 */
export
const VEGALITE_MIME_TYPE = 'application/vnd.vegalite.v2+json';


/**
 * A widget for rendering Vega or Vega-Lite data, for usage with rendermime.
 */
export
class RenderedVega3 extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering Vega/Vega-Lite.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this._resolver = options.resolver;
    this.addClass(VEGA_COMMON_CLASS);
    this.addClass(this._mimeType === VEGA_MIME_TYPE ? VEGA_CLASS : VEGALITE_CLASS);
  }

  /**
   * Render Vega/Vega-Lite into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as JSONObject;
    const metadata = model.metadata[this._mimeType] as { embed_options?: EmbedOptions };
    const embedOptions = metadata && metadata.embed_options ? metadata.embed_options : {};
    const mode: Mode = this._mimeType === VEGA_MIME_TYPE ? 'vega' : 'vega-lite';
    return this._resolver.resolveUrl('').then((path: string) => {
      return this._resolver.getDownloadUrl(path).then(baseURL => {
        const loader = vega.loader({
          baseURL,
          http: { credentials: 'same-origin' }
        });
        const options: EmbedOptions = {
          actions: true,
          defaultStyle: true,
          ...embedOptions,
          mode,
          loader
        };
        const el = document.createElement('div');
        this.node.innerHTML = '';  // clear the output before attaching a chart
        this.node.appendChild(el);
        return vegaEmbed(el, data, options).then(result => {
          // Add png representation of vega chart to output
          if (!model.data['image/png']) {
            return result.view.toImageURL('png').then(imageData => {
              const data = { ...model.data, 'image/png': imageData.split(',')[1] };
              model.setData({ data });
            });
          }
          return void 0;
        });
      });
    });
  }

  private _mimeType: string;
  private _resolver: IRenderMime.IResolver;
}


/**
 * A mime renderer factory for vega data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [VEGA_MIME_TYPE, VEGALITE_MIME_TYPE],
  createRenderer: options => new RenderedVega3(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/vega3-extension:factory',
  rendererFactory,
  rank: 50,  // prefer over vega 2 extension
  dataType: 'json',
  documentWidgetFactoryOptions: [{
    name: 'Vega 3',
    primaryFileType: 'vega3',
    fileTypes: ['vega3', 'json'],
    defaultFor: ['vega3']
  },
  {
    name: 'Vega-Lite 2',
    primaryFileType: 'vega-lite2',
    fileTypes: ['vega-lite2', 'json'],
    defaultFor: ['vega-lite2']
  }],
  fileTypes: [{
    mimeTypes: [VEGA_MIME_TYPE],
    name: 'vega3',
    extensions: ['.vg', '.vg.json', '.vega'],
    iconClass: 'jp-MaterialIcon jp-VegaIcon',
  },
  {
    mimeTypes: [VEGALITE_MIME_TYPE],
    name: 'vega-lite2',
    extensions: ['.vl', '.vl.json', '.vegalite'],
    iconClass: 'jp-MaterialIcon jp-VegaIcon',
  }]
};

export default extension;
