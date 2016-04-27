// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel
} from 'jupyter-js-services';

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
 * A registry of file handlers.
 */
export
class FileHandlerRegistry {
  /**
   * A signal emitted when a file is opened.
   */
  get opened(): ISignal<FileHandlerRegistry, Widget> {
    return Private.openedSignal.bind(this);
  }

  /**
   * A signal emitted when a file has finished opening.
   */
  get finished(): ISignal<FileHandlerRegistry, Widget> {
    return Private.finishedSignal.bind(this);
  }

  /**
   * A signal emitted when a file is created.
   */
  get created(): ISignal<FileHandlerRegistry, IContentsModel> {
    return Private.createdSignal.bind(this);
  }

  /**
   * Register a file handler.
   */
  addHandler(handler: AbstractFileHandler<Widget>): void {
    this._handlers.push(handler);
    handler.finished.connect((handler, widget) => {
      this.finished.emit(widget);
    });
  }

  /**
   * Register a default file handler.
   */
  addDefaultHandler(handler: AbstractFileHandler<Widget>): void {
    if (this._default) {
      throw Error('Default handler already registered');
    }
    this.addHandler(handler);
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
  createNew(name: string, path: string, host?: HTMLElement): Promise<IContentsModel> {
    let creator = this._creators[name];
    if (creator) {
      return creator(path, host).then(model => {
        this.created.emit(model);
        return model;
      });
    }
    return Promise.reject(new Error(`No handler named ${name}`));
  }

  /**
   * Open a file by path.
   */
  open(path: string): Widget {
    let handler = this.findHandler(path);
    if (handler === void 0) {
      return;
    }
    let widget = handler.open(path);
    this.opened.emit(widget);
    return widget;
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath?: string): boolean {
    for (let h of this._handlers) {
      if (h.findWidget(oldPath)) {
        return h.rename(oldPath, newPath);
      }
    }
    return false;
  }

  /**
   * Save a file.
   */
  save(path: string): Promise<IContentsModel> {
    for (let h of this._handlers) {
      let w = h.findWidget(path);
      if (w !== void 0) {
        return h.save(path);
      }
    }
    let msg = `No open widget for path '${path}'`;
    return Promise.reject(new Error(msg));
  }

  /**
   * Revert a file.
   */
  revert(path: string): Promise<IContentsModel> {
    for (let h of this._handlers) {
      let w = h.findWidget(path);
      if (w !== void 0) {
        return h.revert(path);
      }
    }
    let msg = `No open widget for path '${path}'`;
    return Promise.reject(new Error(msg));
  }

  /**
   * Close a file.
   */
  close(path: string): Promise<boolean> {
    for (let h of this._handlers) {
      let w = h.findWidget(path);
      if (w !== void 0) {
        return h.close(path);
      }
    }
    let msg = `No open widget for path '${path}'`;
    return Promise.reject(new Error(msg));
  }

  /**
   * Close all files.
   */
  closeAll(): Promise<void> {
    let promises: Promise<void>[] = [];
    for (let h of this._handlers) {
      promises.push(h.closeAll());
    }
    return Promise.all(promises).then(() => { return void 0; });
  }

  /**
   * Find the path for a given widget.
   */
  findPath(widget: Widget): string {
    for (let h of this._handlers) {
      let path = h.findPath(widget);
      if (path) {
        return path;
      }
    }
  }

  /**
   * Find the widget for a given file.
   */
  findWidget(path: string): Widget {
    for (let h of this._handlers) {
      let w = h.findWidget(path);
      if (w !== void 0) {
        return w;
      }
    }
  }

  /**
   * Find the appropriate handler given a path.
   */
  protected findHandler(path: string): AbstractFileHandler<Widget> {
    if (this._handlers.length === 0) {
      return;
    }
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
      return;
    }

    // There are more than one possible handlers.
    // TODO: Ask the user to choose one.
    return handlers[0];
  }

  private _handlers: AbstractFileHandler<Widget>[] = [];
  private _default: AbstractFileHandler<Widget> = null;
  private _creators: { [key: string]: (path: string, host?: HTMLElement) => Promise<IContentsModel> } = Object.create(null);
}


/**
 * A private namespace for FileHandlerRegistry data.
 */
namespace Private {
  /**
   * A signal emitted when a file is opened.
   */
  export
  const openedSignal = new Signal<FileHandlerRegistry, Widget>();

  /**
   * A signal emitted when a file is finished opening.
   */
  export
  const finishedSignal = new Signal<FileHandlerRegistry, Widget>();

  /**
   * A signal emitted when a file is created.
   */
  export
  const createdSignal = new Signal<FileHandlerRegistry, IContentsModel>();
}
