/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

/**
 * Import vega-embed in this manner due to how it is exported.
 */
import embed = require('vega-embed');


import '../style/index.css';


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
class RenderedVega extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering Vega/Vega-Lite.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.addClass(VEGA_COMMON_CLASS);

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
   * Render Vega/Vega-Lite into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {

    let data = model.data[this._mimeType];
    let updatedData: JSONObject;
    if (this._mode === 'vega-lite') {
      updatedData = Private.updateVegaLiteDefaults(data as ReadonlyJSONObject);
    } else {
      updatedData = data as JSONObject;
    }

    let embedSpec = {
      mode: this._mode,
      spec: updatedData
    };

    return new Promise<void>((resolve, reject) => {
      embed(this.node, embedSpec, (error: any, result: any): any => {
        resolve(undefined);
        // This is copied out for now as there is a bug in JupyterLab
        // that triggers and infinite rendering loop when this is done.
        // let imageData = result.view.toImageURL();
        // imageData = imageData.split(',')[1];
        // this._injector('image/png', imageData);
      });
    });
  }

  private _mimeType: string;
  private _mode: string;
}


/**
 * A mime renderer factory for vega data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [VEGA_MIME_TYPE, VEGALITE_MIME_TYPE],
  createRenderer: options => new RenderedVega(options)
};

const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  // Vega
  {
    mimeType: VEGA_MIME_TYPE,
    rendererFactory,
    rank: 0,
    dataType: 'json',
    documentWidgetFactoryOptions: {
      name: 'Vega',
      fileExtensions: ['.vg', '.vg.json', '.json'],
      defaultFor: ['.vg', '.vg.json'],
      readOnly: true
    }
  },
  // Vega-Lite
  {
    mimeType: VEGALITE_MIME_TYPE,
    rendererFactory,
    rank: 0,
    dataType: 'json',
    documentWidgetFactoryOptions: {
      name: 'Vega-Lite',
      fileExtensions: ['.vl', '.vl.json', '.json'],
      defaultFor: ['.vl', '.vl.json'],
      readOnly: true
    }
  }
];

export default extensions;


/**
 * Namespace for module privates.
 */
namespace Private {

  /**
   * Default cell config for Vega-Lite.
   */
  const defaultCellConfig: JSONObject = {
    "width": 400,
    "height": 400/1.5
  }

  /**
   * Apply the default cell config to the spec in place.
   * 
   * #### Notes
   * This carefully does a shallow copy to avoid copying the potentially
   * large data.
   */
  export
  function updateVegaLiteDefaults(spec: ReadonlyJSONObject): JSONObject {
    if ( spec.hasOwnProperty('config') ) {
      if ( spec.config.hasOwnProperty('cell') ) {
        return {
          ...{"config": {...{"cell": {...defaultCellConfig, ...((spec.config as ReadonlyJSONObject).cell as any)}}}, ...(spec.config as any)},
          ...spec
        }
      } else {
        return {...{"config": {...{"cell": {...defaultCellConfig}}}, ...(spec.config as any)}, ...spec}
      }
    } else {
      return {...{"config": {"cell": defaultCellConfig}}, ...spec};
    }
  }

}
