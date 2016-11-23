// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Kernel, ServiceManager
} from '@jupyterlab/services';

import {
  each, toArray
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
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  DocumentRegistry, Context
} from '../docregistry';

import {
  SaveHandler
} from './savehandler';

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
   * Get the registry used by the manager.
   */
  get registry(): DocumentRegistry {
    return this._registry;
  }

  /**
   * Get the service manager used by the manager.
   */
  get services(): ServiceManager.IManager {
    return this._serviceManager;
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
    this._widgetManager = null;
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
      let factory = this._registry.defaultWidgetFactory(ContentsManager.extname(path));
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
   * Get the document context for a widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The context associated with the widget, or `undefined`.
   */
  contextForWidget(widget: Widget): DocumentRegistry.IContext<DocumentRegistry.IModel> {
    return this._widgetManager.contextForWidget(widget);
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
   * Close the widgets associated with a given path.
   *
   * @param path - The target path.
   */
  closeFile(path: string): void {
    let context = this._contextForPath(path);
    if (context) {
      this._widgetManager.closeWidgets(context);
    }
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {
    each(toArray(this._contexts), context => {
      this._widgetManager.closeWidgets(context);
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
    let handler = new SaveHandler({
      context,
      manager: this._serviceManager
    });
    Private.saveHandlerProperty.set(context, handler);
    context.ready.then(() => {
      handler.start();
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
  private _widgetFactoryFor(path: string, widgetName: string): DocumentRegistry.IWidgetFactory<Widget, DocumentRegistry.IModel> {
    let registry = this._registry;
    if (widgetName === 'default') {
      let factory = registry.defaultWidgetFactory(ContentsManager.extname(path));
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
    let factory = this._registry.getModelFactory(widgetFactory.modelName);
    if (!factory) {
      return;
    }

    let context: Context<DocumentRegistry.IModel> = null;

    //Handle the load-from-disk case
    if(which === 'open') {
      // Use an existing context if available.
      context = this._findContext(path, factory.name);
      if (!context) {
        context = this._createContext(path, factory);
        // Load the contents from disk.
        context.revert();
      }
    } else if (which === 'create') {
      context = this._createContext(path, factory);
      // Immediately save the contents to disk.
      context.save();
    }

    // Maybe launch/connect the kernel for the context.
    if (kernel && (kernel.id || kernel.name) && widgetFactory.canStartKernel) {
      // If the kernel is valid and the widgetFactory wants one.
      context.changeKernel(kernel);
    } else if (widgetFactory.preferKernel &&
               !(kernel && !kernel.id && !kernel.name) &&
               !context.kernel) {
      //If the kernel is not the `None` kernel and the widgetFactory wants one
      context.startDefaultKernel();
    }

    let widget = this._widgetManager.createWidget(widgetFactory.name, context);
    this._opener.open(widget);
    return widget;
  }

  private _serviceManager: ServiceManager.IManager = null;
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
    manager: ServiceManager.IManager;

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


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for a context save handler.
   */
  export
  const saveHandlerProperty = new AttachedProperty<DocumentRegistry.IContext<DocumentRegistry.IModel>, SaveHandler>({
    name: 'saveHandler'
  });
}
