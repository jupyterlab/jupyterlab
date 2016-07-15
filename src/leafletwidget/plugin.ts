// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  DocumentRegistry
} from '../docregistry';

import {
  MapWidget, MapWidgetFactory
} from './widget';

import 'leaflet/dist/leaflet.css';


/**
 * The list of file extensions for maps.
 */
const EXTENSIONS = ['.geojson'];


/**
 * The geojson file handler extension.
 */
export
const mapHandlerExtension = {
  id: 'jupyter.extensions.mapHandler',
  requires: [DocumentRegistry],
  activate: activateMapWidget
};


/**
 * Activate the map widget extension.
 */
function activateMapWidget(app: Application, registry: DocumentRegistry): void {
    let options = {
      fileExtensions: EXTENSIONS,
      displayName: 'Map',
      modelName: 'text',
      defaultFor: EXTENSIONS,
      preferKernel: false,
      canStartKernel: false
    };
    registry.addWidgetFactory(new MapWidgetFactory(), options);
}
