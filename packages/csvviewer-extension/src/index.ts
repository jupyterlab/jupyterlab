// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  CSVViewer, CSVViewerFactory, TSVViewerFactory
} from '@jupyterlab/csvviewer';

import {
  IDocumentWidget
} from '@jupyterlab/docregistry';

/**
 * The name of the factories that creates widgets.
 */
const FACTORY_CSV = 'CSVTable';
const FACTORY_TSV = 'TSVTable';


/**
 * The CSV file handler extension.
 */

const csv: JupyterLabPlugin<void> = {
  activate: activateCsv,
  id: '@jupyterlab/csvviewer-extension:csv',
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * The TSV file handler extension.
 */
const tsv: JupyterLabPlugin<void> = {
  activate: activateTsv,
  id: '@jupyterlab/csvviewer-extension:tsv',
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * Activate cssviewer extension for CSV files
 */
function activateCsv(app: JupyterLab, restorer: ILayoutRestorer): void {
  const factory = new CSVViewerFactory({
    name: FACTORY_CSV,
    fileTypes: ['csv'],
    defaultFor: ['csv'],
    readOnly: true
  });
  const tracker = new InstanceTracker<IDocumentWidget<CSVViewer>>({namespace: 'csvviewer'});

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({path: widget.context.path, factory: FACTORY_CSV}),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);
  let ft = app.docRegistry.getFileType('csv');
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });

    if (ft) {
      widget.title.iconClass = ft.iconClass;
      widget.title.iconLabel = ft.iconLabel;
    }
  });
}

/**
 * Activate cssviewer extension for TSV files
 */
function activateTsv(app: JupyterLab, restorer: ILayoutRestorer): void {
  const factory = new TSVViewerFactory({
    name: FACTORY_TSV,
    fileTypes: ['tsv'],
    defaultFor: ['tsv'],
    readOnly: true
  });
  const tracker = new InstanceTracker<IDocumentWidget<CSVViewer>>({namespace: 'tsvviewer'});

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({path: widget.context.path, factory: FACTORY_TSV}),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);
  let ft = app.docRegistry.getFileType('tsv');
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });

    if (ft) {
      widget.title.iconClass = ft.iconClass;
      widget.title.iconLabel = ft.iconLabel;
    }
  });
}

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [csv, tsv];
export default plugins;
