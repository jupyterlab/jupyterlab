// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IPathTracker
} from '../filebrowser';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IServiceManager
} from '../services';

import {
  CommandIDs, LandingModel, LandingWidget
} from './';

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
  requires: [IPathTracker, ICommandPalette, IServiceManager, IInstanceRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the landing plugin.
 */
function activate(app: JupyterLab, pathTracker: IPathTracker, palette: ICommandPalette, services: IServiceManager, restorer: IInstanceRestorer): void {
  const category = 'Help';
  const command = CommandIDs.open;
  const model = new LandingModel(services.terminals.isAvailable());
  const tracker = new InstanceTracker<LandingWidget>({ namespace: 'landing' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'landing'
  });

  let widget: LandingWidget;

  function newWidget(): LandingWidget {
    let widget = new LandingWidget(app);
    widget.model = model;
    widget.id = 'landing-jupyterlab';
    widget.title.label = 'Landing';
    widget.title.closable = true;
    widget.addClass(LANDING_CLASS);
    tracker.add(widget);
    return widget;
  }

  app.commands.addCommand(command, {
    label: 'Open Landing',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = newWidget();
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  });

  pathTracker.pathChanged.connect(() => {
    if (pathTracker.path.length) {
      model.path = 'home > ' + pathTracker.path.replace('/', ' > ');
    } else {
      model.path = 'home';
    }
  });

  palette.addItem({ category, command });

  // Only create a landing page if there are no other tabs open.
  app.restored.then(() => {
    if (app.shell.mainAreaIsEmpty) {
      app.commands.execute(command, void 0);
    }
  });
}
