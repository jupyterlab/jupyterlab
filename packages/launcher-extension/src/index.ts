// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';


import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ILauncher, LauncherModel, Launcher
} from '@jupyterlab/launcher';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import '../style/index.css';


/**
 * The command IDs used by the launcher plugin.
 */
namespace CommandIDs {
  export
  const create = 'launcher:create';
};


/**
 * A service providing an interface to the the launcher.
 */
const plugin: JupyterLabPlugin<ILauncher> = {
  activate,
  id: 'jupyter.services.launcher',
  requires: [
    IServiceManager,
    ICommandPalette
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
function activate(app: JupyterLab, services: IServiceManager, palette: ICommandPalette): ILauncher {
  const { commands, shell } = app;

  let model = new LauncherModel();

  commands.addCommand(CommandIDs.create, {
    label: 'New Launcher',
    execute: (args: JSONObject) => {
      let cwd = args['cwd'] ? String(args['cwd']) : '';
      let id = `launcher-${Private.id++}`;
      let callback = (item: Widget) => {
        shell.addToMainArea(item, { ref: id });
        shell.activateById(item.id);
      };
      let widget = new Launcher({ cwd, callback });
      widget.model = model;
      widget.id = id;
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
