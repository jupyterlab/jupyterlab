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
  IInstanceRestorer
} from '../instancerestorer';

import {
  AboutModel, AboutWidget, CommandIDs
} from './';

/**
 * The about page extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.about',
  autoStart: true,
  requires: [ICommandPalette, IInstanceRestorer]
};


/**
 * Export the plugin as default.
 */
export default plugin;


function activate(app: JupyterLab, palette: ICommandPalette, restorer: IInstanceRestorer): void {
  const namespace = 'about-jupyterlab';
  const model = new AboutModel({ version: app.info.version });
  const command = CommandIDs.open;
  const category = 'Help';
  const tracker = new InstanceTracker<AboutWidget>({ namespace });

  restorer.restore(tracker, {
    command,
    args: () => null,
    name: () => 'about'
  });

  let widget: AboutWidget;

  function newWidget(): AboutWidget {
    let widget = new AboutWidget();
    widget.model = model;
    widget.id = 'about';
    widget.title.label = 'About';
    widget.title.closable = true;
    tracker.add(widget);
    return widget;
  }

  app.commands.addCommand(command, {
    label: 'About JupyterLab',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = newWidget();
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  });

  palette.addItem({ command, category });
}
