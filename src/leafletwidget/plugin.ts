// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDocumentRegistry
} from '../docregistry';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  MapWidgetFactory
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
const mapHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.mapHandler',
  requires: [IDocumentRegistry],
  activate: activateMapWidget
};


/**
 * Activate the map widget extension.
 */
function activateMapWidget(app: JupyterLab, registry: IDocumentRegistry): void {
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
