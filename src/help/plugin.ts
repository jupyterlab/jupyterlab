// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IAppShell, ICommandRegistry, ICommandItem, ICommandPalette
} from 'phosphide';

import {
  Container, Lifetime
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IFrame
} from './iframe';


const HELP_CLASS = 'jp-Help';


const COMMANDS = [
  {
    text: 'Scipy Lecture Notes',
    id: 'help-doc:scipy-lecture-notes',
    url: 'http://www.scipy-lectures.org/'
  },
  {
    text: 'Numpy Reference',
    id: 'help-doc:numpy-reference',
    url: 'http://docs.scipy.org/doc/numpy/reference/'
  },
  {
    text: 'Scipy Reference',
    id: 'help-doc:scipy-reference',
    url: 'http://docs.scipy.org/doc/scipy/reference/'
  },
  {
    text: 'Notebook Tutorial',
    id: 'help-doc:notebook-tutorial',
    url: 'http://nbviewer.jupyter.org/github/jupyter/notebook/' +
      'blob/master/docs/source/examples/Notebook/Notebook Basics.ipynb'
  }
];


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve(HelpHandler).then(handler => { handler.run(); });
}


class HelpHandler {
  /**
   * The help handler dependencies.
   */
  static requires = [IAppShell, ICommandRegistry, ICommandPalette];

  static create(shell: IAppShell, registry: ICommandRegistry, palette: ICommandPalette): HelpHandler {
    return new HelpHandler(shell, registry, palette);
  }

  /**
   * Create a new help handler.
   */
  constructor(shell: IAppShell, registry: ICommandRegistry, palette: ICommandPalette) {
    this._shell = shell;
    this._palette = palette;
    this._registry = registry;
  }

  run(): void {
    this._iframe = new IFrame();
    this._iframe.addClass(HELP_CLASS);
    this._iframe.title.text = 'Help';
    this._iframe.id = 'help-doc';
    this._registerCommands();
  }

  /**
   * Register the help commands into the command registry and command palette.
   */
  private _registerCommands(): void {
    let iframe = this._iframe;
    let palette = this._palette;
    let registry = this._registry;
    let shell = this._shell;
    // Add commands to the command registry.
    let helpRegistryItems = COMMANDS.map(command => {
      return {
        id: command.id,
        handler: () => {
          if (!iframe.isAttached) {
            shell.addToRightArea(iframe, { rank: 40 });
          }
          registry.execute('appshell:activate-right', { id: iframe.id });
          iframe.loadURL(command.url);
        }
      };
    });
    registry.add(helpRegistryItems);

    // Add the commands registered above to the command palette.
    let helpPaletteItems = COMMANDS.map(command => {
      return {
        args: void 0,
        id: command.id,
        text: command.text,
        caption: `Open ${command.text}`,
        category: 'Help'
      };
    });
    palette.add(helpPaletteItems);
  }

  private _iframe: IFrame;
  private _palette: ICommandPalette;
  private _registry: ICommandRegistry;
  private _shell: IAppShell;
}
