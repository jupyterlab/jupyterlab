/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Token
} from 'phosphor/lib/core/token';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';


/* tslint:disable */
/**
 * The command palette token.
 */
export
const ICommandPalette = new Token<ICommandPalette>('jupyter.services.commandpalette');
/* tslint:enable */


/**
 * The default commmand palette extension.
 */
export
const commandPaletteExtension: JupyterLabPlugin<ICommandPalette> = {
  id: 'jupyter.services.commandpalette',
  activate: activateCommandPalette,
  autoStart: true
};

export
interface ICommandPalette extends CommandPalette {}


/**
 * Activate the command palette.
 */
function activateCommandPalette(app: JupyterLab): ICommandPalette {
  const { commands, keymap } = app;
  const palette = new CommandPalette({ commands, keymap });

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

  palette.id = 'command-palette';
  palette.title.label = 'Commands';

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

  return palette;
}
