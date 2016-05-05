// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IKernelSpecId, IContentsOpts, IKernel,
  INotebookSession
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


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
   * The default kernel name for the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  defaultKernelName: string;

  /**
   * The default kernel language for the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  defaultKernelLanguage: string;
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
   * Create a new widget given a document model and a context.
   */
  createNew(model: IDocumentModel, context: IDocumentContext): T;

  /**
   * Get the preferred widget title given a path and widget instance.
   */
  getWidgetTitle(path: string, widget: T): string;

  /**
   * Get the kernel preferences.
   */
  getKernelPreferences(path: string, specs: IKernelSpecId[]): IKernelPreferences;
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
   */
  createNew(path: string, kernelSpec?: IKernelSpecId): IDocumentModel;
}


/**
 * The options used to get kernel preferences.
 */
export
interface IKernelPreferenceOptions {
  /**
   * The filename used to filter by extension.
   */
  filename: string;

  /**
   * The widget name used to do the filtering.
   */
  widgetName: string;

  /**
   * The list of available kernel specs.
   */
  specs: IKernelSpecId[];
}


/**
 * An interface for preferred kernels.
 */
export
interface IKernelPreferences {
  /**
   * The preferred default kernel.
   */
  defaultKernel: string;

  /**
   * The list of preferred kernel names.
   */
  preferredNames: string[];
}


/**
 * The document manager.
 */
export
class DocumentManager {
  /**
   * A signal emitted when a file is opened.
   */
  get opened(): ISignal<DocumentManager, Widget> {
    return Private.openedSignal.bind(this);
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
   * Get the kernel preferences.
   */
  getKernelPreferences(options: IKernelPreferenceOptions): IKernelPreferences {
    return void 0;
  }

  /**
   * Open a file and return the widget used to display the contents.
   *
   * @param fileName - The path to the file to open.
   *
   * @param widgetName - The registered widget name to use to display the file.
   *
   * @param kernel - The desired kernel name or id to use.
   *
   * @returns The widget used to view the file.
   *
   * #### Notes
   * Emits an [opened] signal when the widget is populated.
   */
  open(fileName: string, widgetName='default', kernel?: IKernelId): Widget {
    // Find out from the widgetFactory what modelFactory to should use.
    // Looks up the contents options to use for the modelFactory.
    // Fetch the content.
    // Call the modelFactory with the content synchronously get a model.
    // The model exposes the default kernel/language.
    // Document manager creates a execution/contents context.
    // Call _createWidget and return container widget.
    return void 0;
  }

  /**
   * Create a new file of the given name.
   *
   * @param filename: The desired name for the new file.
   *
   * @param widgetName: The name of the widgetFactory to use.
   *
   * @param kernel: The desired kernel name or id.
   *
   * @returns A promise that resolves with the path to the created file.
   */
  createNew(filename: string, widgetName='default', kernel?: IKernelId): Promise<string> {
    return void 0;
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

  private _createWidget(model: IDocumentModel, context: IDocumentContext): Widget {
    // Call widget with new model and a context and optional kernel to hook up to. Async returned widget is added to the container widget. The widget factory is responsible for starting a kernel if it wants one.
    // store path->(model, session, context, [list,of,widgets])
    // Hand back container widget synchronously
    return void 0;
  }

  private _data: { [key: string]: Private.IDocumentData } = Object.create(null);
  private _modelFactories: { [key: string]: IModelFactory } = Object.create(null);
  private _widgetFactories: { [key: string]: IWidgetFactory<Widget> } = Object.create(null);
  private _defaultWidgetFactory = '';
  private _defaultWidgetFactories: { [key: string]: string } = Object.create(null);
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
