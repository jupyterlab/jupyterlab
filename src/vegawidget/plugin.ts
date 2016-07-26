// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  DocumentRegistry
} from '../docregistry';

import {
  VegaWidget, VegaWidgetFactory, VegaLiteWidget, VegaLiteWidgetFactory
} from './widget';


/**
 * The list of file extensions for vega and vegalite.
 */
const VEGA_EXTENSIONS = ['.vg', 'vg.json', '.json'];
const VEGALITE_EXTENSIONS = ['.vl', 'vl.json', '.json'];


/**
 * The table file handler extension.
 */
export
const vegaHandlerExtension = {
  id: 'jupyter.extensions.vegaHandler',
  requires: [DocumentRegistry],
  activate: activateVegaWidget
};


/**
 * Activate the table widget extension.
 */
function activateVegaWidget(app: Application, registry: DocumentRegistry): void {

    let options = {
      fileExtensions: VEGA_EXTENSIONS,
      defaultFor: VEGA_EXTENSIONS.slice(0,2),
      displayName: 'Vega',
      modelName: 'text',
      preferKernel: false,
      canStartKernel: false
    };

    registry.addWidgetFactory(new VegaWidgetFactory(), options);

    options = {
      fileExtensions: VEGALITE_EXTENSIONS,
      defaultFor: VEGALITE_EXTENSIONS.slice(0,2),
      displayName: 'VegaLite',
      modelName: 'text',
      preferKernel: false,
      canStartKernel: false
    };

    registry.addWidgetFactory(new VegaLiteWidgetFactory(), options);
}
