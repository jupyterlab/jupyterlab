/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  DisposableDelegate, IDisposable
} from 'phosphor/lib/core/disposable';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';


/* tslint:disable */
/**
 * The command palette token.
 */
export
const ICommandPalette = new Token<ICommandPalette>('jupyter.services.commandpalette');
/* tslint:enable */


export
interface IPaletteItem extends CommandPalette.IItemOptions {}


export
interface ICommandPalette {
  /**
   * The placeholder text of the command palette's search input.
   */
  placeholder: string;

  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item(s).
   *
   * @returns A disposable that will remove the item from the palette.
   */
  addItem(options: IPaletteItem): IDisposable;

  /**
   * Focus the search input node of the command palette.
   */
  focus(): void;
}


/**
 * A thin wrapper around the `CommandPalette` class to conform with the
 * JupyterLab interface for the application-wide command palette.
 */
export
class Palette {
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
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item(s).
   *
   * @returns A disposable that will remove the item from the palette.
   */
  addItem(options: IPaletteItem): IDisposable {
    let item = this._palette.addItem(options as CommandPalette.IItemOptions);
    return new DisposableDelegate(() => this._palette.removeItem(item));
  }

  /**
   * Focus the search input node of the command palette.
   */
  focus(): void {
    this._palette.inputNode.focus();
    this._palette.inputNode.select();
  }

  private _palette: CommandPalette = null;
}
