// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IStateDB
} from '../statedb';

import {
  CSVWidget, CSVWidgetFactory
} from './widget';


/**
 * The name of the factory that creates CSV widgets.
 */
const FACTORY = 'Table';


/**
 * The table file handler extension.
 */
export
const csvHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.csv-handler',
  requires: [IDocumentRegistry, IStateDB, ILayoutRestorer],
  activate: activateCSVWidget,
  autoStart: true
};


/**
 * Activate the table widget extension.
 */
function activateCSVWidget(app: JupyterLab, registry: IDocumentRegistry, state: IStateDB, layout: ILayoutRestorer): void {
  const factory = new CSVWidgetFactory({
    name: FACTORY,
    fileExtensions: ['.csv'],
    defaultFor: ['.csv']
  });
  const tracker = new InstanceTracker<CSVWidget>({
    restore: {
      state, layout,
      command: 'file-operations:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path,
      namespace: 'csvwidget',
      when: app.started,
      registry: app.commands
    }
  });

  registry.addWidgetFactory(factory);
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
  });
}
