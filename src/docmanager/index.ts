// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IKernelId, IKernelSpecId, IContentsOpts, IKernel,
  INotebookSession, IContentsManager, INotebookSessionManager,
  IKernelSpecIds, ISessionId
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  IMessageFilter, IMessageHandler, Message, installMessageFilter
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

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

import {
  IWidgetOpener
} from '../filebrowser/browser';

import {
  ContextManager
} from './context';


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
   * A signal emitted when the model dirty state changes.
   */
  dirtyChanged: ISignal<IDocumentModel, boolean>;

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
   * The dirty state of the model.
   *
   * #### Notes
   * This should be cleared when the document is loaded from
   * or saved to disk.
   */
  dirty: boolean;

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
 * The document context object.
 */
export interface IDocumentContext {
  /**
   * The unique id of the context.
   *
   * #### Notes
   * This is a read-only property.
   */
  id: string;

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<IDocumentContext, IKernel>;

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<IDocumentContext, string>;

  /**
   * Get the current kernel associated with the document.
   */
  getKernel(): IKernel;

  /**
   * Get the current path associated with the document.
   */
  getPath(): string;

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
interface IWidgetFactory<T extends Widget> {
  /**
   * Create a new widget.
   */
  createNew(model: IDocumentModel, context: IDocumentContext, kernel: IKernelId): T;

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
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager, opener: IWidgetOpener) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._contextManager = new ContextManager(contentsManager, sessionManager, (id: string, widget: Widget) => {
      let parent = new Widget();
      this._attachChild(parent, widget);
      Private.contextProperty.set(widget, id);
      opener.open(parent);
      return new DisposableDelegate(() => {
        parent.dispose();
      });
    });
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
    let name = options.displayName;
    let exOpt = options as Private.IWidgetFactoryEx;
    exOpt.factory = factory;
    this._widgetFactories[name] = exOpt;
    if (options.defaultFor) {
      for (let option of options.defaultFor) {
        if (option === '.*') {
          this._defaultWidgetFactory = name;
        }
        if (option in options.fileExtensions) {
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
   * If a factory with the given `name` is already registered, the
   * factory will be ignored and a warning will be printed to the console.
   */
  registerModelFactory(factory: IModelFactory, options: IModelFactoryOptions): IDisposable {
    let exOpt = options as Private.IModelFactoryEx;
    let name = options.name;
    exOpt.factory = factory;
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
    // Add the default widget if it was not already added.
    if (name !== this._defaultWidgetFactory && this._defaultWidgetFactory) {
      name = this._defaultWidgetFactory;
      options = this._widgetFactories[name];
      if (options.modelName in this._modelFactories) {
        factories.push(name);
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
    // TODO: if the context already exists, use it.
    let widget = new Widget();
    let manager = this._contentsManager;
    let mFactoryEx: Private.IModelFactoryEx;
    if (widgetName !== 'default') {
      mFactoryEx = this._getModelFactoryEx(widgetName);
    } else {
      widgetName = this.listWidgetFactories(path)[0];
      mFactoryEx = this._getModelFactoryEx(widgetName);
    }
    let lang = mFactoryEx.factory.preferredLanguage(path);
    let model = mFactoryEx.factory.createNew(lang);
    let opts = mFactoryEx.contentsOptions;
    manager.get(path, opts).then(contents => {
      model.deserialize(contents.content);
      model.dirty = false;
      this._createWidget(path, opts, model, widgetName, widget, kernel);
    });
    installMessageFilter(widget, this);
    Private.widgetFactoryProperty.set(widget, widgetName);
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
    let mFactoryEx: Private.IModelFactoryEx;
    if (widgetName !== 'default') {
      mFactoryEx = this._getModelFactoryEx(widgetName);
    } else {
      widgetName = this.listWidgetFactories(path)[0];
      mFactoryEx = this._getModelFactoryEx(widgetName);
    }
    if (!mFactoryEx) {
      return;
    }
    let lang = mFactoryEx.factory.preferredLanguage(path);
    let model = mFactoryEx.factory.createNew(lang);
    let opts = mFactoryEx.contentsOptions;
    opts.content = model.serialize();
    manager.save(path, opts).then(content => {
      this._createWidget(path, opts, model, widgetName, widget, kernel);
    });
    installMessageFilter(widget, this);
    Private.factoryProperty.set(widget, widgetName);
    return widget;
  }

  /**
   * Find the path given a widget.
   */
  findPath(widget: Widget): string {
    let id = Private.contextProperty.get(widget);
    return this._contextManager.getPath(id);
  }

  /**
   * Filter messages on the widget.
   */
  filterMessage(handler: IMessageHandler, msg: Message): boolean {
    let widget = handler as Widget;
    let child = (widget.layout as PanelLayout).childAt(0);
    if (msg.type === 'close-request') {
      if (this._closeGuard) {
        this._closeGuard = false;
        return false;
      }
      let id = Private.contextProperty.get(widget);
      let model = this._contextManager.getModel(id);
      let context = this._contextManager.getContext(id);
      let factoryName = Private.factoryProperty.get(widget);
      factoryName = factoryName || this._defaultWidgetFactory;
      let factory = this._widgetFactories[factoryName].factory;
      if (!model.dirty) {
        factory.beforeClose(model, context, child).then(result => {
          if (result) {
            this._closeGuard = true;
            widget.close();
          }
        });
      } else {
        this._maybeClose(widget).then(result => {
          if (!result) {
            return;
          }
          factory.beforeClose(model, context, child).then(result => {
            if (result) {
              this._closeGuard = true;
              widget.close();
            }
          });
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Update the path of an open document.
   *
   * @param oldPath - The previous path.
   *
   * @param newPath - The new path.
   */
  renameFile(oldPath: string, newPath: string): Promise<void> {
    // TODO: find the appropriate context.
    //return this._contextManager.rename(id, newPath);
    return void 0;
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
    // TODO: find the appropriate context.
    //return this._contextManager.save(id);
    return void 0;
  }

  /**
   * Revert the document contents to disk contents.
   */
  revertFile(path: string): Promise<void> {
    // TODO: find the appropriate context.
    //return this._contextManager.revert(id);
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
  private _createWidget(path: string, options: IContentsOpts, model: IDocumentModel, widgetName: string, parent: Widget, kernel?:IKernelId): void {
    let wFactoryEx = this._getWidgetFactoryEx(widgetName);
    let context = this._contextManager.createNew(path, model, options);
    Private.contextProperty.set(parent, context.id);
    // Create the child widget using the factory.
    let child = wFactoryEx.factory.createNew(model, context, kernel);
    this._attachChild(parent, child);
  }

  /**
   * Attach a child widget to a parent container.
   */
  private _attachChild(parent: Widget, child: Widget) {
    parent.layout = new PanelLayout();
    parent.title.closable = true;
    parent.title.text = child.title.text;
    parent.title.icon = child.title.icon;
    parent.title.className = child.title.className;
    // Mirror the parent title based on the child.
    child.title.changed.connect(() => {
      child.parent.title.text = child.title.text;
      child.parent.title.icon = child.title.icon;
      child.parent.title.className = child.title.className;
    });
    // Add the child widget to the parent widget.
    (parent.layout as PanelLayout).addChild(child);
  }

  /**
   * Ask the user whether to close an unsaved file.
   */
  private _maybeClose(widget: Widget): Promise<boolean> {
    let host = widget.isAttached ? widget.node : document.body;
    return showDialog({
      title: 'Close without saving?',
      body: `File "${widget.title.text}" has unsaved changes, close without saving?`,
      host
    }).then(value => {
      if (value && value.text === 'OK') {
        return true;
      }
      return false;
    });
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
  private _contentsManager: IContentsManager = null;
  private _sessionManager: INotebookSessionManager = null;
  private _contextManager: ContextManager = null;
  private _closeGuard = false;
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

  export
  interface IModelFactoryEx extends IModelFactoryOptions {
    factory: IModelFactory;
  }

  export
  interface IWidgetFactoryEx extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget>;
  }

  export
  const factoryProperty = new Property<Widget, string>({
    name: 'factory'
  });

  export
  const contextProperty = new Property<Widget, string>({
    name: 'context'
  });
}
