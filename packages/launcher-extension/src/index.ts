// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer
} from '@jupyterlab/apputils';

import {
  ILauncher, LauncherModel, LauncherWidget
} from '@jupyterlab/launcher';


/**
 * The command IDs used by the launcher plugin.
 */
namespace CommandIDs {
  export
  const show = 'launcher-jupyterlab:show';
};


/**
 * A service providing an interface to the the launcher.
 */
const plugin: JupyterLabPlugin<ILauncher> = {
  activate,
  id: 'jupyter.services.launcher',
  requires: [
    IServiceManager,
    ICommandPalette,
    ILayoutRestorer
  ],
  provides: ILauncher,
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the launcher.
 */
function activate(app: JupyterLab, services: IServiceManager, palette: ICommandPalette, restorer: ILayoutRestorer): ILauncher {
  const { commands, shell } = app;

  let model = new LauncherModel();

  commands.addCommand(CommandIDs.show, {
    label: 'New Launcher',
    execute: () => {
      let widget = new LauncherWidget();
      widget.model = model;
      widget.id = 'launcher';
      widget.title.label = 'Launcher';
      shell.addToMainArea(widget);
    }
  });

  palette.addItem({ command: CommandIDs.show, category: 'Launcher'});

  return model;
}
