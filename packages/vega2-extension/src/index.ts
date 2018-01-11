/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject, JSONValue, ReadonlyJSONObject
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
// Import only the typings for vega-embed - do not use for values.
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

    let data = model.data[this._mimeType] as ReadonlyJSONObject;
    let updatedData: JSONObject;
    if (this._mode === 'vega-lite') {
      updatedData = Private.updateVegaLiteDefaults(data);
    } else {
      updatedData = data as JSONObject;
    }

    let embedSpec = {
      mode: this._mode,
      spec: updatedData
    };

    return Private.ensureMod().then(embedFunc => {
      return new Promise<void>((resolve, reject) => {
        embedFunc(this.node, embedSpec, (error: any, result: any): any => {
          if (error) {
            return reject(error);
          }

          // Save png data in MIME bundle along with original MIME data.
          if (!model.data['image/png']) {
            let imageData = result.view.toImageURL().split(',')[1] as JSONValue;
            let newData = {...(model.data), 'image/png': imageData};
            model.setData({ data: newData });
          }
          resolve(undefined);
        });
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
  defaultRank: 60,
  createRenderer: options => new RenderedVega(options)
};

const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/vega2-extension:factory',
  rendererFactory,
  dataType: 'json',
  documentWidgetFactoryOptions: [{
    name: 'Vega',
    modelName: 'text',
    primaryFileType: 'vega',
    fileTypes: ['vega', 'json'],
    defaultFor: ['vega']
  },
  {
    name: 'Vega Lite',
    modelName: 'text',
    primaryFileType: 'vega-lite',
    fileTypes: ['vega-lite', 'json'],
    defaultFor: ['vega-lite']
  }],
  fileTypes: [{
    mimeTypes: [VEGA_MIME_TYPE],
    name: 'vega',
    displayName: 'Vega File',
    fileFormat: 'text',
    extensions: ['.vg', '.vg.json', '.vega'],
    iconClass: 'jp-MaterialIcon jp-VegaIcon',
  },
  {
    mimeTypes: [VEGALITE_MIME_TYPE],
    name: 'vega-lite',
    displayName: 'Vega-Lite File',
    fileFormat: 'text',
    extensions: ['.vl', '.vl.json', '.vegalite'],
    iconClass: 'jp-MaterialIcon jp-VegaIcon',
  }]
};

export default extension;


/**
 * Namespace for module privates.
 */
namespace Private {

  /**
   * Default cell config for Vega-Lite.
   */
  const defaultCellConfig: JSONObject = {
    'width': 400,
    'height': 400 / 1.5
  };

  /**
   * The embed module import.
   */
  let mod: typeof embed;

  /**
   * Initialize the vega-embed module.
   */
  export
  function ensureMod(): Promise<typeof embed> {
    return new Promise((resolve, reject) => {
      if (mod !== undefined) {
        resolve(mod);
        return;
      }
      (require as any).ensure(['vega-embed'], (require: NodeRequire) => {
        mod = require('vega-embed');
        resolve(mod);
      },
      (err: any) => {
        reject(err);
      },
      'vega2'
      );
    });
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
    let config = spec.config as JSONObject;
    if (!config) {
      return {...{'config': {'cell': defaultCellConfig}}, ...spec};
    }
    let cell = config.cell as JSONObject;
    if (cell) {
      return {
        ...{'config': {...{'cell': {...defaultCellConfig, ...cell}}}, ...config},
        ...spec
      };
    } else {
      return {...{'config': {...{'cell': {...defaultCellConfig}}}, ...config}, ...spec};
    }
  }
}
