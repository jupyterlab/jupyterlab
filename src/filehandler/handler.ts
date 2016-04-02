// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import {
  IContentsModel, IContentsManager, IContentsOpts
} from 'jupyter-js-services';

import * as arrays
  from 'phosphor-arrays';

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
  loadModeByFileName
} from '../codemirror';

import {
  showDialog
} from '../dialog';

import {
  JupyterCodeMirrorWidget as CodeMirrorWidget
} from './widget';


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
   */
  constructor(manager: IContentsManager) {
    this._manager = manager;
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
   *
   * #### Notes
   * This is a read-only property
   */
  get manager(): IContentsManager {
    return this._manager;
  }

  /**
   * A signal emitted when the file handler has finished loading the
   * contents of the widget.
   */
  get finished(): ISignal<AbstractFileHandler<T>, T> {
    return Private.finishedSignal.bind(this);
  }

  /**
   * Get the number of widgets managed by the handler.
   *
   * @returns The number of widgets managed by the handler.
   */
  widgetCount(): number {
    return this._widgets.length;
  }

  /**
   * Get the widget at the specified index.
   *
   * @param index - The index of the widget of interest.
   *
   * @returns The widget at the specified index, or `undefined`.
   */
  widgetAt(index: number): T {
    return this._widgets[index];
  }

  /**
   * Create a new file given a directory and a host node for the dialog.
   */
  abstract createNew(path: string, type: string, host: HTMLElement): Promise<T>;

  /**
   * Open a contents model and return a widget.
   */
  open(model: IContentsModel): T {
    let widget = this.findWidgetByModel(model);
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
    }).then(() => {
      this.clearDirty(widget);
      this.finished.emit(widget);
    });
    return widget;
  }

  /**
   * Rename a file.
   */
  rename(oldPath: string, newPath: string): boolean {
    for (let w of this._widgets) {
      let model = this._getModel(w);
      if (model.path === oldPath) {
        if (newPath === void 0) {
          this.clearDirty(w);
          w.close();
          return;
        }
        model.path = newPath;
        let parts = newPath.split('/');
        model.name = parts[parts.length - 1];
        w.title.text = this.getTitleText(model);
        return true;
      }
    }
    return false;
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
   * Find a widget given a model.
   */
  protected findWidgetByModel(model: IContentsModel): T {
    return arrays.find(this._widgets, widget => this._getModel(widget).path === model.path);
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
  private _close(widget: T): void {
    widget.dispose();
    let index = this._widgets.indexOf(widget);
    this._widgets.splice(index, 1);
  }

  private _manager: IContentsManager = null;
  private _widgets: T[] = [];
}


/**
 * An implementation of a file handler.
 */
export
class FileHandler extends AbstractFileHandler<CodeMirrorWidget> {

  /**
   * Create a new file or directory.
   */
  createNew(path: string, name: string, host: HTMLElement): Promise<CodeMirrorWidget> {
    return Promise.resolve(void 0);
  }

  /**
   * Get the options used to save the widget content.
   */
  protected getSaveOptions(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsOpts> {
    let name = model.path.split('/').pop();
    name = name.split('.')[0];
    let content = (widget as CodeMirrorWidget).editor.getDoc().getValue();
    return Promise.resolve({ path: model.path, content, name,
                             type: 'file', format: 'text' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(model: IContentsModel): CodeMirrorWidget {
    let widget = new CodeMirrorWidget();
    CodeMirror.on(widget.editor.getDoc(), 'change', () => {
      this.setDirty(widget);
    });
    return widget;
  }

  /**
   * Populate a widget from an `IContentsModel`.
   */
  protected populateWidget(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsModel> {
    widget.editor.getDoc().setValue(model.content);
    loadModeByFileName(widget.editor, model.name);
    return Promise.resolve(model);
  }
}


/**
 * A registry of file handlers.
 */
export
class FileHandlerRegistry {
  /**
   * Get the default handler.
   *
   * #### Notes
   * This is a read-only property.
   */
  get default(): AbstractFileHandler<Widget> {
    return this._default;
  }

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
   * Add a creation type.
   */
  addCreator(name: string, handler: AbstractFileHandler<Widget>): void {
    this._creators[name] = handler;
  }
  
  /**
   * Get a list of creator names.
   */
  listCreators(): string[] {
    return Object.keys(this._creators);
  }

  /**
   * Find a creator by name.
   */
  findByCreator(name: string): AbstractFileHandler<Widget> {
    return this._creators[name];
  }

  /**
   * Get the appropriate handler for an IContentsModel
   */
  findbyModel(model: IContentsModel): AbstractFileHandler<Widget>  {
    if (model.type === 'directory') {
      throw new Error('Cannot open directories, use `cd()`');
    } 
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
  private _creators: { [key: string]: AbstractFileHandler<Widget>} = Object.create(null);
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

  /**
   * A signal emitted when a file handler is activated.
   */
  export
  const activatedSignal = new Signal<AbstractFileHandler<Widget>, void>();

  /**
   * A signal emitted when a file handler has finished populating a widget.
   */
  export
  const finishedSignal = new Signal<AbstractFileHandler<Widget>, Widget>();
}


// /**
//  * Rename a file or directory.
//  */
// function doRename(widget: Widget, contents: IContentsModel): Promise<IContentsModel> {
//   let edit = document.createElement('input');
//   edit.value = contents.name;
//   return showDialog({
//     title: `Create a new ${contents.type}`,
//     body: edit,
//     host: widget.node.parentElement,
//     okText: 'CREATE'
//   }).then(value => {
//     if (value.text === 'CREATE') {
//       return widget.model.rename(contents.path, edit.value);
//     } else {
//       return widget.model.delete(contents.path).then(() => void 0);
//     }
//   }).catch(error => {
//     if (error.statusText === 'Conflict') {
//       return handleExisting(widget, edit.value, contents);
//     }
//     return utils.showErrorMessage(widget, 'File creation error', error).then(
//       () => { return void 0; });
//   });
// }

// /**
//  * Handle an existing file name.
//  */
// function handleExisting(widget: Widget, name: string, contents: IContentsModel): Promise<IContentsModel> {
//   return showDialog({
//     title: 'File already exists',
//     body: `File "${name}" already exists, try again?`,
//     host: widget.node.parentElement
//   }).then(value => {
//     if (value.text === 'OK') {
//       return doRename(widget, contents);
//     } else {
//       return widget.model.delete(contents.path).then(() => void 0);
//     }
//   });
// }
