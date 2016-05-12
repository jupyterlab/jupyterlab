// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelId, IKernel, IKernelSpecIds, IContentsManager,
  INotebookSessionManager, INotebookSession, ISessionId,
  IContentsOpts, ISessionOptions, IContentsModel
} from 'jupyter-js-services';

import * as utils
  from 'jupyter-js-utils';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

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
  IWidgetOpener
} from '../filebrowser/browser';

import {
  IDocumentContext, IDocumentModel, IModelFactoryOptions
} from './index';


/**
 * An implementation of a document context.
 */
class Context implements IDocumentContext {
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
  get kernelChanged(): ISignal<IDocumentContext, IKernel> {
    return Private.kernelChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the path changes.
   */
  get pathChanged(): ISignal<IDocumentContext, string> {
    return Private.pathChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the model is saved or reverted.
   */
  get dirtyCleared(): ISignal<IDocumentContext, void> {
    return Private.dirtyClearedSignal.bind(this);
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
  get contentsModel(): IContentsModel {
    return this._manager.getContentsModel(this._id);
  }

  /**
   * Get the kernel spec information.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelSpecs(): IKernelSpecIds {
    return this._manager.getKernelSpecs();
  }

  /**
   * Get whether the context has been disposed.
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
  changeKernel(options: IKernelId): Promise<IKernel> {
    return this._manager.changeKernel(this._id, options);
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    return this._manager.save(this._id);
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
  listSessions(): Promise<ISessionId[]> {
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
 * A namespace for module private data.
 */
namespace Private {

  /**
   * A signal emitted when the kernel changes.
   */
  export
  const kernelChangedSignal = new Signal<IDocumentContext, IKernel>();

  /**
   * A signal emitted when the path changes.
   */
  export
  const pathChangedSignal = new Signal<IDocumentContext, string>();

  /**
   * A signal emitted when the model is saved or reverted.
   */
  export
  const dirtyClearedSignal = new Signal<IDocumentContext, void>();

}


/**
 * An object which manages the active contexts.
 */
export
class ContextManager implements IDisposable {
  /**
   * Construct a new context manager.
   */
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager,  kernelSpecs: IKernelSpecIds, opener: (id: string, widget: Widget) => IDisposable) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._opener = opener;
    this._kernelspecids = kernelSpecs;
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
  createNew(path: string, model: IDocumentModel, options: IModelFactoryOptions,
    contents: IContentsModel): string {
    let context = new Context(this);
    this._contexts[context.id] = {
      context,
      path,
      model,
      modelName: options.name,
      opts: options.contentsOptions,
      contentsModel: this._copyContentsModel(contents),
      session: null
    };
    return context.id;
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
  getContext(id: string): IDocumentContext {
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
  removeContext(id: string): INotebookSession {
    let contextEx = this._contexts[id];
    contextEx.model.dispose();
    contextEx.context.dispose();
    delete this._contexts[id];
    return contextEx.session;
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
  getContentsModel(id: string): IContentsModel {
    return this._contexts[id].contentsModel;
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(id: string, options: IKernelId): Promise<IKernel> {
    let contextEx = this._contexts[id];
    let session = contextEx.session;
    if (!session) {
      let path = contextEx.path;
      let sOptions = {
        notebook: { path },
        kernel: { options }
      }
      return this._startSession(id, sOptions);
    } else {
      return session.changeKernel(options);
    }
  }

  /**
   * Update the path of an open document.
   *
   * @param id - The id of the context.
   *
   * @param newPath - The new path.
   */
  rename(id: string, newPath: string): void {
    let contextEx = this._contexts[id];
    let session = contextEx.session;
    if (session) {
      session.renameNotebook(newPath);
    }
    this._contexts[id].path = newPath;
    contextEx.context.pathChanged.emit(newPath);
  }

  /**
   * Get the current kernelspec information.
   */
  getKernelSpecs(): IKernelSpecIds {
    return this._kernelspecids;
  }

  /**
   * Save the document contents to disk.
   */
  save(id: string): Promise<void> {
    let contextEx =  this._contexts[id];
    let opts = utils.copy(contextEx.opts);
    let path = contextEx.path;
    let model = contextEx.model;
    if (model.readOnly) {
      return Promise.reject(new Error('Read only'));
    }
    if (opts.format === 'json') {
      opts.content = model.toJSON();
    } else {
      opts.content = model.toString();
    }
    return this._contentsManager.save(path, opts).then(contents => {
      contextEx.contentsModel = this._copyContentsModel(contents);
      model.dirty = false;
    });
  }

  /**
   * Revert the contents of a path.
   */
  revert(id: string): Promise<void> {
    let contextEx = this._contexts[id];
    let opts = contextEx.opts;
    let path = contextEx.path;
    let model = contextEx.model;
    return this._contentsManager.get(path, opts).then(contents => {
      if (contents.format === 'json') {
        model.fromJSON(contents.content);
      } else {
        model.fromString(contents.content);
      }
      contextEx.contentsModel = this._copyContentsModel(contents);
      model.dirty = false;
    });
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISessionId[]> {
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
  private _startSession(id: string, options: ISessionOptions): Promise<IKernel> {
    let contextEx = this._contexts[id];
    let context = contextEx.context;
    return this._sessionManager.startNew(options).then(session => {
      contextEx.session = session;
      context.kernelChanged.emit(session.kernel);
      session.notebookPathChanged.connect((s, path) => {
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
  private _copyContentsModel(model: IContentsModel): IContentsModel {
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

  private _contentsManager: IContentsManager = null;
  private _sessionManager: INotebookSessionManager = null;
  private _kernelspecids: IKernelSpecIds = null;
  private _contexts: { [key: string]: Private.IContextEx } = Object.create(null);
  private _opener: (id: string, widget: Widget) => IDisposable = null;
}


/**
 * A namespace for private data.
 */
namespace Private {
  export
  interface IContextEx {
    context: IDocumentContext;
    model: IDocumentModel;
    session: INotebookSession;
    opts: IContentsOpts;
    path: string;
    contentsModel: IContentsModel;
    modelName: string;
  }
}
