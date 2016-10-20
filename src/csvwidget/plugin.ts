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
  registry.addWidgetFactory(new CSVWidgetFactory({
    name: 'Table',
    fileExtensions: ['.csv'],
    defaultFor: ['.csv']
  }));
}
