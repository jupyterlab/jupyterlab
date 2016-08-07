// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  CSVWidgetFactory
} from './widget';


/**
 * The list of file extensions for csv tables.
 */
const EXTENSIONS = ['.csv'];


/**
 * The table file handler extension.
 */
export
const csvHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.csvHandler',
  requires: [IDocumentRegistry],
  activate: activateCSVWidget,
  autoStart: true
};


/**
 * Activate the table widget extension.
 */
function activateCSVWidget(app: JupyterLab, registry: IDocumentRegistry): void {
  let options = {
    fileExtensions: EXTENSIONS,
    defaultFor: EXTENSIONS,
    displayName: 'Table',
    modelName: 'text',
    preferKernel: false,
    canStartKernel: false
  };

  registry.addWidgetFactory(new CSVWidgetFactory(), options);
}
