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
interface ICommandPalette {
  /**
   * Get the command palette input node.
   *
   * #### Notes
   * This is a read-only property.
   */
  inputNode: HTMLInputElement;

  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item.
   *
   * @returns A disposable that will remove the item from the palette.
   */
  add(options: CommandPalette.IItemOptions | CommandPalette.IItemOptions[]): IDisposable;
}


/**
 * A thin wrapper around the `CommandPalette` class to conform with the
 * JupyterLab interface for the application-wide command palette.
 */
export
class Palette extends CommandPalette {
  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item.
   *
   * @returns A disposable that will remove the item from the palette.
   */
  add(options: CommandPalette.IItemOptions | CommandPalette.IItemOptions[]): IDisposable {
    if (Array.isArray(options)) {
      let items = options.map(item => super.addItem(item));
      return new DisposableDelegate(() => {
        items.forEach(item => super.removeItem(item));
      });
    }

    let item = super.addItem(options as CommandPalette.IItemOptions);
    return new DisposableDelegate(() => this.removeItem(item));
  }
}
