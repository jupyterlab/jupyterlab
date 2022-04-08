// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import {
  Dialog,
  ISessionContext,
  SessionContext,
  sessionContextDialogs,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import {
  IDocumentProvider,
  IDocumentProviderFactory,
  ProviderMock
} from '@jupyterlab/docprovider';
import { IModelDB, ModelDB } from '@jupyterlab/observables';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import {
  Contents,
  ServerConnection,
  ServiceManager
} from '@jupyterlab/services';
import * as ymodels from '@jupyterlab/shared-models';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { PartialJSONValue, PromiseDelegate } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import * as Y from 'yjs';
import { DocumentRegistry } from './registry';

/**
 * An implementation of a document context.
 *
 * This class is typically instantiated by the document manager.
 */
export class Context<
  T extends DocumentRegistry.IModel = DocumentRegistry.IModel
> implements DocumentRegistry.IContext<T> {
  /**
   * Construct a new document context.
   */
  constructor(options: Context.IOptions<T>) {
    const manager = (this._manager = options.manager);
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._factory = options.factory;
    this._dialogs = options.sessionDialogs || sessionContextDialogs;
    this._opener = options.opener || Private.noOp;
    this._path = this._manager.contents.normalize(options.path);
    this._lastModifiedCheckMargin = options.lastModifiedCheckMargin || 500;
    const localPath = this._manager.contents.localPath(this._path);
    const lang = this._factory.preferredLanguage(PathExt.basename(localPath));

    const dbFactory = options.modelDBFactory;
    if (dbFactory) {
      const localPath = manager.contents.localPath(this._path);
      this._modelDB = dbFactory.createNew(localPath);
      this._model = this._factory.createNew(lang, this._modelDB, false);
    } else {
      this._model = this._factory.createNew(lang, undefined, false);
    }

    const ymodel = this._model.sharedModel as ymodels.YDocument<any>; // translate to the concrete Yjs implementation
    const ydoc = ymodel.ydoc;
    this._ydoc = ydoc;
    this._ycontext = ydoc.getMap('context');
    const docProviderFactory = options.docProviderFactory;
    this._provider = docProviderFactory
      ? docProviderFactory({
          path: this._path,
          contentType: this._factory.contentType,
          ymodel
        })
      : new ProviderMock();

    this._readyPromise = manager.ready.then(() => {
      return this._populatedPromise.promise;
    });

    const ext = PathExt.extname(this._path);
    this.sessionContext = new SessionContext({
      sessionManager: manager.sessions,
      specsManager: manager.kernelspecs,
      path: this._path,
      type: ext === '.ipynb' ? 'notebook' : 'file',
      name: PathExt.basename(localPath),
      kernelPreference: options.kernelPreference || { shouldStart: false },
      setBusy: options.setBusy
    });
    this.sessionContext.propertyChanged.connect(this._onSessionChanged, this);
    manager.contents.fileChanged.connect(this._onFileChanged, this);

    const urlResolver = (this.urlResolver = new RenderMimeRegistry.UrlResolver({
      path: this._path,
      contents: manager.contents
    }));
    this._ycontext.set('path', this._path);
    this._ycontext.observe(event => {
      const pathChanged = event.changes.keys.get('path');
      if (pathChanged) {
        const newPath = this._ycontext.get('path')!;
        if (newPath && newPath !== pathChanged.oldValue) {
          urlResolver.path = newPath;
          this._path = newPath;
          this._provider.setPath(newPath);
          this._pathChanged.emit(this.path);
          this.sessionContext.session?.setPath(newPath) as any;
        }
      }
    });
  }

  /**
   * A signal emitted when the path changes.
   */
  get pathChanged(): ISignal<this, string> {
    return this._pathChanged;
  }

  /**
   * A signal emitted when the model is saved or reverted.
   */
  get fileChanged(): ISignal<this, Contents.IModel> {
    return this._fileChanged;
  }

  /**
   * A signal emitted on the start and end of a saving operation.
   */
  get saveState(): ISignal<this, DocumentRegistry.SaveState> {
    return this._saveState;
  }

  /**
   * A signal emitted when the context is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Configurable margin used to detect document modification conflicts, in milliseconds
   */
  get lastModifiedCheckMargin(): number {
    return this._lastModifiedCheckMargin;
  }

  set lastModifiedCheckMargin(value: number) {
    this._lastModifiedCheckMargin = value;
  }

  /**
   * Get the model associated with the document.
   */
  get model(): T {
    return this._model;
  }

  /**
   * The client session object associated with the context.
   */
  readonly sessionContext: SessionContext;

  /**
   * The current path associated with the document.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The current local path associated with the document.
   * If the document is in the default notebook file browser,
   * this is the same as the path.
   */
  get localPath(): string {
    return this._manager.contents.localPath(this._path);
  }

  /**
   * The current contents model associated with the document.
   *
   * #### Notes
   * The contents model will be null until the context is populated.
   * It will have an  empty `contents` field.
   */
  get contentsModel(): Contents.IModel | null {
    return this._contentsModel;
  }

  /**
   * Get the model factory name.
   *
   * #### Notes
   * This is not part of the `IContext` API.
   */
  get factoryName(): string {
    return this.isDisposed ? '' : this._factory.name;
  }

  /**
   * Test whether the context is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.sessionContext.dispose();
    if (this._modelDB) {
      this._modelDB.dispose();
    }
    this._model.dispose();
    this._provider.destroy();
    this._model.sharedModel.dispose();
    this._ydoc.destroy();
    this._disposed.emit(void 0);
    Signal.clearData(this);
  }

  /**
   * Whether the context is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that is fulfilled when the context is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * The url resolver for the context.
   */
  readonly urlResolver: IRenderMime.IResolver;

  /**
   * Initialize the context.
   *
   * @param isNew - Whether it is a new file.
   *
   * @returns a promise that resolves upon initialization.
   */
  async initialize(isNew: boolean): Promise<void> {
    // FIXME: revert/save is broken
    // revert will change with #12306 anyway
    let promise;
    if (isNew) {
      promise = this._save();
    } else {
      if (PageConfig.getOption('collaborative') == 'true') {
        promise = this._loadContext();
      } else {
        promise = this._revert();
      }
    }
    return promise;
  }

  /**
   * Rename the document.
   *
   * @param newName - the new name for the document.
   */
  rename(newName: string): Promise<void> {
    return this.ready.then(() => {
      return this._manager.ready.then(() => {
        return this._rename(newName);
      });
    });
  }

  /**
   * Save the document contents to disk.
   */
  async save(): Promise<void> {
    await this.ready;
    let promise: Promise<void>;
    promise = this._save();
    return await promise;
  }

  /**
   * Save the document to a different path chosen by the user.
   */
  saveAs(): Promise<void> {
    return this.ready
      .then(() => {
        return Private.getSavePath(this._path);
      })
      .then(newPath => {
        if (this.isDisposed || !newPath) {
          return;
        }
        if (newPath === this._path) {
          return this.save();
        }
        // Make sure the path does not exist.
        return this._manager.ready
          .then(() => {
            return this._manager.contents.get(newPath);
          })
          .then(() => {
            return this._maybeOverWrite(newPath);
          })
          .catch(err => {
            if (!err.response || err.response.status !== 404) {
              throw err;
            }
            return this._finishSaveAs(newPath);
          });
      });
  }

  /**
   * Download a file.
   *
   * @param path - The path of the file to be downloaded.
   *
   * @returns A promise which resolves when the file has begun
   *   downloading.
   */
  async download(): Promise<void> {
    const url = await this._manager.contents.getDownloadUrl(this._path);
    const element = document.createElement('a');
    element.href = url;
    element.download = '';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    return void 0;
  }

  /**
   * Revert the document contents to disk contents.
   */
  async revert(): Promise<void> {
    await this.ready;
    const promise = this._revert();
    return await promise;
  }

  /**
   * Create a checkpoint for the file.
   */
  createCheckpoint(): Promise<Contents.ICheckpointModel> {
    const contents = this._manager.contents;
    return this._manager.ready.then(() => {
      return contents.createCheckpoint(this._path);
    });
  }

  /**
   * Delete a checkpoint for the file.
   */
  deleteCheckpoint(checkpointId: string): Promise<void> {
    const contents = this._manager.contents;
    return this._manager.ready.then(() => {
      return contents.deleteCheckpoint(this._path, checkpointId);
    });
  }

  /**
   * Restore the file to a known checkpoint state.
   */
  restoreCheckpoint(checkpointId?: string): Promise<void> {
    const contents = this._manager.contents;
    const path = this._path;
    return this._manager.ready.then(() => {
      if (checkpointId) {
        return contents.restoreCheckpoint(path, checkpointId);
      }
      return this.listCheckpoints().then(checkpoints => {
        if (this.isDisposed || !checkpoints.length) {
          return;
        }
        checkpointId = checkpoints[checkpoints.length - 1].id;
        return contents.restoreCheckpoint(path, checkpointId);
      });
    });
  }

  /**
   * List available checkpoints for a file.
   */
  listCheckpoints(): Promise<Contents.ICheckpointModel[]> {
    const contents = this._manager.contents;
    return this._manager.ready.then(() => {
      return contents.listCheckpoints(this._path);
    });
  }

  /**
   * Add a sibling widget to the document manager.
   *
   * @param widget - The widget to add to the document manager.
   *
   * @param options - The desired options for adding the sibling.
   *
   * @returns A disposable used to remove the sibling if desired.
   *
   * #### Notes
   * It is assumed that the widget has the same model and context
   * as the original widget.
   */
  addSibling(
    widget: Widget,
    options: DocumentRegistry.IOpenOptions = {}
  ): IDisposable {
    const opener = this._opener;
    if (opener) {
      opener(widget, options);
    }
    return new DisposableDelegate(() => {
      widget.close();
    });
  }

  /**
   * Handle a change on the contents manager.
   */
  private _onFileChanged(
    sender: Contents.IManager,
    change: Contents.IChangedArgs
  ): void {
    if (change.type !== 'rename') {
      return;
    }
    let oldPath = change.oldValue && change.oldValue.path;
    let newPath = change.newValue && change.newValue.path;

    if (newPath && this._path.indexOf(oldPath || '') === 0) {
      let changeModel = change.newValue;
      // When folder name changed, `oldPath` is `foo`, `newPath` is `bar` and `this._path` is `foo/test`,
      // we should update `foo/test` to `bar/test` as well

      if (oldPath !== this._path) {
        newPath = this._path.replace(new RegExp(`^${oldPath}/`), `${newPath}/`);
        oldPath = this._path;

        // Update client file model from folder change
        changeModel = {
          last_modified: change.newValue?.created,
          path: newPath
        };
      }
      this._path = newPath;
      void this.sessionContext.session?.setPath(newPath);
      const updateModel = {
        ...this._contentsModel,
        ...changeModel
      };
      const localPath = this._manager.contents.localPath(newPath);
      void this.sessionContext.session?.setName(PathExt.basename(localPath));
      this._updateContentsModel(updateModel as Contents.IModel);
      this._ycontext.set('path', this._path);
    }
  }

  /**
   * Handle a change to a session property.
   */
  private _onSessionChanged(sender: ISessionContext, type: string): void {
    if (type !== 'path') {
      return;
    }
    const path = this.sessionContext.session!.path;
    if (path !== this._path) {
      this._path = path;
      this._ycontext.set('path', this._path);
    }
  }

  /**
   * Update our contents model, without the content.
   */
  private _updateContentsModel(model: Contents.IModel): void {
    const newModel: Contents.IModel = {
      path: model.path,
      name: model.name,
      type: model.type,
      content: undefined,
      writable: model.writable,
      created: model.created,
      last_modified: model.last_modified,
      mimetype: model.mimetype,
      format: model.format
    };
    const mod = this._contentsModel ? this._contentsModel.last_modified : null;
    this._contentsModel = newModel;
    this._ycontext.set('last_modified', newModel.last_modified);
    if (!mod || newModel.last_modified !== mod) {
      this._fileChanged.emit(newModel);
    }
  }

  /**
   * Handle an initial population.
   */
  private _populate(): Promise<void> {
    this._isPopulated = true;
    this._isReady = true;
    this._populatedPromise.resolve(void 0);

    // Add a checkpoint if none exists and the file is writable.
    return this._maybeCheckpoint(false).then(() => {
      if (this.isDisposed) {
        return;
      }
      // Update the kernel preference.
      const name =
        this._model.defaultKernelName ||
        this.sessionContext.kernelPreference.name;
      this.sessionContext.kernelPreference = {
        ...this.sessionContext.kernelPreference,
        name,
        language: this._model.defaultKernelLanguage
      };
      // Note: we don't wait on the session to initialize
      // so that the user can be shown the content before
      // any kernel has started.
      void this.sessionContext.initialize().then(shouldSelect => {
        if (shouldSelect) {
          void this._dialogs.selectKernel(this.sessionContext, this.translator);
        }
      });
    });
  }

  /**
   * Rename the document.
   *
   * @param newName - the new name for the document.
   */
  private async _rename(newName: string): Promise<void> {
    const splitPath = this.path.split('/');
    splitPath[splitPath.length - 1] = newName;
    const newPath = splitPath.join('/');

    await this._manager.contents.rename(this.path, newPath);
    await this.sessionContext.session?.setPath(newPath);
    await this.sessionContext.session?.setName(newName);

    this._path = newPath;
    this._ycontext.set('path', this._path);
  }

  /**
   * Save the document contents to disk.
   */
  private async _save(): Promise<void> {
    this._saveState.emit('started');
    const model = this._model;
    let content: PartialJSONValue = null;
    if (PageConfig.getOption('collaborative') !== 'true') {
      if (this._factory.fileFormat === 'json') {
        content = model.toJSON();
      } else {
        content = model.toString();
        if (this._lineEnding) {
          content = content.replace(/\n/g, this._lineEnding);
        }
      }
    }

    const options = {
      type: this._factory.contentType,
      format: this._factory.fileFormat,
      content
    };
    try {
      let value: Contents.IModel;
      await this._manager.ready;
      if (!model.modelDB.isCollaborative) {
        value = await this._maybeSave(options);
      } else {
        value = await this._manager.contents.save(this._path, options);
      }
      if (this.isDisposed) {
        return;
      }

      model.dirty = false;
      this._updateContentsModel(value);

      if (!this._isPopulated) {
        await this._populate();
      }

      // Emit completion.
      this._saveState.emit('completed');
    } catch (err) {
      // If the save has been canceled by the user,
      // throw the error so that whoever called save()
      // can decide what to do.
      if (
        err.message === 'Cancel' ||
        err.message === 'Modal is already displayed'
      ) {
        throw err;
      }

      // Otherwise show an error message and throw the error.
      const localPath = this._manager.contents.localPath(this._path);
      const name = PathExt.basename(localPath);
      void this._handleError(
        err,
        this._trans.__('File Save Error for %1', name)
      );

      // Emit failure.
      this._saveState.emit('failed');
      throw err;
    }
  }

  /**
   * Load the metadata of the document without the content.
   */
  private _loadContext(): Promise<void> {
    const opts: Contents.IFetchOptions = {
      type: this._factory.contentType,
      content: false,
      ...(this._factory.fileFormat !== null
        ? { format: this._factory.fileFormat }
        : {})
    };
    const path = this._path;
    return this._manager.ready
      .then(() => {
        return this._manager.contents.get(path, opts);
      })
      .then(contents => {
        if (this.isDisposed) {
          return;
        }
        this._updateContentsModel(contents);
        this._model.dirty = false;
        if (!this._isPopulated) {
          return this._populate();
        }
      })
      .catch(async err => {
        const localPath = this._manager.contents.localPath(this._path);
        const name = PathExt.basename(localPath);
        void this._handleError(
          err,
          this._trans.__('File Load Error for %1', name)
        );
        throw err;
      });
  }

  /**
   * Revert the document contents to disk contents.
   *
   * @param initializeModel - call the model's initialization function after
   * deserializing the content.
   */
  private _revert(initializeModel: boolean = false): Promise<void> {
    const opts: Contents.IFetchOptions = {
      type: this._factory.contentType,
      content: this._factory.fileFormat !== null,
      ...(this._factory.fileFormat !== null
        ? { format: this._factory.fileFormat }
        : {})
    };
    const path = this._path;
    const model = this._model;
    return this._manager.ready
      .then(() => {
        return this._manager.contents.get(path, opts);
      })
      .then(contents => {
        if (this.isDisposed) {
          return;
        }
        if (contents.format === 'json') {
          model.fromJSON(contents.content);
          if (initializeModel) {
            model.initialize();
          }
        } else {
          let content = contents.content;
          // Convert line endings if necessary, marking the file
          // as dirty.
          if (content.indexOf('\r\n') !== -1) {
            this._lineEnding = '\r\n';
            content = content.replace(/\r\n/g, '\n');
          } else if (content.indexOf('\r') !== -1) {
            this._lineEnding = '\r';
            content = content.replace(/\r/g, '\n');
          } else {
            this._lineEnding = null;
          }
          model.fromString(content);
          if (initializeModel) {
            model.initialize();
          }
        }
        this._updateContentsModel(contents);
        model.dirty = false;
        if (!this._isPopulated) {
          return this._populate();
        }
      })
      .catch(async err => {
        const localPath = this._manager.contents.localPath(this._path);
        const name = PathExt.basename(localPath);
        void this._handleError(
          err,
          this._trans.__('File Load Error for %1', name)
        );
        throw err;
      });
  }

  /**
   * Save a file, dealing with conflicts.
   */
  private _maybeSave(
    options: Partial<Contents.IModel>
  ): Promise<Contents.IModel> {
    const path = this._path;
    // Make sure the file has not changed on disk.
    const promise = this._manager.contents.get(path, { content: false });
    return promise.then(
      model => {
        if (this.isDisposed) {
          return Promise.reject(new Error('Disposed'));
        }
        // We want to check last_modified (disk) > last_modified (client)
        // (our last save)
        // In some cases the filesystem reports an inconsistent time, so we allow buffer when comparing.
        const lastModifiedCheckMargin = this._lastModifiedCheckMargin;
        const ycontextModified = this._ycontext.get('last_modified');
        // prefer using the timestamp from ycontext because it is more up to date
        const modified = ycontextModified || this.contentsModel?.last_modified;
        const tClient = modified ? new Date(modified) : new Date();
        const tDisk = new Date(model.last_modified);
        if (
          modified &&
          tDisk.getTime() - tClient.getTime() > lastModifiedCheckMargin
        ) {
          return this._timeConflict(tClient, model, options);
        }
        return this._manager.contents.save(path, options);
      },
      err => {
        if (err.response && err.response.status === 404) {
          return this._manager.contents.save(path, options);
        }
        throw err;
      }
    );
  }

  /**
   * Handle a save/load error with a dialog.
   */
  private async _handleError(
    err: Error | ServerConnection.ResponseError,
    title: string
  ): Promise<void> {
    await showErrorMessage(title, err);
    return;
  }

  /**
   * Add a checkpoint the file is writable.
   */
  private _maybeCheckpoint(force: boolean): Promise<void> {
    let writable = this._contentsModel && this._contentsModel.writable;
    let promise = Promise.resolve(void 0);
    if (!writable) {
      return promise;
    }
    if (force) {
      promise = this.createCheckpoint().then(/* no-op */);
    } else {
      promise = this.listCheckpoints().then(checkpoints => {
        writable = this._contentsModel && this._contentsModel.writable;
        if (!this.isDisposed && !checkpoints.length && writable) {
          return this.createCheckpoint().then(/* no-op */);
        }
      });
    }
    return promise.catch(err => {
      // Handle a read-only folder.
      if (!err.response || err.response.status !== 403) {
        throw err;
      }
    });
  }

  /**
   * Handle a time conflict.
   */
  private _timeConflict(
    tClient: Date,
    model: Contents.IModel,
    options: Partial<Contents.IModel>
  ): Promise<Contents.IModel> {
    const tDisk = new Date(model.last_modified);
    console.warn(
      `Last saving performed ${tClient} ` +
        `while the current file seems to have been saved ` +
        `${tDisk}`
    );
    if (this._timeConflictModalIsOpen) {
      return Promise.reject(new Error('Modal is already displayed'));
    }
    const body = this._trans.__(
      `"%1" has changed on disk since the last time it was opened or saved.
Do you want to overwrite the file on disk with the version open here,
or load the version on disk (revert)?`,
      this.path
    );
    const revertBtn = Dialog.okButton({ label: this._trans.__('Revert') });
    const overwriteBtn = Dialog.warnButton({
      label: this._trans.__('Overwrite')
    });
    this._timeConflictModalIsOpen = true;
    return showDialog({
      title: this._trans.__('File Changed'),
      body,
      buttons: [Dialog.cancelButton(), revertBtn, overwriteBtn]
    }).then(result => {
      this._timeConflictModalIsOpen = false;
      if (this.isDisposed) {
        return Promise.reject(new Error('Disposed'));
      }
      if (result.button.label === this._trans.__('Overwrite')) {
        return this._manager.contents.save(this._path, options);
      }
      // FIXME-TRANS: Why compare to label?
      if (result.button.label === this._trans.__('Revert')) {
        return this.revert().then(() => {
          return model;
        });
      }
      return Promise.reject(new Error('Cancel')); // Otherwise cancel the save.
    });
  }

  /**
   * Handle a time conflict.
   */
  private _maybeOverWrite(path: string): Promise<void> {
    const body = this._trans.__(
      '"%1" already exists. Do you want to replace it?',
      path
    );
    const overwriteBtn = Dialog.warnButton({
      label: this._trans.__('Overwrite')
    });
    return showDialog({
      title: this._trans.__('File Overwrite?'),
      body,
      buttons: [Dialog.cancelButton(), overwriteBtn]
    }).then(result => {
      if (this.isDisposed) {
        return Promise.reject(new Error('Disposed'));
      }
      // FIXME-TRANS: Why compare to label?
      if (result.button.label === this._trans.__('Overwrite')) {
        return this._manager.contents.delete(path).then(() => {
          return this._finishSaveAs(path);
        });
      }
    });
  }

  /**
   * Finish a saveAs operation given a new path.
   */
  private async _finishSaveAs(newPath: string): Promise<void> {
    this._path = newPath;
    await this.sessionContext.session?.setPath(newPath);
    await this.sessionContext.session?.setName(newPath.split('/').pop()!);
    // we must rename the document before saving with the new path
    this._ycontext.set('path', this._path);
    await this._provider.renameAck;
    await this.save();
    await this._maybeCheckpoint(true);
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _manager: ServiceManager.IManager;
  private _opener: (
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ) => void;
  private _model: T;
  private _modelDB: IModelDB;
  private _path = '';
  private _lineEnding: string | null = null;
  private _factory: DocumentRegistry.IModelFactory<T>;
  private _contentsModel: Contents.IModel | null = null;
  private _readyPromise: Promise<void>;
  private _populatedPromise = new PromiseDelegate<void>();
  private _isPopulated = false;
  private _isReady = false;
  private _isDisposed = false;
  private _pathChanged = new Signal<this, string>(this);
  private _fileChanged = new Signal<this, Contents.IModel>(this);
  private _saveState = new Signal<this, DocumentRegistry.SaveState>(this);
  private _disposed = new Signal<this, void>(this);
  private _dialogs: ISessionContext.IDialogs;
  private _provider: IDocumentProvider;
  private _ydoc: Y.Doc;
  private _ycontext: Y.Map<string>;
  private _lastModifiedCheckMargin = 500;
  private _timeConflictModalIsOpen = false;
}

/**
 * A namespace for `Context` statics.
 */
export namespace Context {
  /**
   * The options used to initialize a context.
   */
  export interface IOptions<T extends DocumentRegistry.IModel> {
    /**
     * A service manager instance.
     */
    manager: ServiceManager.IManager;

    /**
     * The model factory used to create the model.
     */
    factory: DocumentRegistry.IModelFactory<T>;

    /**
     * The initial path of the file.
     */
    path: string;

    /**
     * Whether the model is collaborative.
     */
    collaborative?: boolean;

    /**
     * The kernel preference associated with the context.
     */
    kernelPreference?: ISessionContext.IKernelPreference;

    /**
     * An factory method for the document provider.
     */
    docProviderFactory?: IDocumentProviderFactory;

    /**
     * An IModelDB factory method which may be used for the document.
     */
    modelDBFactory?: ModelDB.IFactory;

    /**
     * An optional callback for opening sibling widgets.
     */
    opener?: (widget: Widget) => void;

    /**
     * A function to call when the kernel is busy.
     */
    setBusy?: () => IDisposable;

    /**
     * The dialogs used for the session context.
     */
    sessionDialogs?: ISessionContext.IDialogs;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * Max acceptable difference, in milliseconds, between last modified timestamps on disk and client
     */
    lastModifiedCheckMargin?: number;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get a new file path from the user.
   */
  export function getSavePath(
    path: string,
    translator?: ITranslator
  ): Promise<string | undefined> {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');

    const saveBtn = Dialog.okButton({ label: trans.__('Save') });
    return showDialog({
      title: trans.__('Save File As..'),
      body: new SaveWidget(path),
      buttons: [Dialog.cancelButton(), saveBtn]
    }).then(result => {
      // FIXME-TRANS: Why use the label?
      if (result.button.label === trans.__('Save')) {
        return result.value ?? undefined;
      }
      return;
    });
  }

  /**
   * A no-op function.
   */
  export function noOp(): void {
    /* no-op */
  }

  /*
   * A widget that gets a file path from a user.
   */
  class SaveWidget extends Widget {
    /**
     * Construct a new save widget.
     */
    constructor(path: string) {
      super({ node: createSaveNode(path) });
    }

    /**
     * Get the value for the widget.
     */
    getValue(): string {
      return (this.node as HTMLInputElement).value;
    }
  }

  /**
   * Create the node for a save widget.
   */
  function createSaveNode(path: string): HTMLElement {
    const input = document.createElement('input');
    input.value = path;
    return input;
  }
}
