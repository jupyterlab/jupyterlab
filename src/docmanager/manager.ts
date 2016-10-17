// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Kernel, IServiceManager, Session
} from '@jupyterlab/services';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  find
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  DocumentRegistry, Context
} from '../docregistry';

import {
  FileBrowser
} from '../filebrowser';

import {
  DocumentWidgetManager
} from './widgetmanager';


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
    this._registry = options.registry;
    this._serviceManager = options.manager;
    this._opener = options.opener;
    this._widgetManager = new DocumentWidgetManager({
      registry: this._registry
    });
  }

  /**
   * Get the kernel spec models for the manager.
   */
  get kernelspecs(): Kernel.ISpecModels {
    return this._serviceManager.kernelspecs;
  }

  /**
   * Get the registry used by the manager.
   */
  get registry(): DocumentRegistry {
    return this._registry;
  }

  /**
   * Get whether the document manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._serviceManager === null;
  }

  /**
   * Dispose of the resources held by the document manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._serviceManager = null;
    each(this._contexts, context => {
      context.dispose();
    });
    this._contexts.clear();
    this._widgetManager.dispose();
    this._widgetManager = null;
  }

  /**
   * Open a file and return the widget used to display the contents.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   */
  open(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let factory = this._modelFactoryFor(path, widgetName);
    if (!factory) {
      return;
    }
    // Use an existing context if available.
    let context = this._findContext(path, factory.name);
    if (!context) {
      context = this._createContext(path, factory);
      // Load the contents from disk.
      context.revert();
    }
    let widget = this._widgetManager.createWidget(widgetName, context, kernel);
    this._opener.open(widget);
    return widget;
  }

  /**
   * Create a new file of the given name.
   *
   * @param path - The file path to use.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * @param kernel - An optional kernel name/id to override the default.
   */
  createNew(path: string, widgetName='default', kernel?: Kernel.IModel): Widget {
    let factory = this._modelFactoryFor(path, widgetName);
    if (!factory) {
      return;
    }
    let context = this._createContext(path, factory);
    // Immediately save the contents to disk.
    context.save();
    let widget = this._widgetManager.createWidget(widgetName, context, kernel);
    this._opener.open(widget);
    return widget;
  }

  /**
   * List the running notebook sessions.
   */
  listSessions(): Promise<Session.IModel[]> {
    return this._serviceManager.sessions.listRunning();
  }

  /**
   * Handle the renaming of an open document.
   *
   * @param oldPath - The previous path.
   *
   * @param newPath - The new path.
   */
  handleRename(oldPath: string, newPath: string): void {
    each(this._contexts, context => {
      if (context.path === oldPath) {
        context.setPath(newPath);
      }
    });
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
   * @param path - The file path to use.
   *
   * @param widgetName - The name of the widget factory to use. 'default' will use the default widget.
   *
   * #### Notes
   * This can be used to use an existing widget instead of opening
   * a new widget.
   */
  findWidget(path: string, widgetName='default'): Widget {
    if (widgetName === 'default') {
      widgetName = this._registry.preferredWidgetFactories(ContentsManager.extname(path)).next().name;
    }
    let context = this._contextForPath(path);
    if (context) {
      return this._widgetManager.findWidget(context, widgetName);
    }
  }

  /**
   * Get the document context for a widget.
   */
  contextForWidget(widget: Widget): DocumentRegistry.IContext<DocumentRegistry.IModel> {
    return this._widgetManager.contextForWidget(widget);
  }

  /**
   * Clone a widget.
   *
   * #### Notes
   * This will create a new widget with the same model and context
   * as this widget.
   */
  clone(widget: Widget): Widget {
    return this._widgetManager.clone(widget);
  }

  /**
   * Close the widgets associated with a given path.
   */
  closeFile(path: string): void {
    let context = this._contextForPath(path);
    this._widgetManager.close(context);
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {
    each(this._contexts, context => {
      this._widgetManager.close(context);
    });
  }

  /**
   * Find a context for a given path and factory name.
   */
  private _findContext(path: string, factoryName: string): Context<DocumentRegistry.IModel> {
    return find(this._contexts, context => {
      return (context.factoryName === factoryName &&
              context.path === path);
    });
  }

  /**
   * Get a context for a given path.
   */
  private _contextForPath(path: string): Context<DocumentRegistry.IModel> {
    return find(this._contexts, context => {
      return context.path === path;
    });
  }

  /**
   * Create a context from a path and a model factory.
   */
  private _createContext(path: string, factory: DocumentRegistry.IModelFactory<DocumentRegistry.IModel>): Context<DocumentRegistry.IModel> {
    let adopter = (widget: Widget) => {
      this._widgetManager.adoptWidget(context, widget);
      this._opener.open(widget);
    };
    let context = new Context({
      opener: adopter,
      manager: this._serviceManager,
      factory,
      path
    });
    context.disposed.connect(() => {
      this._contexts.remove(context);
    });
    this._contexts.pushBack(context);
    return context;
  }

  /**
   * Get the model factory for a given widget name.
   */
  private _modelFactoryFor(path: string, widgetName: string): DocumentRegistry.IModelFactory<DocumentRegistry.IModel> {
    let registry = this._registry;
    if (widgetName === 'default') {
      widgetName = registry.preferredWidgetFactories(ContentsManager.extname(path)).next().name;
    }
    let widgetFactory = registry.getWidgetFactory(widgetName);
    return registry.getModelFactory(widgetFactory.modelName);
  }

  private _serviceManager: IServiceManager = null;
  private _widgetManager: DocumentWidgetManager = null;
  private _registry: DocumentRegistry = null;
  private _contexts: Vector<Context<DocumentRegistry.IModel>> = new Vector<Context<DocumentRegistry.IModel>>();
  private _opener: DocumentManager.IWidgetOpener = null;
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
    manager: IServiceManager;

    /**
     * A widget opener for sibling widgets.
     */
    opener: IWidgetOpener;
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
