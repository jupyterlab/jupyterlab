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
  const create = 'launcher-jupyterlab:create';
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

  commands.addCommand(CommandIDs.create, {
    label: 'New Launcher',
    execute: (args) => {
      let cwd = args['cwd'] ? String(args['cwd']) : '';
      let widget = new LauncherWidget({ cwd });
      widget.model = model;
      widget.id = `launcher-${Private.id++}`;
      widget.title.label = 'Launcher';
      widget.title.closable = true;
      shell.addToMainArea(widget);
      if (args['activate'] !== false) {
        shell.activateById(widget.id);
      }
    }
  });

  palette.addItem({ command: CommandIDs.create, category: 'Launcher'});

  return model;
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The incrementing id used for launcher widgets.
   */
  export
  let id = 0;
}
