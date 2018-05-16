// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, MainAreaWidget
} from '@jupyterlab/apputils';

import {
  ILauncher, LauncherModel, Launcher
} from '@jupyterlab/launcher';

import {
  toArray
} from '@phosphor/algorithm';

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
}


/**
 * A service providing an interface to the the launcher.
 */
const plugin: JupyterLabPlugin<ILauncher> = {
  activate,
  id: '@jupyterlab/launcher-extension:plugin',
  requires: [ICommandPalette],
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
function activate(app: JupyterLab, palette: ICommandPalette): ILauncher {
  const { commands, shell } = app;
  const model = new LauncherModel();

  commands.addCommand(CommandIDs.create, {
    label: 'New Launcher',
    execute: (args: JSONObject) => {
      const cwd = args['cwd'] ? String(args['cwd']) : '';
      const id = `launcher-${Private.id++}`;
      const callback = (item: Widget) => {
        shell.addToMainArea(item, { ref: id });
      };
      const launcher = new Launcher({ cwd, callback });

      launcher.model = model;
      launcher.title.label = 'Launcher';
      launcher.title.iconClass = 'jp-LauncherIcon';

      let main = new MainAreaWidget({ content: launcher });

      // If there are any other widgets open, remove the launcher close icon.
      main.title.closable = !!toArray(shell.widgets('main')).length;
      main.id = id;

      shell.addToMainArea(main, { activate: args['activate'] as boolean });

      shell.layoutModified.connect(() => {
        // If there is only a launcher open, remove the close icon.
        main.title.closable = toArray(shell.widgets('main')).length > 1;
      }, main);

      return main;
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
