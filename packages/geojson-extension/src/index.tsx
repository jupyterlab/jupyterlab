// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

// Import only the typings for leaflet - do not use for values.
import * as leaflet from 'leaflet';

import '../style/index.css';


/**
 * The CSS class to add to the GeoJSON Widget.
 */
const CSS_CLASS = 'jp-RenderedGeoJSON';

/**
 * The CSS class for a GeoJSON icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-GeoJSONIcon';

/**
 * The MIME type for GeoJSON.
 */
export
const MIME_TYPE = 'application/geo+json';

/**
 * The url template that leaflet tile layers.
 * See http://leafletjs.com/reference-1.0.3.html#tilelayer
 */
const URL_TEMPLATE: string = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * The options for leaflet tile layers.
 * See http://leafletjs.com/reference-1.0.3.html#tilelayer
 */
const LAYER_OPTIONS: leaflet.TileLayerOptions = {
  attribution: 'Map data (c) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  minZoom: 0,
  maxZoom: 18
};


export
class RenderedGeoJSON extends Widget implements IRenderMime.IRenderer {
  /**
   * Create a new widget for rendering GeoJSON.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.addClass(CSS_CLASS);
    this._mimeType = options.mimeType;
  }

  /**
   * Dispose of the widget.
   */
  dispose(): void {
    // Dispose of leaflet map
    if (this._map) {
      this._map.remove();
    }
    this._map = null;
    super.dispose();
  }

  /**
   * Render GeoJSON into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as any;
    const metadata = model.metadata[this._mimeType] as any | GeoJSON.GeoJsonObject || {};
    return this._ensureMod().then(mod => {
      // Create leaflet map object if needed.
      if (!this._map) {
        this._map = mod.map(this.node);
      }

      // Set base path for leaflet images.
      mod.Icon.Default.imagePath = 'https://unpkg.com/leaflet/dist/images/';

      // Add leaflet tile layer to map
      mod.tileLayer(
        metadata.url_template || URL_TEMPLATE,
        metadata.layer_options || LAYER_OPTIONS
      ).addTo(this._map);

      // Create GeoJSON layer from data and add to map
      this._geoJSONLayer = mod.geoJSON(data).addTo(this._map);

      // Update map size after panel/window is resized
      this._map.fitBounds(this._geoJSONLayer.getBounds());
      this._map.invalidateSize();

      // Disable scroll zoom by default to avoid conflicts with notebook scroll
      this._map.scrollWheelZoom.disable();

      // Enable scroll zoom on map focus
      this._map.on('blur', (event: any) => {
        this._map.scrollWheelZoom.disable();
      });

      // Disable scroll zoom on blur
      this._map.on('focus', (event: any) => {
        this._map.scrollWheelZoom.enable();
      });
    });
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage) {
    if (!this._map) {
      return;
    }
    // Update map size after panel/window is resized
    if (this._geoJSONLayer) {
      this._map.fitBounds(this._geoJSONLayer.getBounds());
    }
    this._map.invalidateSize();
  }

  /**
   * Initialize the leaflet module and our map.
   */
  private _ensureMod(): Promise<typeof leaflet> {
    return new Promise((resolve, reject) => {
      (require as any).ensure(['leaflet', 'leaflet/dist/leaflet.css'], (require: NodeRequire) => {
        resolve(require('leaflet'));
      },
      (err: any) => {
        reject(err);
      },
      'leaflet'
      );
    });
  }

  private _map: leaflet.Map;
  private _geoJSONLayer: leaflet.GeoJSON;
  private _mimeType: string;
}


/**
 * A mime renderer factory for GeoJSON data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new RenderedGeoJSON(options)
};


const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    id: '@jupyterlab/geojson-extension:factory',
    rendererFactory,
    rank: 0,
    dataType: 'json',
    fileTypes: [{
      name: 'geojson',
      mimeTypes: [MIME_TYPE],
      extensions: ['.geojson', '.geo.json'],
      iconClass: CSS_ICON_CLASS
    }],
    documentWidgetFactoryOptions: {
      name: 'GeoJSON',
      primaryFileType: 'geojson',
      fileTypes: ['geojson', 'json'],
      defaultFor: ['geojson']
    }
  }
];

export default extensions;
