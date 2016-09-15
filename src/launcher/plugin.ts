// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

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

/**
 * The landing page extension.
 */
export
const launcherExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.launcher',
  requires: [IServiceManager, IPathTracker, ICommandPalette],
  activate: activateLauncher,
  autoStart: true
};


function activateLauncher(app: JupyterLab, services: IServiceManager, pathTracker: IPathTracker, palette: ICommandPalette): void {
  let widget = new Widget();
  widget.id = 'landing-jupyterlab';
  widget.title.label = 'Launcher';
  widget.addClass('jp-Launcher');

  let dialog = document.createElement('div');
  dialog.className = 'jp-Launcher-dialog';
  widget.node.appendChild(dialog);
  
  let path = document.createElement('span');
  path.textContent = 'home';
  pathTracker.pathChanged.connect(() => {
    if (pathTracker.path.length > 0) {
      path.textContent = 'home > ';
      let path2 = pathTracker.path;
      path2 = path2.replace('/', ' > ');
      path.textContent += path2;
    } else {
      path.textContent = 'home';
    }
  });
  path.className = 'jp-Launcher-path';

  let cwd = document.createElement('div');
  cwd.className = 'jp-Launcher-cwd';
  
  let folderImage = document.createElement('span');
  folderImage.className = 'jp-Launcher-folder';


  cwd.appendChild(folderImage);
  cwd.appendChild(path);
  dialog.appendChild(cwd);

  let body = document.createElement('div');
  body.className = 'jp-Launcher-body';
  dialog.appendChild(body);

  for (let name of ['Notebook', 'Notebook2', 'Terminal', 'Text Editor', 'Notebook', 'Console', 'Terminal', 'Text Editor']) {
    let column = document.createElement('div');
    body.appendChild(column);
    column.className = 'jp-Launcher-column';

    let img = document.createElement('span');
    let imgName = name.replace(' ', '');
    img.className = `jp-Image${imgName} jp-Launcher-image`;

    column.appendChild(img);

    let text = document.createElement('span');
    text.textContent = name;
    text.className = 'jp-Launcher-text';
    column.appendChild(text);
  }

  let img = body.getElementsByClassName('jp-ImageNotebook')[0];
  img.addEventListener('click', () => {
    app.commands.execute('file-operations:new-notebook', void 0);
  });

  img = body.getElementsByClassName('jp-ImageConsole')[0];
  img.addEventListener('click', () => {
    app.commands.execute(`console:create-${services.kernelspecs.default}`, void 0);
  });

  img = body.getElementsByClassName('jp-ImageTextEditor')[0];
  img.addEventListener('click', () => {
    app.commands.execute('file-operations:new-text-file', void 0);
  });

  img = body.getElementsByClassName('jp-ImageTerminal')[0];
  img.addEventListener('click', () => {
    app.commands.execute('terminal:create-new', void 0);
  });





  app.commands.addCommand('jupyterlab-launcher:show', {
    label: 'Show Launcher',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToLeftArea(widget);
      } else {
        app.shell.activateMain(widget.id);
      }
    }
  });

  palette.addItem({
    command: 'jupyterlab-launcher:show',
    category: 'Help'
  });

  app.shell.addToLeftArea(widget);
}
