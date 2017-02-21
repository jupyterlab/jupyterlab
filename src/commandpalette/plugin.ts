/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  CommandPalette
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  CommandIDs, ICommandPalette, IPaletteItem
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
const plugin: JupyterLabPlugin<ICommandPalette> = {
  activate,
  id: 'jupyter.services.commandpalette',
  provides: ICommandPalette,
  requires: [IInstanceRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the command palette.
 */
function activate(app: JupyterLab, restorer: IInstanceRestorer): ICommandPalette {
  const { commands, keymap } = app;
  const palette = new CommandPalette({ commands, keymap });

  // Let the application restorer track the command palette for restoration of
  // application state (e.g. setting the command palette as the current side bar
  // widget).
  restorer.add(palette, 'command-palette');

  palette.id = 'command-palette';
  palette.title.label = 'Commands';

  app.commands.addCommand(CommandIDs.activate, {
    execute: () => { app.shell.activateLeft(palette.id); },
    label: 'Activate Command Palette'
  });

  app.commands.addCommand(CommandIDs.hide, {
    execute: () => {
      if (!palette.isHidden) {
        app.shell.collapseLeft();
      }
    },
    label: 'Hide Command Palette'
  });

  app.commands.addCommand(CommandIDs.toggle, {
    execute: () => {
      if (palette.isHidden) {
        return app.commands.execute(CommandIDs.activate, void 0);
      }
      return app.commands.execute(CommandIDs.hide, void 0);
    },
    label: 'Toggle Command Palette'
  });

  palette.inputNode.placeholder = 'SEARCH';

  app.shell.addToLeftArea(palette);

  return new Palette(palette);
}
