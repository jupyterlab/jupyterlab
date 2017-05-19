// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.


import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  ModelDB, PathExt, uuid
} from '@jupyterlab/coreutils';

import {
  DocumentRegistry, Context
} from '@jupyterlab/docregistry';

import {
  Contents, Kernel, ServiceManager
} from '@jupyterlab/services';

import {
  ArrayExt, each, find, map, toArray
} from '@phosphor/algorithm';

import {
  Token
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';

import {
  SaveHandler
} from './savehandler';

import {
  DocumentWidgetManager
} from './widgetmanager';


/* tslint:disable */
/**
 * The document registry token.
 */
export
const IDocumentManager = new Token<IDocumentManager>('jupyter.services.document-manager');
/* tslint:enable */


/**
 * The interface for a document manager.
 */
export
interface IDocumentManager extends DocumentManager {}


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
  constructor(options: DocumentManager.IOptions) {
    this.registry = options.registry;
    this.services = options.manager;

    this._opener = options.opener;
    this._modelDBFactory = options.modelDBFactory;

    let widgetManager = new DocumentWidgetManager({ registry: this.registry });
    widgetManager.activateRequested.connect(this._onActivateRequested, this);
    this._widgetManager = widgetManager;
  }

  /**
   * The registry used by the manager.
   */
  readonly registry: DocumentRegistry;

  /**
   * The service manager used by the manager.
   */
  readonly services: ServiceManager.IManager;

  /**
   * A signal emitted when one of the documents is activated.
   */
  get activateRequested(): ISignal<this, string> {
    return this._activateRequested;
  }

  /**
   * The current working directory of the document manager.
   *
   * #### Notes
   * This attribute is DEPRECATED. It is intended for use as a stopgap measure
   * to create some notion of an application-level working directory for
   * launching activities that need a sensible starting directory. It will be
   * replaced with another concept in later releases.
   */
  get cwd(): string {
    return this._cwd;
  }
  set cwd(cwd: string) {
    this._cwd = cwd;
  }

  /**
   * Get whether the document manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._widgetManager === null;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    if (this._widgetManager === null) {
      return;
    }

    let widgetManager = this._widgetManager;
    this._widgetManager = null;
    Signal.clearData(this);
    each(toArray(this._contexts), context => {
      widgetManager.closeWidgets(context);
    });
    widgetManager.dispose();
    this._contexts.length = 0;
  }

  /**
   * Clone a widget.
   *
   * @param widget - The source widget.
   *
   * @returns A new widget or `undefined`.
   *
   * #### Notes
   *  Uses the same widget factory and context as the source, or returns
   *  `undefined` if the source widget is not managed by this manager.
   */
  cloneWidget(widget: Widget): Widget {
    return this._widgetManager.cloneWidget(widget);
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): Promise<void> {
    return Promise.all(
      toArray(map(this._contexts, context => {
        return this._widgetManager.closeWidgets(context);
      }))
    ).then(() => undefined);
  }

  /**
   * Close the widgets associated with a given path.
   *
   * @param path - The target path.
   */
  closeFile(path: string): Promise<void> {
    let context = this._contextForPath(path);
    if (context) {
      return this._widgetManager.closeWidgets(context);
    }
    return Promise.resolve(void 0);
  }

  /**
   * Get the document context for a widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The context associated with the widget, or `undefined`.
   */
  contextForWidget(widget: Widget): DocumentRegistry.Context {
    return this._widgetManager.contextForWidget(widget);
  }

  /**
   * Copy a file.
   *
   * @param fromFile - The path of the original file.
   *
   * @param toDir - The path to the target directory.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise which resolves to the contents of the file.
   */
  copy(fromFile: string, toDir: string, basePath = ''): Promise<Contents.IModel> {
    fromFile = PathExt.resolve(basePath, fromFile);
    toDir = PathExt.resolve(basePath, toDir);
    return this.services.contents.copy(fromFile, toDir);
  }

  /**
   * Create a new file and return the widget used to view it.
   *
   * @param path - The file path to create.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  createNew(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    return this._createOrOpenDocument('create', path, widgetName, kernel);
  }

  /**
   * Delete a file.
   *
   * @param path - The path to the file to be deleted.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise which resolves when the file is deleted.
   *
   * #### Notes
   * If there is a running session associated with the file and no other
   * sessions are using the kernel, the session will be shut down.
   */
  deleteFile(path: string, basePath = ''): Promise<void> {
    path = PathExt.resolve(basePath, path);
    return this.services.sessions.stopIfNeeded(path).then(() => {
      return this.services.contents.delete(path);
    });
  }

  /**
   * See if a widget already exists for the given path and widget name.
   *
   * @param path - The file path to use.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @returns The found widget, or `undefined`.
   *
   * #### Notes
   * This can be used to use an existing widget instead of opening
   * a new widget.
   */
  findWidget(path: string, widgetName='default'): Widget {
    if (widgetName === 'default') {
      let extname = DocumentRegistry.extname(path);
      let factory = this.registry.defaultWidgetFactory(extname);
      if (!factory) {
        return;
      }
      widgetName = factory.name;
    }
    let context = this._contextForPath(path);
    if (context) {
      return this._widgetManager.findWidget(context, widgetName);
    }
  }

  /**
   * Create a new untitled file.
   *
   * @param options - The file content creation options.
   */
  newUntitled(options: Contents.ICreateOptions): Promise<Contents.IModel> {
    if (options.type === 'file') {
      options.ext = options.ext || '.txt';
    }
    return this.services.contents.newUntitled(options);
  }

  /**
   * Open a file and return the widget used to view it.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  open(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    return this._createOrOpenDocument('open', path, widgetName, kernel);
  }

  /**
   * Open a file and return the widget used to view it.
   * Reveals an already existing editor.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   *
   * @returns The created widget, or `undefined`.
   *
   * #### Notes
   * This function will return `undefined` if a valid widget factory
   * cannot be found.
   */
  openOrReveal(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let widget = this.findWidget(path, widgetName);
    if (widget) {
      this._opener.open(widget);
      return widget;
    }
    return this.open(path, widgetName, kernel);
  }

  /**
   * Overwrite a file.
   *
   * @param oldPath - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise containing the new file contents model.
   */
  overwrite(oldPath: string, newPath: string, basePath = ''): Promise<Contents.IModel> {
    // Cleanly overwrite the file by moving it, making sure the original does
    // not exist, and then renaming to the new path.
    const tempPath = `${newPath}.${uuid()}`;
    const cb = () => this.rename(tempPath, newPath, basePath);
    return this.rename(oldPath, tempPath, basePath).then(() => {
      return this.deleteFile(newPath, basePath);
    }).then(cb, cb);
  }

  /**
   * Rename a file or directory.
   *
   * @param oldPath - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise containing the new file contents model.  The promise
   * will reject if the newPath already exists.  Use [[overwrite]] to overwrite
   * a file.
   */
  rename(oldPath: string, newPath: string, basePath = ''): Promise<Contents.IModel> {
    oldPath = PathExt.resolve(basePath, oldPath);
    newPath = PathExt.resolve(basePath, newPath);
    return this.services.contents.rename(oldPath, newPath);
  }

  /**
   * Find a context for a given path and factory name.
   */
  private _findContext(path: string, factoryName: string): Private.IContext {
    return find(this._contexts, context => {
      return context.factoryName === factoryName && context.path === path;
    });
  }

  /**
   * Get a context for a given path.
   */
  private _contextForPath(path: string): Private.IContext {
    return find(this._contexts, context => context.path === path);
  }

  /**
   * Create a context from a path and a model factory.
   */
  private _createContext(path: string, factory: DocumentRegistry.ModelFactory, kernelPreference: IClientSession.IKernelPreference): Private.IContext {
    let adopter = (widget: Widget) => {
      this._widgetManager.adoptWidget(context, widget);
      this._opener.open(widget);
    };
    let modelDBFactory = this.services.contents.getModelDBFactory(path) || null;
    let context = new Context({
      opener: adopter,
      manager: this.services,
      factory,
      path,
      kernelPreference,
      modelDBFactory
    });
    let handler = new SaveHandler({
      context,
      manager: this.services
    });
    Private.saveHandlerProperty.set(context, handler);
    context.ready.then(() => {
      handler.start();
    });
    context.disposed.connect(this._onContextDisposed, this);
    this._contexts.push(context);
    return context;
  }

  /**
   * Handle a context disposal.
   */
  private _onContextDisposed(context: Private.IContext): void {
    ArrayExt.removeFirstOf(this._contexts, context);
  }

  /**
   * Get the model factory for a given widget name.
   */
  private _widgetFactoryFor(path: string, widgetName: string): DocumentRegistry.WidgetFactory {
    let { registry } = this;
    if (widgetName === 'default') {
      let extname = DocumentRegistry.extname(path);
      let factory = registry.defaultWidgetFactory(extname);
      if (!factory) {
        return;
      }
      widgetName = factory.name;
    }
    return registry.getWidgetFactory(widgetName);
  }

  /**
   * Creates a new document, or loads one from disk, depending on the `which` argument.
   * If `which==='create'`, then it creates a new document. If `which==='open'`,
   * then it loads the document from disk.
   *
   * The two cases differ in how the document context is handled, but the creation
   * of the widget and launching of the kernel are identical.
   */
  private _createOrOpenDocument(which: 'open'|'create', path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let widgetFactory = this._widgetFactoryFor(path, widgetName);
    if (!widgetFactory) {
      return;
    }
    let factory = this.registry.getModelFactory(widgetFactory.modelName);
    if (!factory) {
      return;
    }

    // Handle the kernel pereference.
    let ext = DocumentRegistry.extname(path);
    let preference = this.registry.getKernelPreference(
      ext, widgetFactory.name, kernel
    );

    let context: Private.IContext = null;

    // Handle the load-from-disk case
    if (which === 'open') {
      // Use an existing context if available.
      context = this._findContext(path, factory.name);
      if (!context) {
        context = this._createContext(path, factory, preference);
        // Populate the model, either from disk or a
        // model backend.
        context.fromStore();
      }
    } else if (which === 'create') {
      context = this._createContext(path, factory, preference);
      // Immediately save the contents to disk.
      context.save();
    }

    let widget = this._widgetManager.createWidget(widgetFactory.name, context);
    this._opener.open(widget);
    return widget;
  }

  /**
   * Handle an activateRequested signal from the widget manager.
   */
  private _onActivateRequested(sender: DocumentWidgetManager, args: string): void {
    this._activateRequested.emit(args);
  }

  private _activateRequested = new Signal<this, string>(this);
  private _contexts: Private.IContext[] = [];
  private _cwd: string = '';
  private _modelDBFactory: ModelDB.IFactory = null;
  private _opener: DocumentManager.IWidgetOpener = null;
  private _widgetManager: DocumentWidgetManager = null;
}


/**
 * A namespace for document manager statics.
 */
export
namespace DocumentManager {
  /**
   * The options used to initialize a document manager.
   */
  export
  interface IOptions {
    /**
     * A document registry instance.
     */
    registry: DocumentRegistry;

    /**
     * A service manager instance.
     */
    manager: ServiceManager.IManager;

    /**
     * A widget opener for sibling widgets.
     */
    opener: IWidgetOpener;

    /**
     * An `IModelDB` backend factory method.
     */
    modelDBFactory?: ModelDB.IFactory;
  }

  /**
   * An interface for a widget opener.
   */
  export
  interface IWidgetOpener {
    /**
     * Open the given widget.
     */
    open(widget: Widget): void;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for a context save handler.
   */
  export
  const saveHandlerProperty = new AttachedProperty<DocumentRegistry.Context, SaveHandler>({
    name: 'saveHandler',
    create: () => null
  });

  /**
   * A type alias for a standard context.
   */
  export
  interface IContext extends Context<DocumentRegistry.IModel> {};
}
