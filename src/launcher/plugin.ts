// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

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
  ILauncher, LauncherModel, LauncherWidget
} from './';


/**
 * A service providing an interface to the the launcher.
 */
export
const launcherExtension: JupyterLabPlugin<ILauncher> = {
  id: 'jupyter.extensions.launcher',
  requires: [IServiceManager, IPathTracker, ICommandPalette],
  provides: ILauncher,
  activate: activateLauncher,
  autoStart: true
};


/**
 * Activate the launcher.
 */
function activateLauncher(app: JupyterLab, services: IServiceManager, pathTracker: IPathTracker, palette: ICommandPalette): ILauncher {
  let launcherModel = new LauncherModel();

  launcherModel.setDir(pathTracker.path); // change to = 
  launcherModel.setApp(app); // change to = 

  pathTracker.pathChanged.connect(() => {
    launcherModel.setDir(pathTracker.path); // change to = 
  });

  let launcherWidget = new LauncherWidget();

  launcherWidget.model = launcherModel;
  launcherWidget.id = 'landing-jupyterlab-widget';
  launcherWidget.title.label = 'Launcher';

  // Hardcoded defaults.
  let names = [
    'Notebook',
    'Console',
    'Terminal',
    'Text Editor',
  ];

  let actions = [
    'file-operations:new-notebook',
    `console:create-${services.kernelspecs.default}`,
    'terminal:create-new',
    'file-operations:new-text-file',
  ];

  app.commands.addCommand('jupyterlab-launcher:add-item', {
    label: 'Add Launcher Item',
    execute: (args) => {
      launcherModel.add(args['name'] as string, args['action'] as string,
                        args['args'] as JSONObject, args['imgName'] as string);
    }
  });

  for (let i in names) {
    // Note: we do not retain a handle on the items added by default, which
    // means we have to way of removing them after the fact.
    launcherModel.add(names[i], actions[i]);
  }


  app.commands.addCommand('jupyterlab-launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!launcherWidget.isAttached) {
        app.shell.addToLeftArea(launcherWidget);
      }
      app.shell.activateLeft(launcherWidget.id);
    }
  });

  palette.addItem({
    command: 'jupyterlab-launcher:show',
    category: 'Help'
  });

  app.shell.addToLeftArea(launcherWidget);
  return launcherModel;
}

