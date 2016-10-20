// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IPathTracker
} from '../filebrowser';

import {
  IServiceManager
} from '../services';

import {
  ILauncher, ILauncherItem, LauncherModel, LauncherWidget
} from './';


/**
 * A service providing an interface to the the launcher.
 */
export
const launcherProvider: JupyterLabPlugin<ILauncher> = {
  id: 'jupyter.services.launcher',
  requires: [IServiceManager, IPathTracker, ICommandPalette],
  provides: ILauncher,
  activate: activateLauncher,
  autoStart: true
};


/**
 * Activate the launcher.
 */
function activateLauncher(app: JupyterLab, services: IServiceManager, pathTracker: IPathTracker, palette: ICommandPalette): ILauncher {
  let model = new LauncherModel({ commands: app.commands });

  // Set launcher path and track the path as it changes.
  model.path = pathTracker.path;
  pathTracker.pathChanged.connect(() => { model.path = pathTracker.path; });

  let widget = new LauncherWidget();

  widget.model = model;
  widget.id = 'launcher';
  widget.title.label = 'Launcher';

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
      name: 'Terminal',
      command: 'terminal:create-new'
    },
    {
      name: 'Text Editor',
      command: 'file-operations:new-text-file'
    }
  ];

  // Note: we do not retain a handle on the items added by default, which
  // means we have to way of removing them after the fact.
  defaults.forEach(options => { model.add(options); });

  app.commands.addCommand('launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToLeftArea(widget);
      }
      app.shell.activateLeft(widget.id);
    }
  });
  palette.addItem({ command: 'launcher:show', category: 'Help' });

  app.shell.addToLeftArea(widget);

  return model;
}
