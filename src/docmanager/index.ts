// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IKernelSpecId, IContentsOpts, IKernel,
  INotebookSession, IContentsManager, INotebookSessionManager
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


/**
 * An interface for kernel preferences.
 */
export
interface IKernelPreference {
  /**
   * The name of the primary kernel.
   */
  primary: string;

  /**
   * The names of the other kernels.
   */
  others: string[];
}


/**
 * The interface for a document model.
 */
export interface IDocumentModel {
  /**
   * A signal emitted when the document content changes.
   */
  contentChanged: ISignal<IDocumentModel, any>;

  /**
   * Serialize the model.  It should return a JSON object or a string.
   */
  serialize(): any;

  /**
   * Deserialize the model from a string or a JSON object.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  deserialize(value: any): void;

  /**
   * The kernel preference for the document.
   */
  kernelPreference: IKernelPreference;
}


/**
 * A session info object for a running session.
 */
export interface ISessionInfo {
  /**
   * The list of file paths associated with the running sessions.
   */
  path: string;

  /**
   * The kernel instance associated with the session.
   */
  kernel: IKernel;
}


/**
 * The document context object.
 */
export interface IDocumentContext {
  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<IDocumentContext, string>;

  /**
   * A signal emitted when the model is saved or reverted.
   */
  dirtyCleared: ISignal<IDocumentContext, void>;

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  kernel: IKernel;

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  path: string;

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernelId): Promise<IKernel>;

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void>;

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void>;

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISessionInfo[]>;

  /**
   * Add a sibling widget to the document manager.
   *
   * @param widget - The widget to add to the document manager.
   *
   * @returns A disposable used to remove the sibling if desired.
   *
   * #### Notes
   * It is assumed that the widget has the same model and context
   * as the original widget.
   */
  addSibling(widget: Widget): IDisposable;
}


/**
 * The interface for a widget factory.
 */
export
interface IWidgetFactory<T extends Widget> {
  /**
   * The file extensions the widget can view.
   *
   * #### Notes
   * This is a read-only property.  Use `'.*'` to denote all file extensions
   * or give the actual extension (e.g. `'.txt'`).
   */
  fileExtensions: string[];

  /**
   * The name of the widget to display in dialogs.
   *
   * #### Notes
   * This is a read-only property.
   */
  displayName: string;

  /**
   * The registered name of the model type used to create the widgets.
   *
   * #### Notes
   * This is a read-only property.
   */
  modelName: string;

  /**
   * Create a new widget.
   */
  createNew(model: IDocumentModel, context: IDocumentContext): T;

  /**
   * Get the preferred widget title given a path and widget instance.
   */
  getWidgetTitle(path: string, widget: T): string;

  /**
   * Get the preferred kernel info list given a model preference.
   */
  getKernelPreferences(modelPreference: IKernelPreference): IKernelPreference;
}


/**
 * The interface for a model factory.
 */
export
interface IModelFactory {
  /**
   * The name of the model factory.
   *
   * #### Notes
   * This is a read-only property.
   */
  name: string;

  /**
   * The contents options used to fetch/save files.
   *
   * #### Notes
   * This is a read-only property.
   */
  contentsOptions: IContentsOpts;

  /**
   * Create a new model for a given path.
   *
   * @param kernelPreference - An optional kernel preference.
   *
   * @returns A new document model.
   */
  createNew(kernelPreference?: IKernelPreference): IDocumentModel;

  /**
   * Get the preferred kernel info given a path and specs
   */
  getKernelPreference(path: string, specs: IKernelSpecId[]): IKernelPreference;
}


/**
 * The options for opening or creating a new document.
 */
export
interface IDocumentOptions {
  /**
   * The path to the file to open/create.
   */
  filename: string;

  /**
   * The existing kernel specs.
   */
  specs: IKernelSpecId[];

  /**
   * An option widget name to override the default.
   */
  widgetName?: string;
}


/**
 * The document manager.
 */
export
class DocumentManager {

  /**
   * Construct a new document manager.
   */
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
  }

  /**
   * Register a widget factory with the document manager.
   *
   * @params factory - An instance of a widget factory.
   *
   * @params defaultExtensions - An optional list of file extensions for which
   *   the factory should be the default.
   *
   * @returns A disposable used to unregister the factory.
   *
   * #### Notes
   * By specifying `'.*'` as one of the `defaultExtensions`, the factory will
   * register as the global default.
   * If a factory with the given `displayName` is already registered, the
   * factory will be ignored and a warning will be printed to the console.
   * If a factory is already registered as a default for a given extension or
   * as the global default, this factory will override the existing default.
   */
  registerWidgetFactory(factory: IWidgetFactory<Widget>, defaultExtensions?: string[]): IDisposable {
    // TODO: make sure defaultExtensions is a subset of the factory extensions
    if (factory.displayName in this._widgetFactories) {
      console.warn(`widgetFactory "${factory.displayName}" already registered, ignoring.`);
      return;
    }
    this._widgetFactories[factory.displayName] = factory;
    if (!defaultExtensions) {
      return;
    }
    for (let ext of defaultExtensions) {
      if (ext === '.*') {
        this._defaultWidgetFactory = factory.displayName;
      } else {
        this._defaultWidgetFactories[ext] = factory.displayName;
      }
    }
    var displayName = factory.displayName;
    return new DisposableDelegate(() => {
      delete this._widgetFactories[displayName];
      if (this._defaultWidgetFactory === displayName) {
        this._defaultWidgetFactory = '';
      }
      for (let ext of Object.keys(this._defaultWidgetFactories)) {
        let name = this._defaultWidgetFactories[ext];
        if (name === displayName) {
          delete this._defaultWidgetFactories[name];
        }
      }
    });
  }

  /**
   * Register a model factory.
   *
   * @param factory - An instance of a model factory.
   *
   * @returns A disposable used to unregister the factory.
   *
   * #### Notes
   * If a factory with the given `name` is already registered, the
   * factory will be ignored and a warning will be printed to the console.
   */
  registerModelFactory(factory: IModelFactory): IDisposable {
    if (factory.name in this._modelFactories) {
      console.warn(`modelFactory "${factory.name}" already registered, ignoring.`);
      return;
    }
    this._modelFactories[factory.name] = factory;
    var name = factory.name;
    return new DisposableDelegate(() => {
      delete this._modelFactories[name];
    });
  }

  /**
   * Get the list of registered widget factory display names.
   *
   * @param filename - An optional filename to filter the results.
   */
  listWidgetFactories(filename?: string): string[] {
    // TODO: filter by name.
    return Object.keys(this._widgetFactories);
  }

  /**
   * Get the kernel preference.
   */
  getKernelPreference(filename: string, widgetName: string, specs: IKernelSpecId[]): IKernelPreference {
    let widgetFactory = this._widgetFactories[widgetName];
    let modelFactory = this._modelFactories[widgetFactory.modelName];
    let modelPref = modelFactory.getKernelPreference(filename, specs);
    return widgetFactory.getKernelPreferences(modelPref);
  }

  /**
   * Open a file and return the widget used to display the contents.
   *
   * @param options - The options used to open the widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   */
  open(options: IDocumentOptions, kernel?: IKernelId): Widget {
    // Find out from the widgetFactory what modelFactory to use.
    let wFactory = this._getWidgetFactory(options.widgetName || 'default');
    if (!wFactory) {
      return void 0;
    }
    let mFactory = this._modelFactories[wFactory.modelName];
    if (!mFactory) {
      return void 0;
    }
    // Look up the contents options to use for the modelFactory.
    let cManager = this._contentsManager;
    let widget = new Widget();
    widget.layout = new PanelLayout();
    let filename = options.filename;
    // Fetch the content.
    cManager.get(filename, mFactory.contentsOptions).then(contents => {
      // Call the modelFactory with the content synchronously get a model.
      let pref = mFactory.getKernelPreference(filename, options.specs);
      let model = mFactory.createNew(pref);
      model.deserialize(contents.content);
      // Create a new execution/contents context.
      // TODO
      let context: IDocumentContext = void 0;
      // If a kernel was given, start the kernel on the context.
      // TODO
      // Create the child widget using the factory.
      let child = wFactory.createNew(model, context);
      // Add the child widget to the parent widget and emit opened.
      (widget.layout as PanelLayout).addChild(child);
    });
    return widget;
  }

  /**
   * Create a new file of the given name.
   *
   * @param options - The options used to create the file.
   *
   * @returns A promise that resolves with the path to the created file.
   */
  createNew(options: IDocumentOptions): Promise<string> {
    let wFactory = this._getWidgetFactory(options.widgetName || 'default');
    if (!wFactory) {
      return void 0;
    }
    let mFactory = this._modelFactories[wFactory.modelName];
    if (!mFactory) {
      return void 0;
    }
    let filename = options.filename;
    let pref = mFactory.getKernelPreference(filename, options.specs);
    let model = mFactory.createNew(pref);
    let opts = mFactory.contentsOptions;
    opts.content = model.serialize();
    let cManager = this._contentsManager;
    return cManager.save(filename, opts).then(content => {
      return content.path;
    });
  }

  /**
   * Update the path of an open document.
   *
   * @param oldPath - The previous path.
   *
   * @param newPath - The new path.
   */
  renameFile(oldPath: string, newPath: string): void {
    // update all sessions
    // updates all container widget titles by calling getWidgetTitle on the facotries.
  }

  /**
   * Handle a file deletion on the currently open widgets.
   *
   * @param path - The path of the file to delete.
   */
  deleteFile(path: string): void {
    // Look up kernel (if exists) and if this session is the only session using the kernel, ask user if they want to shut down the kernel.
    // dispose everything in the path->(model, session, context, [list,of,widgets]) mapping for the path (disposing a session should not shut down the kernel - needs change in notebook server)
  }

  /**
   * Save the document contents to disk.
   */
  saveFile(path: string): Promise<void> {
    return void 0;
  }

  /**
   * Revert the document contents to disk contents.
   */
  revertFile(path: string): Promise<void> {
    return void 0;
  }

  /**
   * Close the widgets associated with a given path.
   */
  closeFile(path: string): void {

  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {

  }

  /**
   * Get the appropriate widget factory by name.
   */
  private _getWidgetFactory(widgetName: string): IWidgetFactory<Widget> {
    let factory: IWidgetFactory<Widget>;
    if (widgetName === 'default') {
      factory = this._widgetFactories[this._defaultWidgetFactory];
    } else {
      factory = this._widgetFactories[widgetName];
    }
    return factory;
  }

  private _data: { [key: string]: Private.IDocumentData } = Object.create(null);
  private _modelFactories: { [key: string]: IModelFactory } = Object.create(null);
  private _widgetFactories: { [key: string]: IWidgetFactory<Widget> } = Object.create(null);
  private _defaultWidgetFactory = '';
  private _defaultWidgetFactories: { [key: string]: string } = Object.create(null);
  private _contentsManager: IContentsManager = null;
  private _sessionManager: INotebookSessionManager = null;
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * A signal emitted when a file is opened.
   */
  export
  const openedSignal = new Signal<DocumentManager, Widget>();

  /**
   * Data associated with a document.
   */
  export
  interface IDocumentData {
    model: IDocumentModel;
    session: INotebookSession;
    context: IDocumentContext;
    widgets: Widget[];
  }
}
