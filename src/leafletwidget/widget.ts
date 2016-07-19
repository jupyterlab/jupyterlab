// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget, ResizeMessage
} from 'phosphor-widget';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import leaflet = require('leaflet');


/**
 * The class name added to a map widget.
 */
const MAP_CLASS = 'jp-MapWidget';


/**
 * A widget for maps.
 */
export
class MapWidget extends Widget {
  /**
   * Construct a new map widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this._context = context;
    this.node.tabIndex = -1;
    this.addClass(MAP_CLASS);

    this._map = leaflet.map(this.node).fitWorld();
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution : 'Map data (c) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        min_zoom : 0,
        max_zoom : 18,
    }).addTo(this._map);

    if (context.model.toString()) {
      this.update();
    }
    context.model.contentChanged.connect(() => {
      this.update();
    });
    context.pathChanged.connect(() => {
      this.update();
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._context = null;
    this._map.remove();
    this._map = null;
    this._geojsonLayer = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this.title.text = this._context.path.split('/').pop();
    if (!this.isAttached) {
      return;
    }
    let contentString = this._context.model.toString();
    if (contentString === this._geojsonString) {
      return;
    }

    // we're attached to the DOM and have new layer content now
    if (this._geojsonLayer) {
      this._map.removeLayer(this._geojsonLayer);
    }
    this._geojsonString = contentString;
    this._geojsonLayer = null;
    if (contentString) {
      let content = JSON.parse(contentString);
      this._geojsonLayer = leaflet.geoJson(content, {
        pointToLayer: function (feature, latlng) {
            return leaflet.circleMarker(latlng);
        }
      });
      this._map.addLayer(this._geojsonLayer);
      this._map.fitBounds(this._geojsonLayer.getBounds());
    }
  }

  /**
   * A message handler invoked on a 'resize' message.
   */
  onResize(msg: ResizeMessage) {
    // Since we know the size from the resize message, we manually
    // define getSize() so that it does not have to do a DOM read.
    this._map.getSize = () => {
      if (msg.width === -1 || msg.height === -1) {
        return (this._map as any).prototype.getSize();
      } else {
        let size: any = new leaflet.Point(msg.width, msg.height);
        (this._map as any)._size = size;
        return size.clone();
      }
    };
    this._map.invalidateSize(true);
    if (this._geojsonLayer) {
      this._map.fitBounds(this._geojsonLayer.getBounds());
    }
  }

  /**
   * A message handler after the widget is attached to the DOM.
   */
  onAfterAttach() {
    this.update();
  }

  private _geojsonString = '';
  private _geojsonLayer: leaflet.GeoJSON;
  private _map: leaflet.Map;
  private _context: IDocumentContext<IDocumentModel>;
}


/**
 * A widget factory for maps.
 */
export
class MapWidgetFactory extends ABCWidgetFactory<MapWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): MapWidget {
    let widget = new MapWidget(context);
    this.widgetCreated.emit(widget);
    return widget;
  }
}
