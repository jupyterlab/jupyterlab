// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  CSVWidget, CSVWidgetFactory
} from '@jupyterlab/csvwidget';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';


/**
 * The name of the factory that creates CSV widgets.
 */
const FACTORY = 'Table';


/**
 * The table file handler extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.csv-handler',
  requires: [IDocumentRegistry, ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the table widget extension.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: ILayoutRestorer): void {
  const factory = new CSVWidgetFactory({
    name: FACTORY,
    fileExtensions: ['.csv'],
    defaultFor: ['.csv']
  });
  const tracker = new InstanceTracker<CSVWidget>({
    namespace: 'csvwidget',
    shell: app.shell
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  registry.addWidgetFactory(factory);
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
  });
}
