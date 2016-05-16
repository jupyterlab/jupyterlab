// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IContentsOpts, IKernel,
  IContentsManager, INotebookSessionManager,
  IKernelSpecIds, ISessionId
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  ISignal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  showDialog
} from '../dialog';

import {
  IWidgetOpener
} from '../filebrowser/browser';

import {
  ContextManager
} from './context';


/**
 * The class name added to a document container widgets.
 */
const DOCUMENT_CLASS = 'jp-DocumentWidget';


/**
 * The interface for a document model.
 */
export
interface IDocumentModel extends IDisposable {
  /**
   * A signal emitted when the document content changes.
   */
  contentChanged: ISignal<IDocumentModel, any>;

  /**
   * A signal emitted when the model dirty state changes.
   */
  dirtyChanged: ISignal<IDocumentModel, boolean>;

  /**
   * The dirty state of the model.
   *
   * #### Notes
   * This should be cleared when the document is loaded from
   * or saved to disk.
   */
  dirty: boolean;

  /**
   * The read-only state of the model.
   */
  readOnly: boolean;

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

  /**
   * Serialize the model to a string.
   */
  toString(): string;

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): any;

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: any): void;
}


/**
 * The document context object.
 */
export interface IDocumentContext extends IDisposable {
  /**
   * The unique id of the context.
   *
   * #### Notes
   * This is a read-only property.
   */
  id: string;

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only propery.
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
   * The current contents model associated with the document
   *
   * #### Notes
   * This is a read-only property.  The model will have an
   * empty `contents` field.
   */
  contentsModel: IContentsModel;

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  kernelSpecs: IKernelSpecIds;

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<IDocumentContext, string>;

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernelId): Promise<IKernel>;

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void>;

  /**
   * Save the document to a different path.
   */
  saveAs(path: string): Promise<void>;

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void>;

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISessionId[]>;

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
interface IWidgetFactory<T extends Widget> extends IDisposable {
  /**
   * Create a new widget.
   */
  createNew(model: IDocumentModel, context: IDocumentContext, kernel?: IKernelId): T;

  /**
   * Take an action on a widget before closing it.
   *
   * @returns A promise that resolves to true if the document should close
   *   and false otherwise.
   */
  beforeClose(model: IDocumentModel, context: IDocumentContext, widget: Widget): Promise<boolean>;
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
interface IModelFactory extends IDisposable {
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
 *
 * #### Notes
 * The document manager is used to register model and widget creators,
 * and the file browser uses the document manager to create widgets. The
 * document manager maintains a context for each path and model type that is
 * open, and a list of widgets for each context. The document manager is in
 * control of the proper closing and disposal of the widgets and contexts.
 */
export
class DocumentManager implements IDisposable {
  /**
   * Construct a new document manager.
   */
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager, kernelSpecs: IKernelSpecIds, opener: IWidgetOpener) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._contextManager = new ContextManager(contentsManager, sessionManager, kernelSpecs, (id: string, widget: Widget) => {
      let parent = this._createWidget('', id);
      parent.setContent(widget);
      opener.open(parent);
      return new DisposableDelegate(() => {
        parent.close();
      });
    });
  }

  /**
   * Get whether the document manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._contentsManager === null;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    for (let modelName in this._modelFactories) {
      this._modelFactories[modelName].factory.dispose();
    }
    this._modelFactories = null;
    for (let widgetName in this._widgetFactories) {
      this._widgetFactories[widgetName].factory.dispose();
    }
    this._widgetFactories = null;
    for (let id in this._widgets) {
      for (let widget of this._widgets[id]) {
        widget.dispose();
      }
    }
    this._widgets = null;
    this._contentsManager = null;
    this._sessionManager = null;
    this._contextManager.dispose();
    this._contextManager = null;
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
   * If a factory with the given `displayName` is already registered,
   * an error will be thrown.
   * If `'.*'` is given as a default extension, the factory will be registered
   * as the global default.
   * If a factory is already registered as a default for a given extension or
   * as the global default, this factory will override the existing default.
   */
  registerWidgetFactory(factory: IWidgetFactory<Widget>, options: IWidgetFactoryOptions): IDisposable {
    let name = options.displayName;
    let exOpt = options as Private.IWidgetFactoryEx;
    exOpt.factory = factory;
    if (this._widgetFactories[name]) {
      throw new Error(`Duplicate registered factory ${name}`);
    }
    this._widgetFactories[name] = exOpt;
    if (options.defaultFor) {
      for (let option of options.defaultFor) {
        if (option === '.*') {
          this._defaultWidgetFactory = name;
        } else if (option in options.fileExtensions) {
          this._defaultWidgetFactories[option] = name;
        }
      }
    }
    return new DisposableDelegate(() => {
      delete this._widgetFactories[name];
      if (this._defaultWidgetFactory === name) {
        this._defaultWidgetFactory = '';
      }
      for (let opt of Object.keys(this._defaultWidgetFactories)) {
        let n = this._defaultWidgetFactories[opt];
        if (n === name) {
          delete this._defaultWidgetFactories[opt];
        }
      }
    });
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
   * If a factory with the given `name` is already registered, an error
   * will be thrown.
   */
  registerModelFactory(factory: IModelFactory, options: IModelFactoryOptions): IDisposable {
    let exOpt = options as Private.IModelFactoryEx;
    let name = options.name;
    exOpt.factory = factory;
    if (this._modelFactories[name]) {
      throw new Error(`Duplicate registered factory ${name}`);
    }
    this._modelFactories[name] = exOpt;
    return new DisposableDelegate(() => {
      delete this._modelFactories[name];
    });
  }

  /**
   * Get the list of registered widget factory display names.
   *
   * @param path - An optional file path to filter the results.
   *
   * #### Notes
   * The first item in the list is considered the default.
   */
  listWidgetFactories(path?: string): string[] {
    path = path || '';
    let ext = '.' + path.split('.').pop();
    let factories: string[] = [];
    let options: Private.IWidgetFactoryEx;
    let name = '';
    // If an extension was given, filter by extension.
    // Make sure the modelFactory is registered.
    if (ext.length > 1) {
      if (ext in this._defaultWidgetFactories) {
        name = this._defaultWidgetFactories[ext];
        options = this._widgetFactories[name];
        if (options.modelName in this._modelFactories) {
          factories.push(name);
        }
      }
    }
    // Add the rest of the valid widgetFactories that can open the path.
    for (name in this._widgetFactories) {
      if (factories.indexOf(name) !== -1) {
        continue;
      }
      options = this._widgetFactories[name];
      if (!(options.modelName in this._modelFactories)) {
        continue;
      }
      let exts = options.fileExtensions;
      if ((ext in exts) || ('.*' in exts)) {
        factories.push(name);
      }
    }
    // Add the default widget if it was not already added.
    name = this._defaultWidgetFactory;
    if (name && factories.indexOf(name) === -1) {
      options = this._widgetFactories[name];
      if (options.modelName in this._modelFactories) {
        factories.push(name);
      }
    }
    return factories;
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
    };
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
    if (widgetName === 'default') {
      widgetName = this.listWidgetFactories(path)[0];
    }
    let mFactoryEx = this._getModelFactoryEx(widgetName);
    if (!mFactoryEx) {
      return;
    }
    let widget: DocumentWidget;
    // Use an existing context if available.
    let id = this._contextManager.findContext(path, mFactoryEx.name);
    if (id) {
      widget = this._createWidget(widgetName, id);
      this._populateWidget(widget, kernel);
      return widget;
    }
    let lang = mFactoryEx.factory.preferredLanguage(path);
    let model = mFactoryEx.factory.createNew(lang);
    id = this._contextManager.createNew(path, model, mFactoryEx);
    widget = this._createWidget(widgetName, id);
    // Load the contents from disk.
    this._contextManager.revert(id).then(() => {
      this._populateWidget(widget, kernel);
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
    if (widgetName === 'default') {
      widgetName = this.listWidgetFactories(path)[0];
    }
    let mFactoryEx = this._getModelFactoryEx(widgetName);
    if (!mFactoryEx) {
      return;
    }
    let lang = mFactoryEx.factory.preferredLanguage(path);
    let model = mFactoryEx.factory.createNew(lang);
    let id = this._contextManager.createNew(path, model, mFactoryEx);
    let widget = this._createWidget(widgetName, id);
    // Save the contents to disk to get a valid contentsModel for the
    // context.
    this._contextManager.save(id).then(() => {
      this._populateWidget(widget, kernel);
    });
    return widget;
  }

  /**
   * Handle the renaming of an open document.
   *
   * @param oldPath - The previous path.
   *
   * @param newPath - The new path.
   */
  handleRename(oldPath: string, newPath: string): void {
    this._contextManager.rename(oldPath, newPath);
  }

  /**
   * Handle a file deletion.
   */
  handleDelete(path: string): void {
    // TODO: Leave all of the widgets open and flag them as orphaned?
  }

  /**
   * See if a widget already exists for the given path and widget name.
   *
   * #### Notes
   * This can be used to use an existing widget instead of opening
   * a new widget.
   */
  findWidget(path: string, widgetName='default'): Widget {
    let ids = this._contextManager.getIdsForPath(path);
    if (widgetName === 'default') {
      widgetName = this._defaultWidgetFactory;
    }
    for (let id of ids) {
      for (let widget of this._widgets[id]) {
        if (widget.name === widgetName) {
          return widget;
        }
      }
    }
  }

  /**
   * Clone a widget.
   *
   * #### Notes
   * This will create a new widget with the same model and context
   * as this widget.
   */
  clone(widget: DocumentWidget): DocumentWidget {
    let parent = this._createWidget(widget.name, widget.context.id);
    this._populateWidget(parent);
    return parent;
  }

  /**
   * Close the widgets associated with a given path.
   */
  closeFile(path: string): void {
    let ids = this._contextManager.getIdsForPath(path);
    for (let id of ids) {
      let widgets: DocumentWidget[] = this._widgets[id] || [];
      for (let w of widgets) {
        w.close();
      }
    }
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {
    for (let id in this._widgets) {
      for (let w of this._widgets[id]) {
        w.close();
      }
    }
  }

  /**
   * Create a container widget and handle its lifecycle.
   */
  private _createWidget(name: string, id: string): DocumentWidget {
    let factory = this._widgetFactories[name].factory;
    let widget = new DocumentWidget(name, id, this._contextManager, factory, this._widgets);
    if (!(id in this._widgets)) {
      this._widgets[id] = [];
    }
    this._widgets[id].push(widget);
    return widget;
  }

  /**
   * Create a content widget and add it to the container widget.
   */
  private _populateWidget(parent: DocumentWidget, kernel?: IKernelId): void {
    let factory = this._widgetFactories[parent.name].factory;
    let id = parent.context.id;
    let model = this._contextManager.getModel(id);
    let context = this._contextManager.getContext(id);
    let child = factory.createNew(model, context, kernel);
    parent.setContent(child);
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

  private _modelFactories: { [key: string]: Private.IModelFactoryEx } = Object.create(null);
  private _widgetFactories: { [key: string]: Private.IWidgetFactoryEx } = Object.create(null);
  private _defaultWidgetFactory = '';
  private _defaultWidgetFactories: { [key: string]: string } = Object.create(null);
  private _widgets: { [key: string]: DocumentWidget[] } = Object.create(null);
  private _contentsManager: IContentsManager = null;
  private _sessionManager: INotebookSessionManager = null;
  private _contextManager: ContextManager = null;
}


/**
 * A container widget for documents.
 */
export
class DocumentWidget extends Widget {
  /**
   * Construct a new document widget.
   */
  constructor(name: string, id: string, manager: ContextManager, factory: IWidgetFactory<Widget>, widgets: { [key: string]: DocumentWidget[] }) {
    super();
    this.addClass(DOCUMENT_CLASS);
    this.layout = new PanelLayout();
    this._name = name;
    this._id = id;
    this._manager = manager;
    this._widgets = widgets;
    this.title.closable = true;
  }

  /**
   * Get the name of the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return this._name;
  }

  /**
   * The context for the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get context(): IDocumentContext {
    return this._manager.getContext(this._id);
  }

  /**
   * Bring up a dialog to select a kernel.
   */
  selectKernel(): Promise<IKernel> {
    // TODO: the dialog should take kernel information only,
    // and return kernel information.  We then change the
    // kernel in the context.
    return void 0;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    // Remove the widget from the widget registry.
    let id = this._id;
    let index = this._widgets[id].indexOf(this);
    this._widgets[id] = this._widgets[id].splice(index, 1);
    // Dispose of the context if this is the last widget using it.
    if (!this._widgets[id].length) {
      this._manager.removeContext(id);
    }
    this._manager = null;
    this._factory = null;
    this._widgets = null;
    super.dispose();
  }

  /**
   * Set the child and context of the widget.
   *
   * #### Notes
   * This function is not intended to be called by user code.
   */
  setContent(child: Widget): void {
    let layout = this.layout as PanelLayout;
    if (layout.childAt(0)) {
      throw new Error('Content already set');
    }
    this.title.text = child.title.text;
    this.title.icon = child.title.icon;
    this.title.className = child.title.className;
    // Mirror this title based on the child.
    this.title.changed.connect(() => {
      this.parent.title.text = child.title.text;
      this.parent.title.icon = child.title.icon;
      this.parent.title.className = child.title.className;
    });
    // Add the child widget to the layout.
    (this.layout as PanelLayout).addChild(child);
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    let model = this._manager.getModel(this._id);
    let layout = this.layout as PanelLayout;
    let child = layout.childAt(0);
    // Handle dirty state.
    this._maybeClose(model.dirty).then(result => {
      if (result) {
        // Let the widget factory handle closing.
        return this._factory.beforeClose(model, this.context, child);
      }
      return result;
    }).then(result => {
      if (result) {
        // Perform close tasks.
        return this._actuallyClose();
      }
      return result;
    }).then(result => {
      if (result) {
        // Dispose of document widgets when they are closed.
        this.dispose();
      }
    }).catch(() => {
      this.dispose();
    });
  }

  /**
   * Ask the user whether to close an unsaved file.
   */
  private _maybeClose(dirty: boolean): Promise<boolean> {
    // Bail if the model is not dirty or other widgets are using the model.
    let widgets = this._widgets[this._id];
    if (!dirty || widgets.length > 1) {
      return Promise.resolve(true);
    }
    return showDialog({
      title: 'Close without saving?',
      body: `File "${this.title.text}" has unsaved changes, close without saving?`,
      host: this.node
    }).then(value => {
      if (value && value.text === 'OK') {
        return true;
      }
      return false;
    });
  }

  /**
   * Perform closing tasks for the widget.
   */
  private _actuallyClose(): Promise<boolean> {
    // Check for a dangling kernel.
    let widgets = this._widgets[this._id];
    let kernelId = this.context.kernel ? this.context.kernel.id : '';
    if (!kernelId || widgets.length > 1) {
      return Promise.resolve(true);
    }
    for (let id in this._widgets) {
      for (let widget of this._widgets[id]) {
        let kId = widget.context.kernel || widget.context.kernel.id;
        if (widget !== this && kId === kernelId) {
          return Promise.resolve(true);
        }
      }
    }
    return showDialog({
      title: 'Shut down kernel?',
      body: `Shut down ${this.context.kernel.name}?`,
      host: this.node
    }).then(value => {
      if (value && value.text === 'OK') {
        return this.context.kernel.shutdown();
      }
    }).then(() => {
      return true;
    });
  }

  private _manager: ContextManager = null;
  private _factory: IWidgetFactory<Widget> = null;
  private _id = '';
  private _name = '';
  private _widgets: { [key: string]: DocumentWidget[] } = null;
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * An extended interface for a model factory and its options.
   */
  export
  interface IModelFactoryEx extends IModelFactoryOptions {
    factory: IModelFactory;
  }

  /**
   * An extended interface for a widget factory and its options.
   */
  export
  interface IWidgetFactoryEx extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget>;
  }
}
