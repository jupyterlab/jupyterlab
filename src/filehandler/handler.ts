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
   *
   * @param cb - The function called when a widget is created.
   */
  constructor(manager: IContentsManager, cb: (widget: T) => void) {
    this._manager = manager;
    this._cb = cb;
  }

  /**
   * Get the list of file extensions explicitly supported by the handler.
   */
  get fileExtensions(): string[] {
    return [];
  }

  /**
   * Get the list of mime types explicitly supported by the handler.
   */
  get mimeTypes(): string[] {
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
  findByPath(path: string): T {
    for (let w of this._widgets) {
      let model = this._getModel(w);
      if (model.path === path) {
        return w;
      }
    }
  }

  /**
   * Open a contents model and return a widget.
   */
  open(model: IContentsModel): T {
    let widget = this.findByPath(model.path);
    if (!widget) {
      widget = this.createWidget(model);
      widget.title.closable = true;
      this._setModel(widget, model);
      this._widgets.push(widget);
      installMessageFilter(widget, this);
    }

    // Fetch the contents and populate the widget asynchronously.
    let opts = this.getFetchOptions(model);
    this.manager.get(model.path, opts).then(contents => {
      widget.title.text = this.getTitleText(model);
      return this.populateWidget(widget, contents);
    }).then(contents => {
      this.clearDirty(widget);
    });
    let cb = this._cb;
    if (cb) cb(widget);
    return widget;
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath: string): boolean {
    let widget = this.findByPath(oldPath);
    if (widget === void 0) {
      return false;
    }
    if (newPath === void 0) {
      this.clearDirty(widget);
      widget.close();
      return true;
    }
    let model = this._getModel(widget);
    model.path = newPath;
    let parts = newPath.split('/');
    model.name = parts[parts.length - 1];
    widget.title.text = this.getTitleText(model);
    return true;
  }

  /**
   * Save widget contents.
   *
   * @param widget - The widget to save (defaults to current active widget).
   *
   * returns A promise that resolves to the contents of the widget.
   *
   * #### Notes
   * This clears the dirty state of the widget after a successful save.
   */
  save(widget: T): Promise<IContentsModel> {
    if (!widget) {
      return Promise.resolve(void 0);
    }
    let model = this._getModel(widget);
    return this.getSaveOptions(widget, model).then(opts => {
      return this.manager.save(model.path, opts);
    }).then(contents => {
      this.clearDirty(widget);
      return contents;
    });
  }

  /**
   * Revert widget contents.
   *
   * @param widget - The widget to revert (defaults to current active widget).
   *
   * returns A promise that resolves to the new contents of the widget.
   *
   * #### Notes
   * This clears the dirty state of the widget after a successful revert.
   */
  revert(widget: T): Promise<IContentsModel> {
    if (!widget) {
      return Promise.resolve(void 0);
    }
    let model = this._getModel(widget);
    let opts = this.getFetchOptions(model);
    return this.manager.get(model.path, opts).then(contents => {
      return this.populateWidget(widget, contents);
    }).then(contents => {
      this.clearDirty(widget);
      return contents;
    });
  }

  /**
   * Close a widget.
   *
   * @param widget - The widget to close (defaults to current active widget).
   *
   * returns A boolean indicating whether the widget was closed.
   */
  close(widget: T): Promise<boolean> {
    if (!widget) {
      return Promise.resolve(false);
    }
    if (this.isDirty(widget)) {
      return this._maybeClose(widget);
    }
    this._close(widget);
    return Promise.resolve(true);
  }

  /**
   * Close all widgets.
   */
  closeAll(): void {
    for (let w of this._widgets) {
      w.close();
    }
  }

  /**
   * Get whether a widget is dirty (defaults to current active widget).
   */
  isDirty(widget: T): boolean {
    return Private.dirtyProperty.get(widget);
  }

  /**
   * Set the dirty state of a widget (defaults to current active widget).
   */
  setDirty(widget: T): void {
    Private.dirtyProperty.set(widget, true);
  }

  /**
   * Clear the dirty state of a widget (defaults to current active widget).
   */
  clearDirty(widget: T): void {
    Private.dirtyProperty.set(widget, false);
  }

  /**
   * Filter messages on the widget.
   */
  filterMessage(handler: IMessageHandler, msg: Message): boolean {
    let widget = handler as T;
    if (msg.type === 'close-request' && widget) {
      this.close(widget);
      return true;
    }
    return false;
  }

  /**
   * Perform an action before actually closing the widget.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected beforeClose(widget: T): Promise<void> {}

  /**
   * Get options use to fetch the model contents from disk.
   *
   * #### Notes
   * Subclasses are free to use any or none of the information in
   * the model.
   */
  protected getFetchOptions(model: IContentsModel): IContentsOpts {
    return { type: 'file', format: 'text' };
  }

  /**
   * Get the options used to save the widget content.
   */
  protected abstract getSaveOptions(widget: T, model: IContentsModel): Promise<IContentsOpts>;

  /**
   * Create the widget from a model.
   */
  protected abstract createWidget(model: IContentsModel): T;

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
   * Set the appropriate title text based on a model.
   */
  protected getTitleText(model: IContentsModel): string {
    return model.name;
  }

  /**
   * Get the model for a given widget.
   */
  private _getModel(widget: T): IContentsModel {
    return Private.modelProperty.get(widget);
  }

  /**
   * Set the model for a widget.
   */
  private _setModel(widget: T, model: IContentsModel) {
    Private.modelProperty.set(widget, model);
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
  private _close(widget: T): Promise<void> {
    return Promis.resolve(this.beforeClose(widget)).then(() => {
      widget.dispose();
      let index = this._widgets.indexOf(widget);
      this._widgets.splice(index, 1);
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
   * An attached property with the widget model.
   */
  export
  const modelProperty = new Property<Widget, IContentsModel>({
    name: 'model',
    value: null
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
