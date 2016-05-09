// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IKernelSpecId, IContentsOpts, IKernel,
  INotebookSession, IContentsManager, INotebookSessionManager,
  IKernelSpecIds
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
 * The interface for a document model.
 */
export
interface IDocumentModel {
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
   * The default kernel name of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  defaultKernelName: string;

  /**
   * The default kernel language of the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  defaultKernelLanguage: string;
}


/**
 * A session info object for a running session.
 */
export
interface ISessionInfo {
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
   * Get the current kernelspec information.
   */
  getKernelSpecs(): IKernelSpecIds;

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
 * The options used to register a widget factory.
 */
export
interface IWidgetFactoryOptions {

  /**
   * The file extensions the widget can view.
   *
   * #### Notes
   * Use `'.*'` to denote all file extensions
   * or give the actual extension (e.g. `'.txt'`).
   */
  fileExtensions: string[];

  /**
   * The name of the widget to display in dialogs.
   */
  displayName: string;

  /**
   * The registered name of the model type used to create the widgets.
   */
  modelName: string;

  /**
   * The file extensions for which the factory should be the default.
   * #### Notes
   * Use `'.*'` to denote all file extensions
   * or give the actual extension (e.g. `'.txt'`).
   */
  defaultFor?: string[];

  /**
   * Whether the widgets prefer having a kernel started.
   */
  preferKernel?: boolean;

  /**
   * Whether the widgets can start a kernel when opened.
   */
  canStartKernel?: boolean;
}


/**
 * The interface for a widget factory.
 */
export
interface IWidgetFactory<T extends Widget> {
  /**
   * Get the preferred widget title given a path and a widget.
   */
  getWidgetTitle(path: string, widget: Widget): string;

  /**
   * Create a new widget.
   */
  createNew(model: IDocumentModel, context: IDocumentContext, kernel: IKernelId): T;
}


/**
 * The options used to register a model factory.
 */
export
interface IModelFactoryOptions {
  /**
   * The name of the model factory.
   */
  name: string;

  /**
   * The contents options used to fetch/save files.
   */
  contentsOptions: IContentsOpts;
}


/**
 * The interface for a model factory.
 */
export
interface IModelFactory {
  /**
   * Create a new model for a given path.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string): IDocumentModel;

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string;
}


/**
 * A kernel preference for a given file path and widget.
 */
export
interface IKernelPreference {
  /**
   * The preferred kernel language.
   */
  language: string;

  /**
   * Whether to prefer having a kernel started when opening.
   */
  preferKernel: boolean;

  /**
   * Whether a kernel when can be started when opening.
   */
  canStartKernel: boolean;
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
   * @param factory - The factory instance.
   *
   * @param options - The options used to register the factory.
   *
   * @returns A disposable used to unregister the factory.
   *
   * #### Notes
   * If a factory with the given `displayName` is already registered, the
   * factory will be ignored and a warning will be printed to the console.
   * If `'.*'` is given as adefault extension, the factory will be registered
   * as the global default.
   * If a factory is already registered as a default for a given extension or
   * as the global default, this factory will override the existing default.
   */
  registerWidgetFactory(factory: IWidgetFactory<Widget>, options: IWidgetFactoryOptions): IDisposable {
    // TODO: make sure defaultExtensions is a subset of the factory extensions
    // TODO
    return void 0;
  }

  /**
   * Register a model factory.
   *
   * @param factory - The factory instance.
   *
   * @param options - The options used to register the factory.
   *
   * @returns A disposable used to unregister the factory.
   *
   * #### Notes
   * If a factory with the given `name` is already registered, the
   * factory will be ignored and a warning will be printed to the console.
   */
  registerModelFactory(factory: IModelFactory, options: IModelFactoryOptions): IDisposable {
    // TODO
    return void 0;
  }

  /**
   * Get the list of registered widget factory display names.
   *
   * @param path - An optional file path to filter the results.
   */
  listWidgetFactories(path?: string): string[] {
    // TODO: filter by name and make sure the model factory exists.
    return void 0;
  }

  /**
   * Get the kernel preference.
   */
  getKernelPreference(path: string, widgetName: string): IKernelPreference {
    let widgetFactoryEx = this._getWidgetFactoryEx(widgetName);
    let modelFactoryEx = this._getModelFactoryEx(widgetName);
    let language = modelFactoryEx.factory.preferredLanguage(path);
    return {
      language,
      preferKernel: widgetFactoryEx.preferKernel,
      canStartKernel: widgetFactoryEx.canStartKernel
    }
  }

  /**
   * Open a file and return the widget used to display the contents.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use.
   *
   * @param kernel - An optional kernel name/id to override the default.
   */
  open(path: string, widgetName='default', kernel?: IKernelId): Widget {
    let widget = new Widget();
    let manager = this._contentsManager;
    let mFactoryEx = this._getModelFactoryEx(widgetName);
    if (!mFactoryEx) {
      return;
    }
    let lang = mFactoryEx.factory.preferredLanguage(path);
    let model = mFactoryEx.factory.createNew(lang);
    manager.get(path, mFactoryEx.contentsOptions).then(contents => {
      model.deserialize(contents.content);
      this._createWidget(model, widgetName, widget, kernel);
    });
    return widget;
  }

  /**
   * Create a new file of the given name.
   *
   * @param path - The file path to use.
   *
   * @param widgetName - The name of the widget factory to use.
   *
   * @param kernel - An optional kernel name/id to override the default.
   */
  createNew(path: string, widgetName='default', kernel?: IKernelId): Widget {
    let widget = new Widget();
    let manager = this._contentsManager;
    let mFactoryEx = this._getModelFactoryEx(widgetName);
    if (!mFactoryEx) {
      return;
    }
    let lang = mFactoryEx.factory.preferredLanguage(path);
    let model = mFactoryEx.factory.createNew(lang);
    let opts = mFactoryEx.contentsOptions;
    opts.content = model.serialize();
    manager.save(path, opts).then(content => {
      this._createWidget(model, widgetName, widget, kernel);
    });
    return widget;
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
   * Create a context and a widget.
   */
  private _createWidget(model: IDocumentModel, widgetName: string, parent: Widget, kernel?:IKernelId): void {
    let wFactoryEx = this._getWidgetFactoryEx(widgetName);
    parent.layout = new PanelLayout();
    // TODO: Create a new execution/contents context.
    let context: IDocumentContext = void 0;
    if (!kernel) {
      // TODO: get the desired kernel name
    }
    // Create the child widget using the factory.
    let child = wFactoryEx.factory.createNew(model, context, kernel);
    // Add the child widget to the parent widget and emit opened.
    (parent.layout as PanelLayout).addChild(child);
  }

  /**
   * Get the appropriate widget factory by name.
   */
  private _getWidgetFactoryEx(widgetName: string): Private.IWidgetFactoryEx {
    let options: Private.IWidgetFactoryEx;
    if (widgetName === 'default') {
      options = this._widgetFactories[this._defaultWidgetFactory];
    } else {
      options = this._widgetFactories[widgetName];
    }
    return options;
  }

  /**
   * Get the appropriate model factory given a widget factory.
   */
  private _getModelFactoryEx(widgetName: string): Private.IModelFactoryEx {
    let wFactoryEx = this._getWidgetFactoryEx(widgetName);
    if (!wFactoryEx) {
      return;
    }
    return this._modelFactories[wFactoryEx.modelName];
  }

  private _data: { [key: string]: Private.IDocumentData } = Object.create(null);
  private _modelFactories: { [key: string]: Private.IModelFactoryEx } = Object.create(null);
  private _widgetFactories: { [key: string]: Private.IWidgetFactoryEx } = Object.create(null);
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

  export
  interface IModelFactoryEx extends IModelFactoryOptions {
    factory: IModelFactory;
  }

  export
  interface IWidgetFactoryEx extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget>;
  }
}
