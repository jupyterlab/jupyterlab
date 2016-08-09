// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphor/lib/ui/application';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  ApplicationShell
} from './shell';


/**
 * The type for all JupyterLab plugins.
 */
export
type JupyterLabPlugin<T> = Application.IPlugin<JupyterLab, T>;


/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export
class JupyterLab extends Application<ApplicationShell> {
  constructor() {
    super();
    this._palette = Private.createCommandPalette(this);
  }

  /**
   * The command palette instance of the JupyterLab application.
   */
  get palette(): CommandPalette {
    return this._palette;
  }

  /**
   * Create the application shell for the JupyterLab application.
   */
  protected createShell(): ApplicationShell {
    return new ApplicationShell();
  }

  private _palette: CommandPalette = null;
}


/**
 * A namespace for `JupyterLab` private data.
 */
namespace Private {
  /**
   * Create a command palette and register its commands.
   */
  export
  function createCommandPalette(app: JupyterLab): CommandPalette {
    const { commands, keymap } = app;
    const palette = new CommandPalette({ commands, keymap });

    palette.id = 'command-palette';
    palette.title.label = 'Commands';

    app.commands.addCommand('command-palette:activate', {
      execute: () => {
        app.shell.activateLeft(palette.id);
        app.palette.inputNode.focus();
        app.palette.inputNode.select();
      },
      label: 'Activate Command Palette'
    });
    app.commands.addCommand('command-palette:hide', {
      execute: () => {
        if (!app.palette.isHidden) {
          app.shell.collapseLeft();
        }
      },
      label: 'Hide Command Palette'
    });
    app.commands.addCommand('command-palette:toggle', {
      execute: () => {
        if (app.palette.isHidden) {
          app.commands.execute('command-palette:activate', null);
        } else {
          app.commands.execute('command-palette:hide', null);
        }
      },
      label: 'Toggle Command Palette'
    });

    app.shell.addToLeftArea(palette);

    return palette;
  }
}
