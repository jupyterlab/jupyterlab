// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';


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
  IStateDB
} from '../statedb';

import {
  CSVWidget, CSVWidgetFactory
} from './widget';


/**
 * The table file handler extension.
 */
export
const csvHandlerExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.csvHandler',
  requires: [IDocumentRegistry, IStateDB],
  activate: activateCSVWidget,
  autoStart: true
};


/**
 * Activate the table widget extension.
 */
function activateCSVWidget(app: JupyterLab, registry: IDocumentRegistry, state: IStateDB): void {
  const factory = new CSVWidgetFactory({
    name: 'Table',
    fileExtensions: ['.csv'],
    defaultFor: ['.csv']
  });
  const tracker = new InstanceTracker<CSVWidget>({
    restore: {
      state,
      command: 'file-operations:open',
      args: widget => ({ path: widget.context.path }),
      name: widget => widget.context.path,
      namespace: 'csvwidgets',
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
