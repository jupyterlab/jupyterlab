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
 * The keyboard shortcuts page extension.
 */
export
const keyboardShortcutsExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.keyboardShortcuts',
  activate: activateKeyBoardShortcuts,
  autoStart: true,
  requires: [ICommandPalette]
};


function activateKeyBoardShortcuts(app: JupyterLab, palette: ICommandPalette): void {
  let widget = new Widget();
  widget.id = 'keyboard-shortcuts-jupyterlab';
  widget.title.label = 'Keyboard Shortcuts';
  widget.title.closable = true;
  widget.node.innerHTML = html;
  widget.node.style.overflowY = 'auto';

  let command = 'keyboard-shortcuts-jupyterlab:show';
  app.commands.addCommand(command, {
    label: 'Keyboard Shortcuts',
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
