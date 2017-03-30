// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandLinker, ICommandPalette, ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  LandingModel, LandingWidget
} from './widget';


/**
 * The command IDs used by the landing plugin.
 */
namespace CommandIDs {
  export
  const open = 'landing-jupyterlab:open';
};


/**
 * The class name added to the landing plugin.
 */
const LANDING_CLASS = 'jp-Landing';

/**
 * The landing page extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.landing',
  requires: [ICommandLinker, ICommandPalette, IServiceManager, ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the landing plugin.
 */
function activate(app: JupyterLab, linker: ICommandLinker, palette: ICommandPalette, services: IServiceManager, restorer: ILayoutRestorer): void {
  const { commands, shell } = app;
  const category = 'Help';
  const command = CommandIDs.open;
  const model = new LandingModel(services.terminals.isAvailable());
  const tracker = new InstanceTracker<LandingWidget>({
    namespace: 'landing',
    shell
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'landing'
  });

  let widget: LandingWidget;

  function newWidget(): LandingWidget {
    let widget = new LandingWidget(linker);
    widget.model = model;
    widget.id = 'landing-jupyterlab';
    widget.title.label = 'Landing';
    widget.title.closable = true;
    widget.addClass(LANDING_CLASS);
    tracker.add(widget);
    return widget;
  }

  commands.addCommand(command, {
    label: 'Open Landing',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = newWidget();
        shell.addToMainArea(widget);
      }
      tracker.activate(widget);
    }
  });

  palette.addItem({ category, command });

  // Only create a landing page if there are no other tabs open.
  app.restored.then(() => {
    if (shell.isEmpty('main')) {
      commands.execute(command, void 0);
    }
  });
}
