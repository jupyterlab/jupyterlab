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
  html
} from './html';


/**
 * The about page extension.
 */
export
const aboutExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.about',
  activate: activateAbout,
  autoStart: true,
  requires: [ICommandPalette]
};


function activateAbout(app: JupyterLab, palette: ICommandPalette): void {
  let widget = new Widget();
  widget.id = 'about-jupyterlab';
  widget.title.label = 'About';
  widget.title.closable = true;
  widget.node.innerHTML = html;
  widget.node.style.overflowY = 'auto';

  let command = 'about-jupyterlab:show';
  app.commands.addCommand(command, {
    label: 'About JupyterLab',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      } else {
        app.shell.activateMain(widget.id);
      }
    }
  });
  palette.addItem({ command, category: 'Help' });
}
