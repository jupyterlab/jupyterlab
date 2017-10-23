// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  Message
} from '@phosphor/messaging';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import * as leaflet from 'leaflet';

import 'leaflet/dist/leaflet.css';

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
 * Set base path for leaflet images.
 */
leaflet.Icon.Default.imagePath = 'https://unpkg.com/leaflet/dist/images/';

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
    this._map.remove();
    this._map = null;
    super.dispose();
  }

  /**
   * Render GeoJSON into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as any | GeoJSON.GeoJsonObject;
    const metadata = model.metadata[this._mimeType] as any || {};
    return new Promise<void>((resolve, reject) => {
      // Create leaflet map object
      this._map = leaflet.map(this.node);
      // Disable scroll zoom by default to avoid conflicts with notebook scroll
      this._map.scrollWheelZoom.disable();
      // Enable scroll zoom on map focus
      this._map.on('blur', (event) => {
        this._map.scrollWheelZoom.disable();
      });
      // Disable scroll zoom on blur
      this._map.on('focus', (event) => {
        this._map.scrollWheelZoom.enable();
      });
      // Add leaflet tile layer to map
      leaflet.tileLayer(
        metadata.url_template || URL_TEMPLATE,
        metadata.layer_options || LAYER_OPTIONS
      ).addTo(this._map);
      // Create GeoJSON layer from data and add to map
      this._geoJSONLayer = leaflet.geoJSON(data).addTo(this._map);
      resolve(undefined);
    });
  }
  
  /**
   * A message handler invoked on a `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message) {
    // Set map size after widget is attached to DOM
    this._map.fitBounds(this._geoJSONLayer.getBounds());
    this._map.invalidateSize();
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage) {
    // Update map size after panel/window is resized
    this._map.fitBounds(this._geoJSONLayer.getBounds());
    this._map.invalidateSize();
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
