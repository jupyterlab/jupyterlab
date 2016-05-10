// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelId, IKernel, IKernelSpecIds, IContentsManager,
  INotebookSessionManager, INotebookSession, ISessionId
} from 'jupyter-js-services';

import {
  uuid
} from 'jupyter-js-utils';

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
  IDocumentContext, IDocumentModel
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
    this._id = uuid();
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
   */
  getKernel(): IKernel {
    return this._manager.getKernel(this._id);
  }

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  getPath(): string {
    return this._manager.getPath(this._id);
  }

  /**
   * Get the current kernelspec information.
   */
  getKernelSpecs(): IKernelSpecIds {
    return this._manager.getKernelSpecs();
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
class ContextManager {
  /**
   * Construct a new context manager.
   */
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager, opener: IWidgetOpener) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._opener = opener;
    // Fetch and store the kernelspecids.
    sessionManager.getSpecs().then(specs => {
      this._kernelspecids = specs;
    });
  }

  /**
   * Create a new context.
   */
  createNew(path: string, model: IDocumentModel): IDocumentContext {
    let context = new Context(this);
    let id = context.id;
    this._paths[id] = path;
    this._contexts[id] = context;
    this._models[id] = model;
    return context;
  }

  /**
   * Get a context by id.
   */
  getContext(id: string): IDocumentContext {
    return this._contexts[id];
  }

  /**
   * Get the model associated with a context.
   */
  getModel(id: string): IDocumentModel {
    return this._models[id];
  }

  /**
   * Get the current kernel associated with a document.
   */
  getKernel(id: string): IKernel {
    let session = this._sessions[id];
    return session ? session.kernel : null;
  }

  /**
   * Get the current path associated with a document.
   */
  getPath(id: string): string {
    return this._paths[id];
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(id: string, options: IKernelId): Promise<IKernel> {
    let session = this._sessions[id];
    let context = this._contexts[id];
    if (!session) {
      let path = this._paths[id];
      let sOptions = {
        notebook: { path },
        kernel: { options }
      }
      return this._sessionManager.startNew(sOptions).then(session => {
        this._sessions[id] = session;
        context.kernelChanged.emit(session.kernel);
        return session.kernel;
      });
    } else {
      return session.changeKernel(options).then(kernel => {
        context.kernelChanged.emit(kernel);
        return kernel;
      });
    }
  }

  /**
   * Update the path of an open document.
   *
   * @param oldPath - The previous path.
   *
   * @param newPath - The new path.
   */
  rename(oldPath: string, newPath: string): Promise<void> {
    // Find all contexts for that path
    // Update the existing sessions
    return void 0;
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
  save(path: string): Promise<void> {
    // This is a problem, because *which* one do we save?
    return void 0;
  }

  /**
   * Revert the contents of a path.
   */
  revert(path: string): Promise<void> {
    return void 0;
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
  addSibling(path: string, widget: Widget): IDisposable {
   // TODO: Add the widget to the list of siblings
   // This needs to go back to the document manager to set the
   // context and factory properties.
   this._opener.open(widget);
   // TODO: return a disposable
   return void 0;
  }

  private _contentsManager: IContentsManager = null;
  private _sessionManager: INotebookSessionManager = null;
  private _kernelspecids: IKernelSpecIds = null;
  private _contexts: { [key: string]: IDocumentContext } = Object.create(null);
  private _models: { [key: string]: IDocumentModel } = Object.create(null);
  private _sessions: { [key: string]: INotebookSession } = Object.create(null);
  private _opener: IWidgetOpener = null;
  private _paths: { [key: string]: string } = Object.create(null);
}
