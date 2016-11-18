// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  IStateDB
} from '../statedb';

import {
  CSVWidgetFactory
} from './widget';


/**
 * The state database namespace for CSV widgets.
 */
const NAMESPACE = 'csvwidgets';


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

  registry.addWidgetFactory(factory);

  factory.widgetCreated.connect((sender, widget) => {
    // Add the CSV path to the state database.
    let key = `${NAMESPACE}:${widget.context.path}`;
    state.save(key, widget.context.path);
    // Remove the CSV path from the state database on disposal.
    widget.disposed.connect(() => { state.remove(key); });
    // Keep track of path changes in the state database.
    widget.context.pathChanged.connect((sender, path) => {
      state.remove(key);
      key = `${NAMESPACE}:${path}`;
      state.save(key, path);
    });
  });

  // Reload any CSV widgets whose state has been stored.
  Promise.all([state.fetchNamespace(NAMESPACE), app.started])
    .then(([paths]) => {
      let open = 'file-operations:open';
      paths.forEach(path => { app.commands.execute(open, { path }); });
    });
}
