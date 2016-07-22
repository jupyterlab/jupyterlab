// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager
} from 'jupyter-js-services';

import {
  PathTracker
} from '../filebrowser/plugin';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';

/**
 * The landing page extension.
 */
export
const landingExtension = {
  id: 'jupyter.extensions.landing',
  requires: [ServiceManager, PathTracker],
  activate: activateLanding
};


function activateLanding(app: Application, services: ServiceManager, pathTracker: PathTracker): void {
  let widget = new Widget();
  widget.id = 'landing-jupyterlab';
  widget.title.text = 'Launcher';
  widget.title.closable = true;
  widget.addClass('jp-Landing');

  let dialog = document.createElement('div');
  dialog.className = 'jp-Landing-dialog';
  widget.node.appendChild(dialog);

  let logo = document.createElement('span');
  logo.className = 'jp-ImageJupyterLab jp-Landing-logo';
  dialog.appendChild(logo);

  let previewMessages = ["super alpha preview", "very alpha preview", "extremely alpha preview", "exceedingly alpha preview", "alpha alpha preview"];
  let ranNum = Math.floor(Math.random()*5);
  let subtitle = document.createElement('span');
  subtitle.textContent = previewMessages[ranNum];
  subtitle.className = 'jp-Landing-subtitle';
  dialog.appendChild(subtitle);

  let tour = document.createElement('span')
  tour.className = 'jp-Landing-tour';
  dialog.appendChild(tour);
  tour.addEventListener('click', () => {
    app.commands.execute('about-jupyterlab:show');
  });

  let header = document.createElement('span');
  header.textContent = 'Start a new activity';
  header.className = 'jp-Landing-header';
  dialog.appendChild(header);

  let body = document.createElement('div');
  body.className = 'jp-Landing-body';
  dialog.appendChild(body);

  for (let name of ['Notebook', 'Console', 'Terminal', 'Text Editor']) {
    let column = document.createElement('div');
    body.appendChild(column);
    column.className = 'jp-Landing-column';

    let img = document.createElement('span');
    let imgName = name.replace(' ', '');
    img.className = `jp-Image${imgName} jp-Landing-image`;

    column.appendChild(img);

    let text = document.createElement('span');
    text.textContent = name;
    text.className = 'jp-Landing-text';
    column.appendChild(text);
  }

  let img = body.getElementsByClassName('jp-ImageNotebook')[0];
  img.addEventListener('click', () => {
    app.commands.execute('file-operations:new-notebook');
  });

  img = body.getElementsByClassName('jp-ImageConsole')[0];
  img.addEventListener('click', () => {
    app.commands.execute(`console:create-${services.kernelspecs.default}`);
  });

  img = body.getElementsByClassName('jp-ImageTextEditor')[0];
  img.addEventListener('click', () => {
    app.commands.execute('file-operations:new-text-file');
  });

  img = body.getElementsByClassName('jp-ImageTerminal')[0];
  img.addEventListener('click', () => {
    app.commands.execute('terminal:create-new');
  });

  let cwd = document.createElement('div');
  cwd.className = 'jp-Landing-cwd';


  let folderImage = document.createElement('span');
  folderImage.className = 'jp-Landing-folder';
  folderImage.style.height = "12px";
  folderImage.style.width = "12px";

  let path = document.createElement('span');
  path.textContent = 'home'
  pathTracker.pathChanged.connect(() => {
    if (pathTracker.path.length > 0) {
      path.textContent = 'home > '
      var path2 = pathTracker.path;
      path2 = path2.replace("/"," > ");
      path.textContent += path2;
    } else {
      path.textContent = "home";
    }
  });
  path.className = 'jp-Landing-path';

  cwd.appendChild(folderImage);
  cwd.appendChild(path);
  dialog.appendChild(cwd);

  app.commands.add([{
    id: 'jupyterlab-launcher:show',
    handler: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  }]);

  app.palette.add([{
    command: 'jupyterlab-launcher:show',
    text: 'JupyterLab Launcher',
    category: 'Help'
  }]);

  app.shell.addToMainArea(widget);
}
