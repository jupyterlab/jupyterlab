// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel
} from 'jupyter-js-services';

import * as arrays
 from 'phosphor-arrays';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  AbstractFileHandler
} from './handler';

/**
 * The class name added to document widgets.
 */
export
const DOCUMENT_CLASS = 'jp-Document';


/**
 * A document manager for Jupyter.
 */
export
class DocumentManager {

  /**
   * Register a file handler.
   */
  register(handler: AbstractFileHandler<Widget>): void {
    this._handlers.push(handler);
    handler.activated.connect(this._onActivated, this);
  }

  /**
   * Register a default file handler.
   */
  registerDefault(handler: AbstractFileHandler<Widget>): void {
    if (this._defaultHandler) {
      throw Error('Default handler already registered');
    }
    this.register(handler);
    this._defaultHandler = handler;
  }

  /**
   * Open a contents model and return a widget.
   */
  open(model: IContentsModel): Widget {
    if (this._handlers.length === 0) {
      return;
    }
    let path = model.path;
    let ext = '.' + path.split('.').pop();
    let handlers: AbstractFileHandler<Widget>[] = [];
    // Look for matching file extensions.
    for (let h of this._handlers) {
      if (h.fileExtensions.indexOf(ext) !== -1) handlers.push(h);
    }
    let widget: Widget;
    // If there was only one match, use it.
    if (handlers.length === 1) {
      widget = this._open(handlers[0], model);

    // If there were no matches, use default handler.
    } else if (handlers.length === 0) {
      if (this._defaultHandler) {
        widget = this._open(this._defaultHandler, model);
      } else {
        throw new Error(`Could not open file '${path}'`);
      }

    // There are more than one possible handlers.
    } else {
      // TODO: Ask the user to choose one.
      widget = this._open(handlers[0], model);
    }
    widget.addClass(DOCUMENT_CLASS);
    return widget;
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath: string): boolean {
    for (let h of this._handlers) {
      if (h.rename(oldPath, newPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Save the active document.
   *
   * returns A promise that resolves to the contents of the widget.
   */
  save(): Promise<IContentsModel>  {
    if (this._activeHandler) {
      return this._activeHandler.save();
    }
  }

  /**
   * Revert the active document.
   *
   * returns A promise that resolves to the new contents of the widget.
   */
  revert(): Promise<IContentsModel> {
    if (this._activeHandler) {
      return this._activeHandler.revert();
    }
  }

  /**
   * Close the active document.
   *
   * returns A promise that resolves with a boolean indicating whether the
      widget was closed.
   */
  close(): Promise<boolean> {
    if (this._activeHandler) {
      return this._activeHandler.close();
    }
    return Promise.resolve(false);
  }

  /**
   * Close all documents.
   */
  closeAll(): void {
    this._handlers.map(handler => handler.closeAll());
  }

  /**
   * Open a file and emit an `openRequested` signal.
   */
  private _open(handler: AbstractFileHandler<Widget>, model: IContentsModel): Widget {
    let widget = handler.open(model);
    // Clear all other active widgets.
    for (let h of this._handlers) {
      if (h !== handler) handler.deactivate();
    }
    return widget;
  }

  /**
   * A handler for handler activated signals.
   */
  private _onActivated(handler: AbstractFileHandler<Widget>) {
    this._activeHandler = handler;
    for (let h of this._handlers) {
      if (h !== handler) h.deactivate();
    }
  }

  private _handlers: AbstractFileHandler<Widget>[] = [];
  private _defaultHandler: AbstractFileHandler<Widget> = null;
  private _activeHandler: AbstractFileHandler<Widget> = null;
}
