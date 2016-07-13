// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager
} from 'jupyter-js-services';

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
  requires: [ServiceManager],
  activate: activateLanding
};


function activateLanding(app: Application, services: ServiceManager): void {
  let widget = new Widget();
  widget.id = 'landing-jupyterlab';
  widget.title.text = 'Launcher';
  widget.title.closable = true;
  widget.addClass('jp-Landing');

  let dialog = document.createElement('div');
  dialog.className = 'jp-Landing-dialog';
  widget.node.appendChild(dialog);

  let title = document.createElement('span');
  title.textContent = 'Welcome to';
  title.className = 'jp-Landing-title';
  dialog.appendChild(title);

  let logo = document.createElement('span');
  logo.className = 'jp-ImageJupyterLab jp-Landing-logo';
  dialog.appendChild(logo);

  let header = document.createElement('span');
  header.textContent = 'Start a new activity:';
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

  let tour = document.createElement('span')
  tour.textContent = 'Take a tour';
  tour.className = 'jp-Landing-tour';
  dialog.appendChild(tour);
  tour.addEventListener('click', () => {
    app.commands.execute('about-jupyterlab:show');
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
