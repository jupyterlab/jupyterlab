// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelId, IKernel, IKernelSpecIds, IContentsManager,
  INotebookSessionManager, INotebookSession
} from 'jupyter-js-services';

import {
  uuid
} from 'jupyter-js-utils';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

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
  IDocumentContext, IDocumentModel, ISessionInfo
} from './index';


/**
 * An implementation of a document context.
 */
class Context implements IDocumentContext {
  /**
   * Construct a new document context.
   */
  constructor(uuid: string, manager: ContextManager) {
    this._manager = manager;
    this._uuid = uuid;
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
   * The current kernel associated with the document.
   */
  getKernel(): IKernel {
    return this._manager.getKernel(this._uuid);
  }

  /**
   * The current path associated with the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  getPath(): string {
    return this._manager.getPath(this._uuid);
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
    return this._manager.changeKernel(this._uuid, options);
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    return this._manager.save(this._uuid);
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
    return this._manager.revert(this._uuid);
  }

  /**
   * Get the list of running sessions.
   */
  listSessions(): Promise<ISessionInfo[]> {
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
    return this._manager.addSibling(this._uuid, widget);
  }

  private _uuid = '';
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



export
class ContextManager {
  /**
   * Construct a new context manager.
   */
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager, opener: IWidgetOpener) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._opener = opener;
    // TODO: fetch the kernelspecids.
  }

  /**
   * Create a new context.
   */
  createNew(path: string, model: IDocumentModel): IDocumentContext {
    let uid = uuid();
    let context = new Context(uid, this);
    this._paths[uid] = path;
    this._contexts[uid] = context;
    this._models[uid] = model;
    return context;
  }

  /**
   * Get the current kernel associated with a document.
   */
  getKernel(uuid: string): IKernel {
    let session = this._sessions[uuid];
    return session ? session.kernel : null;
  }

  /**
   * Get the current path associated with a document.
   */
  getPath(uuid: string): string {
    return this._paths[uuid];
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(uuid: string, options: IKernelId): Promise<IKernel> {
    let session = this._sessions[uuid];
    let context = this._contexts[uuid];
    if (!session) {
      let path = this._paths[uuid];
      let sOptions = {
        notebook: { path },
        kernel: { options }
      }
      return this._sessionManager.startNew(sOptions).then(session => {
        this._sessions[uuid] = session;
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
  listSessions(): Promise<ISessionInfo[]> {
    // TODO filter the running session info.
    //return this._sessionManager.listRunning();
    return void 0;
  }

  /**
   * Add a sibling widget to the document manager.
   */
  addSibling(path: string, widget: Widget): IDisposable {
   // TODO: Add the widget to the list of siblings
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
