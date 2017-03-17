// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  AboutModel, AboutWidget
} from './widget';


/**
 * The command IDs used by the about plugin.
 */
namespace CommandIDs {
  export
  const open = 'about-jupyterlab:open';
}


/**
 * The about page extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.about',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer]
};


/**
 * Export the plugin as default.
 */
export default plugin;


function activate(app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer): void {
  const namespace = 'about-jupyterlab';
  const model = new AboutModel({ version: app.info.version });
  const command = CommandIDs.open;
  const category = 'Help';
  const { shell, commands } = app;
  const tracker = new InstanceTracker<AboutWidget>({ namespace, shell });

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

  commands.addCommand(command, {
    label: 'About JupyterLab',
    execute: () => {
      if (!widget || widget.isDisposed) {
        widget = newWidget();
        shell.addToMainArea(widget);
      }
      tracker.activate(widget);
    }
  });

  palette.addItem({ command, category });
}
