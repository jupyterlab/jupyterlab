// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Message,
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  RenderMime
} from '@jupyterlab/rendermime';

/**
 * Import vega-embed in this manner due to how it is exported.
 */
import embed = require('vega-embed');


/**
 * The CSS class to add to the Vega and Vega-Lite widget.
 */
const VEGA_COMMON_CLASS = 'jp-RenderedVegaCommon';

/**
 * The CSS class to add to the Vega.
 */
const VEGA_CLASS = 'jp-RenderedVega';

/**
 * The CSS class to add to the Vega-Lite.
 */
const VEGALITE_CLASS = 'jp-RenderedVegaLite';

/**
 * The MIME type for Vega.
 *
 * #### Notes
 * The version of this follows the major version of Vega.
 */
export
const VEGA_MIME_TYPE = 'application/vnd.vega.v2+json';

/**
 * The MIME type for Vega-Lite.
 *
 * #### Notes
 * The version of this follows the major version of Vega-Lite.
 */
export
const VEGALITE_MIME_TYPE = 'application/vnd.vegalite.v1+json';


/**
 * A widget for rendering Vega or Vega-Lite data, for usage with rendermime.
 */
export
class RenderedVega extends Widget {
  /**
   * Create a new widget for rendering Vega/Vega-Lite.
   */
  constructor(options: RenderMime.IRenderOptions) {
    super();
    this.addClass(VEGA_COMMON_CLASS);
    this._model = options.model;

    // Handle things related to the MIME type.
    let mimeType = this._mimeType = options.mimeType;
    if (mimeType === VEGA_MIME_TYPE) {
      this.addClass(VEGA_CLASS);
      this._mode = 'vega';
    } else {
      this.addClass(VEGALITE_CLASS);
      this._mode = 'vega-lite';
    }
  }

  /**
   * Dispose of the widget.
   */
  dispose(): void {
    this._model = null;
    super.dispose();
  }

  /**
   * Trigger rendering after the widget is attached to the DOM.
   */
  onAfterAttach(msg: Message): void {
    this._renderVega();
  }

  /**
   * Actual render Vega/Vega-Lite into this widget's node.
   */
  private _renderVega(): void {

    let data = this._model.data.get(this._mimeType) as JSONObject;

    let embedSpec = {
      mode: this._mode,
      spec: data
    };

    embed(this.node, embedSpec, (error: any, result: any): any => {
      // This is copied out for now as there is a bug in JupyterLab
      // that triggers and infinite rendering loop when this is done.
      // let imageData = result.view.toImageURL();
      // imageData = imageData.split(',')[1];
      // this._injector('image/png', imageData);
    });
  }

  private _model: RenderMime.IMimeModel = null;
  private _mimeType: string;
  private _mode: string;

}


/**
 * A mime renderer for Vega/Vega-Lite data.
 */
export
class VegaRenderer implements RenderMime.IRenderer {
  /**
   * The mimeTypes this renderer accepts.
   */
  mimeTypes = [VEGA_MIME_TYPE, VEGALITE_MIME_TYPE];

  /**
   * Whether the renderer can render given the render options.
   */
  canRender(options: RenderMime.IRenderOptions): boolean {
    return this.mimeTypes.indexOf(options.mimeType) !== -1;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    return new RenderedVega(options);
  }

  /**
   * Whether the renderer will sanitize the data given the render options.
   */
  wouldSanitize(options: RenderMime.IRenderOptions): boolean {
    // TODO: Is this the correct logic?
    return !options.model.trusted;
  }
}


const renderer = new VegaRenderer();

const extensions: RenderMime.IExtension | RenderMime.IExtension[] = [
  // Vega
  {
    mimeType: VEGA_MIME_TYPE,
    renderer,
    rendererIndex: 0,
    widgetFactoryOptions: {
      name: 'Vega',
      fileExtensions: ['.vg', '.vg.json', 'json'],
      defaultFor: ['.vg', '.vg.json'],
      readOnly: true
    }
  },
  // Vega-Lite
  {
    mimeType: VEGALITE_MIME_TYPE,
    renderer,
    rendererIndex: 0,
    widgetFactoryOptions: {
      name: 'Vega-Lite',
      fileExtensions: ['.vl', '.vl.json', 'json'],
      defaultFor: ['.vl', '.vl.json'],
      readOnly: true
    }
  }
];

export default extensions;
