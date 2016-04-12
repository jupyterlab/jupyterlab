// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  AbstractFileHandler
} from './handler';


/**
 * A registry of file handlers.
 */
export
class FileHandlerRegistry {
  /**
   * Register a file handler.
   */
  add(handler: AbstractFileHandler<Widget>): void {
    this._handlers.push(handler);
  }

  /**
   * Register a default file handler.
   */
  addDefault(handler: AbstractFileHandler<Widget>): void {
    if (this._default) {
      throw Error('Default handler already registered');
    }
    this.add(handler);
    this._default = handler;
  }

  /**
   * Add a file creator.
   */
  addCreator(name: string, handler: (path: string) => Promise<IContentsModel>): void {
    this._creators[name] = handler;
  }

  /**
   * Get a list of file creators.
   */
  listCreators(): string[] {
    return Object.keys(this._creators);
  }

  /**
   * Create a new file.
   */
  createNew(name: string, path: string): Promise<IContentsModel> {
    let creator = this._creators[name];
    if (creator) {
      return creator(path);
    }
    return Promise.reject(new Error(`No handler named ${name}`));
  }

  /**
   * Test whether a model can be opened.
   */
  canOpen(model: IContentsModel): boolean {
    let handler = this.findHandler(model);
    return handler !== void 0;
  }

  /**
   * Open a contents model by name.
   */
  open(model: IContentsModel): Widget {
    let handler = this.findHandler(model);
    if (handler === void 0) {
      return;
    }
    handler.open(model);
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath: string): boolean {
    for (let h of this._handlers) {
      if (h.findByPath(oldPath)) {
        return h.rename(oldPath, newPath);
      }
    }
    return false;
  }

  /**
   * Save a file.
   */
  save(model: IContentsModel): Promise<IContentsModel> {
    for (let h of this._handlers) {
      let w = h.findByPath(model.path);
      if (w !== void 0) {
        return h.save(w);
      }
    }
  }

  /**
   * Revert a file.
   */
  revert(model: IContentsModel): Promise<IContentsModel> {
    for (let h of this._handlers) {
      let w = h.findByPath(model.path);
      if (w !== void 0) {
        return h.revert(w);
      }
    }
  }

  /**
   * Close a file.
   */
  close(model: IContentsModel): Promise<boolean> {
    for (let h of this._handlers) {
      let w = h.findByPath(model.path);
      if (w !== void 0) {
        return h.close(w);
      }
    }
  }

  /**
   * Find the appropriate handler given a model.
   */
  protected findHandler(model: IContentsModel): AbstractFileHandler<Widget> {
    if (model.type === 'directory' || this._handlers.length === 0) {
      return;
    }
    let path = model.path;
    let ext = '.' + path.split('.').pop();
    let handlers: AbstractFileHandler<Widget>[] = [];
    // Look for matching file extensions.
    for (let h of this._handlers) {
      if (h.fileExtensions.indexOf(ext) !== -1) handlers.push(h);
    }
    // If there was only one match, use it.
    if (handlers.length === 1) {
      return handlers[0];
    }

    // If there were no matches, use default handler.
    if (handlers.length === 0) {
      if (this._default) {
        return this._default;
      }
      throw new Error(`Could not open file '${path}'`);
    }

    // There are more than one possible handlers.
    // TODO: Ask the user to choose one.
    return handlers[0];
  }

  private _handlers: AbstractFileHandler<Widget>[] = [];
  private _default: AbstractFileHandler<Widget> = null;
  private _creators: { [key: string]: (path: string) => Promise<IContentsModel> } = Object.create(null);
}
