/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/


import {
  DisposableDelegate, IDisposable
} from 'phosphor/lib/core/disposable';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette, IPaletteItem
} from './';


/**
 * A thin wrapper around the `CommandPalette` class to conform with the
 * JupyterLab interface for the application-wide command palette.
 */
class Palette implements ICommandPalette {
  /**
   * Create a palette instance.
   */
  constructor(palette: CommandPalette) {
    this._palette = palette;
  }

  /**
   * The placeholder text of the command palette's search input.
   */
  set placeholder(placeholder: string) {
    this._palette.inputNode.placeholder = placeholder;
  }
  get placeholder(): string {
    return this._palette.inputNode.placeholder;
  }

  /**
   * Activate the command palette for user input.
   */
  activate(): void {
    this._palette.activate();
  }

  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item.
   *
   * @returns A disposable that will remove the item from the palette.
   */
  addItem(options: IPaletteItem): IDisposable {
    let item = this._palette.addItem(options as CommandPalette.IItemOptions);
    return new DisposableDelegate(() => this._palette.removeItem(item));
  }

  private _palette: CommandPalette = null;
}


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
    palette.activate();
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
