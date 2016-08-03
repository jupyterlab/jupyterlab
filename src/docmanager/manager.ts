// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, IKernel, IServiceManager, ISession
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IDocumentRegistry, IWidgetFactory, IWidgetFactoryOptions,
  IDocumentModel, IDocumentContext
} from '../docregistry';

import {
  IWidgetOpener
} from '../filebrowser';

import {
  ContextManager
} from './context';

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
    let opener = options.opener;
    this._contextManager = new ContextManager({
      manager: this._serviceManager,
      opener: (id: string, widget: Widget) => {
        this._widgetManager.adoptWidget(id, widget);
        opener.open(widget);
        return new DisposableDelegate(() => {
          widget.close();
        });
      }
    });
    this._widgetManager = new DocumentWidgetManager({
      contextManager: this._contextManager,
      registry: this._registry
    });
  }

  /**
   * Get the kernel spec models for the manager.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelspecs(): IKernel.ISpecModels {
    return this._serviceManager.kernelspecs;
  }

  /**
   * Get the registry used by the manager.
   *
   * #### Notes
   * This is a read-only property.
   */
  get registry(): IDocumentRegistry {
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
    this._contextManager.dispose();
    this._contextManager = null;
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
  open(path: string, widgetName='default', kernel?: IKernel.IModel): Widget {
    let registry = this._registry;
    if (widgetName === 'default') {
      widgetName = registry.defaultWidgetFactory(ContentsManager.extname(path));
    }
    let mFactory = registry.getModelFactoryFor(widgetName);
    if (!mFactory) {
      return;
    }
    // Use an existing context if available.
    let id = this._contextManager.findContext(path, mFactory.name);
    if (id) {
      return this._widgetManager.createWidget(widgetName, id, kernel);
    }
    let lang = mFactory.preferredLanguage(path);
    let model = mFactory.createNew(lang);
    id = this._contextManager.createNew(path, model, mFactory);
    // Load the contents from disk.
    this._contextManager.revert(id).then(() => {
      model.dirty = false;
      this._contextManager.finalize(id);
    });
    return this._widgetManager.createWidget(widgetName, id, kernel);
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
  createNew(path: string, widgetName='default', kernel?: IKernel.IModel): Widget {
    let registry = this._registry;
    if (widgetName === 'default') {
      widgetName = registry.defaultWidgetFactory(ContentsManager.extname(path));
    }
    let mFactory = registry.getModelFactoryFor(widgetName);
    if (!mFactory) {
      return;
    }
    let lang = mFactory.preferredLanguage(path);
    let model = mFactory.createNew(lang);
    let id = this._contextManager.createNew(path, model, mFactory);
    this._contextManager.save(id).then(() => {
      model.dirty = false;
      this._contextManager.finalize(id);
    });
    return this._widgetManager.createWidget(widgetName, id, kernel);
  }

  /**
   * List the running notebook sessions.
   */
  listSessions(): Promise<ISession.IModel[]> {
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
    this._contextManager.handleRename(oldPath, newPath);
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
      widgetName = this._registry.defaultWidgetFactory(ContentsManager.extname(path));
    }
    return this._widgetManager.findWidget(path, widgetName);
  }

  /**
   * Get the document context for a widget.
   */
  contextForWidget(widget: Widget): IDocumentContext<IDocumentModel> {
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
    this._widgetManager.closeFile(path);
  }

  /**
   * Close all of the open documents.
   */
  closeAll(): void {
    this._widgetManager.closeAll();
  }

  private _serviceManager: IServiceManager = null;
  private _contextManager: ContextManager = null;
  private _widgetManager: DocumentWidgetManager = null;
  private _registry: IDocumentRegistry = null;
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
    registry: IDocumentRegistry;

    /**
     * A service manager instance.
     */
    manager: IServiceManager;

    /**
     * A widget opener for sibling widgets.
     */
    opener: IWidgetOpener;
  }
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * An extended interface for a widget factory and its options.
   */
  export
  interface IWidgetFactoryEx extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget, IDocumentModel>;
  }
}
