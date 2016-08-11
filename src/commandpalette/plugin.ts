/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  Palette, ICommandPalette
} from './';


/**
 * The default commmand palette extension.
 */
export
const commandPaletteProvider: JupyterLabPlugin<ICommandPalette> = {
  id: 'jupyter.services.commandpalette',
  provides: ICommandPalette,
  activate: activateCommandPalette,
  autoStart: true
};


/**
 * Activate the command palette.
 */
function activateCommandPalette(app: JupyterLab): ICommandPalette {
  const { commands, keymap } = app;
  const palette = new CommandPalette({ commands, keymap });

  palette.id = 'command-palette';
  palette.title.label = 'Commands';

  /**
   * Activate the command palette within the app shell (used as a command).
   */
  function activatePalette(): void {
    app.shell.activateLeft(palette.id);
    palette.inputNode.focus();
    palette.inputNode.select();
  }

  /**
   * Hide the command palette within the app shell (used as a command).
   */
  function hidePalette(): void {
    if (!palette.isHidden) {
      app.shell.collapseLeft();
    }
  }

  /**
   * Toggle the command palette within the app shell (used as a command).
   */
  function togglePalette(): void {
    if (palette.isHidden) {
      activatePalette();
    } else {
      hidePalette();
    }
  }

  app.commands.addCommand('command-palette:activate', {
    execute: activatePalette,
    label: 'Activate Command Palette'
  });
  app.commands.addCommand('command-palette:hide', {
    execute: hidePalette,
    label: 'Hide Command Palette'
  });
  app.commands.addCommand('command-palette:toggle', {
    execute: togglePalette,
    label: 'Toggle Command Palette'
  });

  app.shell.addToLeftArea(palette);

  return new Palette(palette);
}
