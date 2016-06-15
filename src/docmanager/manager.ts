// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernelId,
  IContentsManager, INotebookSessionManager,
  IKernelSpecIds, ISessionId
} from 'jupyter-js-services';

import {
  IDisposable, DisposableDelegate, DisposableSet
} from 'phosphor-disposable';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

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
  DocumentRegistry, IDocumentContext, IWidgetFactory, IWidgetFactoryOptions
} from '../docregistry';

import {
  ContextManager
} from './context';


/**
 * The class name added to a document wrapper widgets.
 */
const DOCUMENT_CLASS = 'jp-DocumentWrapper';


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
  constructor(registry: DocumentRegistry, contentsManager: IContentsManager, sessionManager: INotebookSessionManager, kernelspecs: IKernelSpecIds, opener: IWidgetOpener) {
    this._registry = registry;
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._specs = kernelspecs;
    this._contextManager = new ContextManager(contentsManager, sessionManager, kernelspecs, (id: string, widget: Widget) => {
      let parent = this._createWidget('', id);
      parent.setContent(widget);
      opener.open(parent);
      return new DisposableDelegate(() => {
        parent.close();
      });
    });
  }

  /**
   * Get the kernel spec ids for the manager.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelspecs(): IKernelSpecIds {
    return this._specs;
  }

  /**
   * Get the registry used by the manager.
   *
   * #### Notes
   * This is a read-only property.
   */
  get registry(): DocumentRegistry {
    return this._registry;
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
   * Open a file and return the widget used to display the contents.
   *
   * @param path - The file path to open.
   *
   * @param widgetName - The name of the widget factory to use.
   *
   * @param kernel - An optional kernel name/id to override the default.
   */
  open(path: string, widgetName='default', kernel?: IKernelId): DocumentWrapper {
    let registry = this._registry;
    if (widgetName === 'default') {
      let parts = path.split('.');
      let ext: string;
      if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
        ext = '';
      } else {
        ext = '.' + parts.pop().toLowerCase();
      }
      widgetName = registry.listWidgetFactories(ext)[0];
    }
    let mFactory = registry.getModelFactory(widgetName);
    if (!mFactory) {
      return;
    }
    let widget: DocumentWrapper;
    // Use an existing context if available.
    let id = this._contextManager.findContext(path, mFactory.name);
    if (id) {
      widget = this._createWidget(widgetName, id);
      this._populateWidget(widget, kernel);
      return widget;
    }
    let lang = mFactory.preferredLanguage(path);
    let model = mFactory.createNew(lang);
    id = this._contextManager.createNew(path, model, mFactory);
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
  createNew(path: string, widgetName='default', kernel?: IKernelId): DocumentWrapper {
    let registry = this._registry;
    if (widgetName === 'default') {
      let parts = path.split('.');
      let ext: string;
      if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
        ext = '';
      } else {
        ext = '.' + parts.pop().toLowerCase();
      }
      widgetName = registry.listWidgetFactories(ext)[0];
    }
    let mFactory = registry.getModelFactory(widgetName);
    if (!mFactory) {
      return;
    }
    let lang = mFactory.preferredLanguage(path);
    let model = mFactory.createNew(lang);
    let id = this._contextManager.createNew(path, model, mFactory);
    let widget = this._createWidget(widgetName, id);
    // Save the contents to disk to get a valid contentsModel for the
    // context.
    this._contextManager.save(id).then(() => {
      this._populateWidget(widget, kernel);
    });
    return widget;
  }

  /**
   * List the running notebook sessions.
   */
  listSessions(): Promise<ISessionId[]> {
    return this._sessionManager.listRunning();
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
  findWidget(path: string, widgetName='default'): DocumentWrapper {
    let ids = this._contextManager.getIdsForPath(path);
    if (widgetName === 'default') {
      widgetName = this._registry.defaultWidgetFactory;
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
  clone(widget: DocumentWrapper): DocumentWrapper {
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
      let widgets: DocumentWrapper[] = this._widgets[id] || [];
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
  private _createWidget(name: string, id: string): DocumentWrapper {
    let factory = this._registry.getWidgetFactory(name);
    let widget = new DocumentWrapper(name, id, this._contextManager, factory, this._widgets);
    if (!(id in this._widgets)) {
      this._widgets[id] = [];
    }
    this._widgets[id].push(widget);
    return widget;
  }

  /**
   * Create a content widget and add it to the container widget.
   */
  private _populateWidget(parent: DocumentWrapper, kernel?: IKernelId): void {
    let factory = this._registry.getWidgetFactory(parent.name);
    let id = parent.context.id;
    let model = this._contextManager.getModel(id);
    model.initialize();
    let context = this._contextManager.getContext(id);
    let child = factory.createNew(model, context, kernel);
    parent.setContent(child);
    // Handle widget extensions.
    let disposables = new DisposableSet();
    for (let extender of this._registry.getWidgetExtensions(parent.name)) {
      disposables.add(extender.createNew(child, model, context));
    }
    parent.disposed.connect(() => {
      disposables.dispose();
    });
  }

  private _widgets: { [key: string]: DocumentWrapper[] } = Object.create(null);
  private _contentsManager: IContentsManager = null;
  private _sessionManager: INotebookSessionManager = null;
  private _contextManager: ContextManager = null;
  private _specs: IKernelSpecIds = null;
  private _registry: DocumentRegistry = null;
}


/**
 * A container widget for documents.
 */
export
class DocumentWrapper extends Widget {
  /**
   * A signal emitted when the document widget is populated.
   */
  get populated(): ISignal<DocumentWrapper, Widget> {
    return Private.populatedSignal.bind(this);
  }

  /**
   * Construct a new document widget.
   */
  constructor(name: string, id: string, manager: ContextManager, factory: IWidgetFactory<Widget>, widgets: { [key: string]: DocumentWrapper[] }) {
    super();
    this.addClass(DOCUMENT_CLASS);
    this.layout = new PanelLayout();
    this._name = name;
    this._id = id;
    this._manager = manager;
    this._widgets = widgets;
    this._factory = factory;
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
   * The content widget used by the document widget.
   */
  get content(): Widget {
    let layout = this.layout as PanelLayout;
    return layout.childAt(0);
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
    this._widgets[id].splice(index, 1);
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
   * Set the child the widget.
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
    child.title.changed.connect(() => {
      this.title.text = child.title.text;
      this.title.icon = child.title.icon;
      this.title.className = child.title.className;
    });
    // Add the child widget to the layout.
    (this.layout as PanelLayout).addChild(child);
    this.populated.emit(child);
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
  private _widgets: { [key: string]: DocumentWrapper[] } = null;
}


/**
 * A private namespace for DocumentManager data.
 */
namespace Private {
  /**
   * A signal emitted when the document widget is populated.
   */
  export
  const populatedSignal = new Signal<DocumentWrapper, Widget>();

  /**
   * An extended interface for a widget factory and its options.
   */
  export
  interface IWidgetFactoryEx extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget>;
  }
}
