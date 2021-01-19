/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

import { Message } from '@lumino/messaging';

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

/**
 * Wrap the command palette in a modal to make it more usable.
 */
export class ModalCommandPalette extends Panel {
  constructor(options: ModalCommandPalette.IOptions) {
    super();
    this.addClass('jp-ModalCommandPalette');
    this.id = 'modal-command-palette';
    this._commandPalette = options.commandPalette;
    this.addWidget(this._commandPalette);
    this._commandPalette.commands.commandExecuted.connect(() => {
      if (this.isAttached && this.isVisible) {
        this.hideAndReset();
      }
    });
    this.hideAndReset();
  }

  get palette(): CommandPalette {
    return this._commandPalette;
  }

  set palette(value: CommandPalette) {
    this._commandPalette = value;
    this.addWidget(value);
    this.hideAndReset();
  }

  attach(): void {
    Widget.attach(this, document.body);
  }

  detach(): void {
    Widget.detach(this);
  }

  /**
   * Hide the modal command palette and reset its search.
   */
  hideAndReset(): void {
    this.hide();
    this._commandPalette.inputNode.value = '';
    this._commandPalette.refresh();
  }

  /**
   * Handle incoming events.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
      case 'focus':
        // if the focus shifted outside of this DOM element, hide and reset.
        if (!this.node.contains(event.target as HTMLElement)) {
          event.stopPropagation();
          this.hideAndReset();
        }
        break;
      case 'contextmenu':
        event.preventDefault();
        event.stopPropagation();
        break;
      default:
        break;
    }
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('keydown', this, true);
    this.node.addEventListener('contextmenu', this, true);
  }

  /**
   *  A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this, true);
    this.node.removeEventListener('contextmenu', this, true);
  }

  protected onBeforeHide(msg: Message): void {
    document.removeEventListener('focus', this, true);
  }

  protected onAfterShow(msg: Message): void {
    document.addEventListener('focus', this, true);
  }

  /**
   * A message handler invoked on an `'activate-request'` message.
   */
  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      this.show();
      this._commandPalette.activate();
    }
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    // Check for escape key
    switch (event.keyCode) {
      case 27: // Escape.
        event.stopPropagation();
        event.preventDefault();
        this.hideAndReset();
        break;
      default:
        break;
    }
  }

  private _commandPalette: CommandPalette;
}

export namespace ModalCommandPalette {
  export interface IOptions {
    commandPalette: CommandPalette;
  }
}
