// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IContents, IKernel, ISession
} from 'jupyter-js-services';

import * as utils
  from 'jupyter-js-utils';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  IDocumentContext, IDocumentModel, IModelFactory
} from '../docregistry';


/**
 * An implementation of a document context.
 */
class Context implements IDocumentContext<IDocumentModel> {
  /**
   * Construct a new document context.
   */
  constructor(manager: ContextManager) {
    this._manager = manager;
    this._id = utils.uuid();
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<Context, IKernel> {
    return Private.kernelChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the path changes.
   */
  get pathChanged(): ISignal<Context, string> {
    return Private.pathChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the model is saved or reverted.
   */
  get contentsModelChanged(): ISignal<Context, IContents.IModel> {
    return Private.contentsModelChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the context is fully populated for the first time.
   */
  get populated(): ISignal<IDocumentContext<IDocumentModel>, void> {
    return Private.populatedSignal.bind(this);
  }

  /**
   * The unique id of the context.
   *
   * #### Notes
   * This is a read-only property.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the model associated with the document.
   *
   * #### Notes
   * This is a read-only property
   */
  get model(): IDocumentModel {
    return this._manager.getModel(this._id);
  }

  /**
   * The current kernel associated with the document.
   *
   * #### Notes
   * This is a read-only propery.
   */
  get kernel(): IKernel {
    return this._manager.getKernel(this._id);
  }

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get path(): string {
    return this._manager.getPath(this._id);
  }

  /**
   * The current contents model associated with the document
   *
   * #### Notes
   * This is a read-only property.  The model will have an
   * empty `contents` field.
   */
  get contentsModel(): IContents.IModel {
    return this._manager.getContentsModel(this._id);
  }

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelspecs(): IKernel.ISpecModels {
    return this._manager.getKernelspecs();
  }

  /**
   * Test whether the context is fully populated.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isPopulated(): boolean {
    return this._manager.isPopulated(this._id);
  }

  /**
   * Test whether the context has been disposed.
   */
  get isDisposed(): boolean {
    return this._manager === null;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._manager = null;
    this._id = '';
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: IKernel.IModel): Promise<IKernel> {
    return this._manager.changeKernel(this._id, options);
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    return this._manager.save(this._id);
  }

  /**
   * Save the document to a different path.
   */
  saveAs(path: string): Promise<void> {
    return this._manager.saveAs(this._id, path);
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
    return this._manager.revert(this._id);
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISession.IModel[]> {
    return this._manager.listSessions();
  }

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
  addSibling(widget: Widget): IDisposable {
    return this._manager.addSibling(this._id, widget);
  }

  private _id = '';
  private _manager: ContextManager = null;
}


/**
 * An object which manages the active contexts.
 */
export
class ContextManager implements IDisposable {
  /**
   * Construct a new context manager.
   */
  constructor(options: ContextManager.IOptions) {
    this._contentsManager = options.contentsManager;
    this._sessionManager = options.sessionManager;
    this._opener = options.opener;
    this._kernelspecids = options.kernelspecs;
  }

  /**
   * Get whether the context manager has been disposed.
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
    this._contentsManager = null;
    this._sessionManager = null;
    this._kernelspecids = null;
    for (let id in this._contexts) {
      let contextEx = this._contexts[id];
      contextEx.context.dispose();
      contextEx.model.dispose();
      let session = contextEx.session;
      if (session) {
        session.dispose();
      }
    }
    this._contexts = null;
    this._opener = null;
  }

  /**
   * Create a new context.
   */
  createNew(path: string, model: IDocumentModel, factory: IModelFactory): string {
    let context = new Context(this);
    let id = context.id;
    this._contexts[id] = {
      context,
      path,
      model,
      modelName: factory.name,
      fileType: factory.fileType,
      fileFormat: factory.fileFormat,
      contentsModel: null,
      session: null,
      isPopulated: false
    };
    return id;
  }

  /**
   * Get a context for a given path and model name.
   */
  findContext(path: string, modelName: string): string {
    for (let id in this._contexts) {
      let contextEx = this._contexts[id];
      if (contextEx.path === path && contextEx.modelName === modelName) {
        return id;
      }
    }
  }

  /**
   * Find a context by path.
   */
  getIdsForPath(path: string): string[] {
    let ids: string[] = [];
    for (let id in this._contexts) {
      if (this._contexts[id].path === path) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Get a context by id.
   */
  getContext(id: string): IDocumentContext<IDocumentModel> {
    return this._contexts[id].context;
  }

  /**
   * Get the model associated with a context.
   */
  getModel(id: string): IDocumentModel {
    return this._contexts[id].model;
  }

  /**
   * Remove a context.
   */
  removeContext(id: string): void {
    let contextEx = this._contexts[id];
    contextEx.model.dispose();
    contextEx.context.dispose();
    delete this._contexts[id];
  }

  /**
   * Get the current kernel associated with a document.
   */
  getKernel(id: string): IKernel {
    let session = this._contexts[id].session;
    return session ? session.kernel : null;
  }

  /**
   * Get the current path associated with a document.
   */
  getPath(id: string): string {
    return this._contexts[id].path;
  }

  /**
   * Get the current contents model associated with a document.
   */
  getContentsModel(id: string): IContents.IModel {
    return this._contexts[id].contentsModel;
  }

  /**
   * Change the current kernel associated with the document.
   *
   * @param options - If given, change the kernel (starting a session
   * if necessary). If falsey, shut down any existing session and return
   * a void promise.
   */
  changeKernel(id: string, options: IKernel.IModel): Promise<IKernel> {
    let contextEx = this._contexts[id];
    let session = contextEx.session;
    if (options) {
      if (session) {
        return session.changeKernel(options);
      } else {
        let path = contextEx.path;
        let sOptions: ISession.IOptions = {
          path: path,
          kernelName: options.name,
          kernelId: options.id
        };
        return this._startSession(id, sOptions);
      }
    } else {
      if (session) {
        return session.shutdown().then(() => {
          session.dispose();
          contextEx.session = null;
          contextEx.context.kernelChanged.emit(null);
          return void 0;
        });
      } else {
        return Promise.resolve(void 0);
      }
    }
  }

  /**
   * Update the path of an open document.
   *
   * @param id - The id of the context.
   *
   * @param newPath - The new path.
   */
  handleRename(oldPath: string, newPath: string): void {
    // Update all of the paths, but only update one session
    // so there is only one REST API call.
    let ids = this.getIdsForPath(oldPath);
    let sessionUpdated = false;
    for (let id of ids) {
      let contextEx = this._contexts[id];
      contextEx.path = newPath;
      contextEx.context.pathChanged.emit(newPath);
      if (!sessionUpdated) {
        let session = contextEx.session;
        if (session) {
          session.rename(newPath);
          sessionUpdated = true;
        }
      }
    }
  }

  /**
   * Get the current kernelspec information.
   */
  getKernelspecs(): IKernel.ISpecModels {
    return this._kernelspecids;
  }

  /**
   * Save the document contents to disk.
   */
  save(id: string): Promise<void> {
    let contextEx =  this._contexts[id];
    let model = contextEx.model;
    let contents = contextEx.contentsModel || {};
    let path = contextEx.path;
    contents.type = contextEx.fileType;
    contents.format = contextEx.fileFormat;
    if (model.readOnly) {
      return Promise.reject(new Error('Read only'));
    }
    if (contents.format === 'json') {
      contents.content = model.toJSON();
    } else {
      contents.content = model.toString();
    }
    return this._contentsManager.save(path, contents).then(newContents => {
      contextEx.contentsModel = this._copyContentsModel(newContents);
      model.dirty = false;
    });
  }

  /**
   * Save a document to a new file name.
   *
   * This results in a new session.
   */
  saveAs(id: string, newPath: string): Promise<void> {
    let contextEx = this._contexts[id];
    contextEx.path = newPath;
    contextEx.context.pathChanged.emit(newPath);
    if (contextEx.session) {
      let options = {
        notebook: { path: newPath },
        kernel: { id: contextEx.session.id }
      };
      return this._startSession(id, options).then(() => {
        return this.save(id);
      });
    }
    return this.save(id);
  }

  /**
   * Revert the contents of a path.
   */
  revert(id: string): Promise<void> {
    let contextEx = this._contexts[id];
    let opts: IContents.IFetchOptions = {
      format: contextEx.fileFormat,
      type: contextEx.fileType,
      content: true
    };
    let path = contextEx.path;
    let model = contextEx.model;
    return this._contentsManager.get(path, opts).then(contents => {
      if (contents.format === 'json') {
        model.fromJSON(contents.content);
      } else {
        model.fromString(contents.content);
      }
      let contentsModel = this._copyContentsModel(contents);
      // TODO: use deepEqual to check for equality
      contextEx.contentsModel = contentsModel;
      contextEx.context.contentsModelChanged.emit(contentsModel);
      model.dirty = false;
    });
  }

  /**
   * Test whether the context is fully populated.
   */
  isPopulated(id: string): boolean {
    let contextEx = this._contexts[id];
    return contextEx.isPopulated;
  }

  /**
   * Finalize a context.
   */
  finalize(id: string): void {
    let contextEx = this._contexts[id];
    if (contextEx.isPopulated) {
      return;
    }
    contextEx.isPopulated = true;
    this._contexts[id].context.populated.emit(void 0);
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISession.IModel[]> {
    return this._sessionManager.listRunning();
  }

  /**
   * Add a sibling widget to the document manager.
   */
  addSibling(id: string, widget: Widget): IDisposable {
    let opener = this._opener;
    return opener(id, widget);
  }

  /**
   * Start a session and set up its signals.
   */
  private _startSession(id: string, options: ISession.IOptions): Promise<IKernel> {
    let contextEx = this._contexts[id];
    let context = contextEx.context;
    return this._sessionManager.startNew(options).then(session => {
      if (contextEx.session) {
        contextEx.session.dispose();
      }
      contextEx.session = session;
      context.kernelChanged.emit(session.kernel);
      session.pathChanged.connect((s, path) => {
        if (path !== contextEx.path) {
          contextEx.path = path;
          context.pathChanged.emit(path);
        }
      });
      session.kernelChanged.connect((s, kernel) => {
        context.kernelChanged.emit(kernel);
      });
      return session.kernel;
    });
  }

  /**
   * Copy the contents of a contents model, without the content.
   */
  private _copyContentsModel(model: IContents.IModel): IContents.IModel {
    return {
      path: model.path,
      name: model.name,
      type: model.type,
      writable: model.writable,
      created: model.created,
      last_modified: model.last_modified,
      mimetype: model.mimetype,
      format: model.format
    };
  }

  private _contentsManager: IContents.IManager = null;
  private _sessionManager: ISession.IManager = null;
  private _kernelspecids: IKernel.ISpecModels = null;
  private _contexts: { [key: string]: Private.IContextEx } = Object.create(null);
  private _opener: (id: string, widget: Widget) => IDisposable = null;
}


/**
 * A namespace for ContextManager statics.
 */
export namespace ContextManager {
  /**
   * The options used to initialize a context manager.
   */
  export
  interface IOptions {
    /**
     * A contents manager instance.
     */
    contentsManager: IContents.IManager;

    /**
     * A session manager instance.
     */
    sessionManager: ISession.IManager;

    /**
     * The system kernelspec information.
     */
    kernelspecs: IKernel.ISpecModels;

    /**
     * A callback for opening sibling widgets.
     */
    opener: (id: string, widget: Widget) => IDisposable;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An extended interface for data associated with a context.
   */
  export
  interface IContextEx {
    context: IDocumentContext<IDocumentModel>;
    model: IDocumentModel;
    session: ISession;
    fileType: IContents.FileType;
    fileFormat: IContents.FileFormat;
    path: string;
    contentsModel: IContents.IModel;
    modelName: string;
    isPopulated: boolean;
  }

  /**
   * A signal emitted when the kernel changes.
   */
  export
  const kernelChangedSignal = new Signal<Context, IKernel>();

  /**
   * A signal emitted when the path changes.
   */
  export
  const pathChangedSignal = new Signal<Context, string>();

  /**
   * A signal emitted when the contentsModel changes.
   */
  export
  const contentsModelChangedSignal = new Signal<Context, IContents.IModel>();

  /**
   * A signal emitted when the context is fully populated for the first time.
   */
  export
  const populatedSignal = new Signal<Context, void>();
}
