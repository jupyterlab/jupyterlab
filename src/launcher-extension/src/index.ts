// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandLinker, ICommandPalette, ILayoutRestorer
} from '@jupyterlab/apputils';

import {
  IPathTracker
} from '@jupyterlab/filebrowser';

import {
  ILauncher, ILauncherItem, LauncherModel, LauncherWidget
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
    IPathTracker,
    ICommandPalette,
    ICommandLinker,
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
function activate(app: JupyterLab, services: IServiceManager, pathTracker: IPathTracker, palette: ICommandPalette, linker: ICommandLinker, restorer: ILayoutRestorer): ILauncher {
  const { commands, shell } = app;

  let model = new LauncherModel();

  // Set launcher path and track the path as it changes.
  model.path = pathTracker.path;
  pathTracker.pathChanged.connect(() => { model.path = pathTracker.path; });

  let widget = new LauncherWidget({ linker });

  widget.model = model;
  widget.id = 'launcher';
  widget.title.label = 'Launcher';

  // Let the application restorer track the launcher for restoration of
  // application state (e.g. setting the launcher as the current side bar
  // widget).
  restorer.add(widget, 'launcher');

  // Hardcoded defaults.
  let defaults: ILauncherItem[] = [
    {
      name: 'Notebook',
      command: 'file-operations:new-notebook'
    },
    {
      name: 'Code Console',
      command: 'console:create'
    },
    {
      name: 'Text Editor',
      command: 'file-operations:new-text-file'
    }
  ];

  if (services.terminals.isAvailable()) {
    defaults.push({
      name: 'Terminal',
      command: 'terminal:create-new'
    });
  }

  // Note: we do not retain a handle on the items added by default, which
  // means we have to way of removing them after the fact.
  defaults.forEach(options => { model.add(options); });

  commands.addCommand(CommandIDs.show, {
    label: 'Show Launcher',
    execute: () => {
      if (!widget.isAttached) {
        shell.addToLeftArea(widget);
      }
      shell.activateById(widget.id);
    }
  });
  palette.addItem({ command: CommandIDs.show, category: 'Help' });

  shell.addToLeftArea(widget);

  return model;
}
