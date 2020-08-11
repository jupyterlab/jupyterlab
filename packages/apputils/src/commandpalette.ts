/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { CommandPalette, Widget, Panel } from '@lumino/widgets';

/* tslint:disable */
/**
 * The command palette token.
 */
export const ICommandPalette = new Token<ICommandPalette>(
  '@jupyterlab/apputils:ICommandPalette'
);
/* tslint:enable */

/**
 * The options for creating a command palette item.
 */
export interface IPaletteItem extends CommandPalette.IItemOptions {}

/**
 * The interface for a Jupyter Lab command palette.
 */
export interface ICommandPalette {
  /**
   * The placeholder text of the command palette's search input.
   */
  placeholder: string;

  /**
   * Activate the command palette for user input.
   */
  activate(): void;

  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item.
   *
   * @returns A disposable that will remove the item from the palette.
   */
  addItem(options: IPaletteItem): IDisposable;
}

export class ModalCommandPalette extends Panel {
  constructor(options: ModalCommandPalette.IOptions) {
    super();
    this.addClass('jp-ModalCommandPalette');
    this.id = 'modal-command-palette';
    this._host = document.body;
    this._commandPalette = options.commandPalette;
    this._commandPalette.addClass('jp-ModalCommandPalette-command-palette');
    this.addWidget(this._commandPalette);
    Widget.attach(this, this._host);
    this.hide();
  }

  private _host: HTMLElement;
  private _commandPalette: CommandPalette;
}

export namespace ModalCommandPalette {
  export interface IOptions {
    commandPalette: CommandPalette;
  }
}
