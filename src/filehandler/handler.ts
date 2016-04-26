// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IContentsManager, IContentsOpts
} from 'jupyter-js-services';

import {
  IMessageFilter, IMessageHandler, Message, installMessageFilter
} from 'phosphor-messaging';

import {
  Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  showDialog
} from '../dialog';


/**
 * The class name added to a dirty documents.
 */
const DIRTY_CLASS = 'jp-mod-dirty';


/**
 * An implementation of a file handler.
 */
export
abstract class AbstractFileHandler<T extends Widget> implements IMessageFilter {
  /**
   * Construct a new source file handler.
   *
   * @param manager - The contents manager used to save/load files.
   */
  constructor(manager: IContentsManager) {
    this._manager = manager;
  }

  /**
   * A signal emitted when a file opens.
   */
  get opened(): ISignal<AbstractFileHandler<T>, T> {
    return Private.openedSignal.bind(this);
  }

  /**
   * A signal emitted when a file finishes opening.
   */
  get finished(): ISignal<AbstractFileHandler<T>, T> {
    return Private.finishedSignal.bind(this);
  }

  /**
   * Get the list of file extensions explicitly supported by the handler.
   */
  get fileExtensions(): string[] {
    return [];
  }

  /**
   * Get the contents manager used by the handler.
   */
  get manager(): IContentsManager {
    return this._manager;
  }

  /**
   * Find a widget given a path.
   */
  findWidget(path: string): T {
    for (let w of this._widgets) {
      let p = this._getPath(w);
      if (p === path) {
        return w;
      }
    }
  }

  /**
   * Find a path given a widget.
   */
  findPath(widget: T): string {
    return Private.pathProperty.get(widget);
  }

  /**
   * Open a file by path and return a widget.
   */
  open(path: string): T {
    let widget = this.findWidget(path);
    if (!widget) {
      widget = this.createWidget(path);
      widget.title.closable = true;
      widget.title.text = this.getTitleText(path);
      this._setPath(widget, path);
      this._widgets.push(widget);
      installMessageFilter(widget, this);
    }

    // Fetch the contents and populate the widget asynchronously.
    let opts = this.getFetchOptions(path);
    this.manager.get(path, opts).then(contents => {
      return this.populateWidget(widget, contents);
    }).then(contents => {
      this.setDirty(path, false);
      this.finished.emit(widget);
    });
    this.opened.emit(widget);
    return widget;
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath: string): boolean {
    let widget = this.findWidget(oldPath);
    if (widget === void 0) {
      return false;
    }
    if (newPath === void 0) {
      this.setDirty(oldPath, false);
      widget.close();
      return true;
    }
    Private.pathProperty.set(widget, newPath);
    let parts = newPath.split('/');
    widget.title.text = this.getTitleText(newPath);
    return true;
  }

  /**
   * Save contents.
   *
   * @param path - The path of the file to save.
   *
   * returns A promise that resolves to the contents of the path.
   *
   * #### Notes
   * This clears the dirty state of the file after a successful save.
   */
  save(path: string): Promise<IContentsModel> {
    let widget = this.findWidget(path);
    if (!widget) {
      return Promise.resolve(void 0);
    }
    let model = this._getPath(widget);
    return this.getSaveOptions(widget, model).then(opts => {
      return this.manager.save(path, opts);
    }).then(contents => {
      this.setDirty(path, false);
      return contents;
    });
  }

  /**
   * Revert contents.
   *
   * @param path - The path of the file to revert.
   *
   * returns A promise that resolves to the new contents of the path.
   *
   * #### Notes
   * This clears the dirty state of the file after a successful revert.
   */
  revert(path: string): Promise<IContentsModel> {
    let widget = this.findWidget(path);
    if (!widget) {
      return Promise.resolve(void 0);
    }
    let opts = this.getFetchOptions(path);
    return this.manager.get(path, opts).then(contents => {
      return this.populateWidget(widget, contents);
    }).then(contents => {
      this.setDirty(path, false);
      return contents;
    });
  }

  /**
   * Close a file.
   *
   * @param path - The path of the file to close.
   *
   * returns A boolean indicating whether the file was closed.
   */
  close(path: string): Promise<boolean> {
    let widget = this.findWidget(path);
    if (!widget) {
      return Promise.resolve(false);
    }
    if (this.isDirty(path)) {
      return this._maybeClose(widget);
    }
    return this._close(widget);
  }

  /**
   * Close all files.
   */
  closeAll(): Promise<void> {
    let promises: Promise<boolean>[] = [];
    for (let w of this._widgets) {
      let path = this.findPath(w);
      promises.push(this.close(path));
    }
    return Promise.all(promises).then(() => { return void 0; });
  }

  /**
   * Get whether a file is dirty.
   */
  isDirty(path: string): boolean {
    let widget = this.findWidget(path);
    if (widget) {
      return Private.dirtyProperty.get(widget);
    }
  }

  /**
   * Set the dirty state of a file.
   */
  setDirty(path: string, value: boolean): void {
    let widget = this.findWidget(path);
    if (widget) Private.dirtyProperty.set(widget, value);
  }

  /**
   * Filter messages on the widget.
   */
  filterMessage(handler: IMessageHandler, msg: Message): boolean {
    let widget = handler as T;
    if (msg.type === 'close-request') {
      let path = this.findPath(widget);
      if (path) {
        this.close(path);
        return true;
      }
    }
    return false;
  }

  /**
   * Get options use to fetch the model contents from disk.
   */
  protected getFetchOptions(path: string): IContentsOpts {
    return { type: 'file', format: 'text' };
  }

  /**
   * Get the options used to save the widget content.
   */
  protected abstract getSaveOptions(widget: T, path: string): Promise<IContentsOpts>;

  /**
   * Create the widget from a path.
   */
  protected abstract createWidget(path: string): T;

  /**
   * Populate a widget from an `IContentsModel`.
   *
   * #### Notes
   * Subclasses are free to use any or none of the information in
   * the model.  It is up to subclasses to handle setting dirty state when
   * the widget contents change.  See [[AbstractFileHandler.dirtyProperty]].
   */
  protected abstract populateWidget(widget: T, model: IContentsModel): Promise<IContentsModel>;

  /**
   * Set the appropriate title text based on a path.
   */
  protected getTitleText(path: string): string {
    return path.split('/').pop();
  }

  /**
   * Perform an action before closing the widget.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected beforeClose(widget: T): Promise<void> {
    return Promise.resolve(void 0);
  }

  /**
   * Get the path for a given widget.
   */
  private _getPath(widget: T): string {
    return Private.pathProperty.get(widget);
  }

  /**
   * Set the path for a widget.
   */
  private _setPath(widget: T, path: string) {
    Private.pathProperty.set(widget, path);
  }

  /**
   * Ask the user whether to close an unsaved file.
   */
  private _maybeClose(widget: T): Promise<boolean> {
    return showDialog({
      title: 'Close without saving?',
      body: `File "${widget.title.text}" has unsaved changes, close without saving?`,
      host: widget.node
    }).then(value => {
      if (value.text === 'OK') {
        this._close(widget);
        return true;
      }
      return false;
    });
  }

  /**
   * Actually close the file.
   */
  private _close(widget: T): Promise<boolean> {
    return this.beforeClose(widget).then(() => {
      let model = Private.pathProperty.get(widget);
      let index = this._widgets.indexOf(widget);
      this._widgets.splice(index, 1);
      Private.pathProperty.set(widget, void 0);
      widget.close();
      return true;
    });
  }

  private _manager: IContentsManager = null;
  private _widgets: T[] = [];
  private _cb: (widget: T) => void  = null;
}


/**
 * A private namespace for AbstractFileHandler data.
 */
namespace Private {
  /**
   * A signal emitted when a path is opened.
   */
  export
  const openedSignal = new Signal<AbstractFileHandler<Widget>, Widget>();

  /**
   * A signal emitted when a model is populated.
   */
  export
  const finishedSignal = new Signal<AbstractFileHandler<Widget>, Widget>();

  /**
   * An attached property with the widget path.
   */
  export
  const pathProperty = new Property<Widget, string>({
    name: 'path'
  });

  /**
   * An attached property with the widget dirty state.
   */
  export
  const dirtyProperty = new Property<Widget, boolean>({
    name: 'dirty',
    value: false,
    changed: (widget: Widget, oldValue: boolean, newValue: boolean) => {
      if (newValue) {
        widget.title.className += ` ${DIRTY_CLASS}`;
      } else {
        widget.title.className = widget.title.className.replace(DIRTY_CLASS, '');
      }
    }
  });
}
