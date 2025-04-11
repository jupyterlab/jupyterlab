// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Dialog,
  ISessionContext,
  SessionContext,
  SessionContextDialogs,
  showDialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import {
  Contents,
  ServerConnection,
  ServiceManager
} from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { PartialJSONValue, PromiseDelegate } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import { DocumentRegistry } from './registry';

/**
 * An implementation of a document context.
 *
 * This class is typically instantiated by the document manager.
 */
export class Context<
  T extends DocumentRegistry.IModel = DocumentRegistry.IModel
> implements DocumentRegistry.IContext<T>
{
  /**
   * Construct a new document context.
   */
  constructor(options: Context.IOptions<T>) {
    const manager = (this._manager = options.manager);
    this.translator = options.translator || nullTranslator;
    this._contentProviderId = options.contentProviderId;
    this._trans = this.translator.load('jupyterlab');
    this._factory = options.factory;
    this._dialogs =
      options.sessionDialogs ??
      new SessionContextDialogs({ translator: options.translator });
    this._opener = options.opener || Private.noOp;
    this._path = this._manager.contents.normalize(options.path);
    this._lastModifiedCheckMargin = options.lastModifiedCheckMargin || 500;
    const localPath = this._manager.contents.localPath(this._path);
    const lang = this._factory.preferredLanguage(PathExt.basename(localPath));

    const sharedFactory = this._manager.contents.getSharedModelFactory(
      this._path,
      { contentProviderId: options.contentProviderId }
    );
    const sharedModel = sharedFactory?.createNew({
      path: localPath,
      format: this._factory.fileFormat,
      contentType: this._factory.contentType,
      collaborative: this._factory.collaborative
    });

    this._model = this._factory.createNew({
      languagePreference: lang,
      sharedModel,
      collaborationEnabled: sharedFactory?.collaborative ?? false
    });

    this._readyPromise = manager.ready.then(() => {
      return this._populatedPromise.promise;
    });

    const ext = PathExt.extname(this._path);
    this.sessionContext = new SessionContext({
      kernelManager: manager.kernels,
      sessionManager: manager.sessions,
      specsManager: manager.kernelspecs,
      path: localPath,
      type: ext === '.ipynb' ? 'notebook' : 'file',
      name: PathExt.basename(localPath),
      kernelPreference: options.kernelPreference || { shouldStart: false },
      setBusy: options.setBusy
    });
    this.sessionContext.propertyChanged.connect(this._onSessionChanged, this);
    manager.contents.fileChanged.connect(this._onFileChanged, this);

    this.urlResolver = new RenderMimeRegistry.UrlResolver({
      path: this._path,
      contents: manager.contents
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
  get fileChanged(): ISignal<this, Omit<Contents.IModel, 'content'>> {
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
   * The document metadata, stored as a services contents model.
   *
   * #### Notes
   * The contents model will be `null` until the context is populated.
   * It will not have a `content` field.
   */
  get contentsModel(): Omit<Contents.IModel, 'content'> | null {
    return this._contentsModel ? { ...this._contentsModel } : null;
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
    this._model.dispose();
    // Ensure we dispose the `sharedModel` as it may have been generated in the context
    // through the shared model factory.
    this._model.sharedModel.dispose();
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
   * Whether the document can be saved via the Contents API.
   */
  get canSave(): boolean {
    return !!(this._contentsModel?.writable && !this._model.collaborative);
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
  async initialize(isNew: boolean) {
    if (isNew) {
      await this._save();
    } else {
      await this._revert();
    }
    this.model.sharedModel.clearUndoHistory();
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
    await this._save();
  }

  /**
   * Save the document to a different path chosen by the user.
   *
   * It will be rejected if the user abort providing a new path.
   */
  async saveAs(): Promise<void> {
    await this.ready;
    const localPath = this._manager.contents.localPath(this.path);
    const newLocalPath = await Private.getSavePath(localPath);

    if (this.isDisposed || !newLocalPath) {
      return;
    }

    const drive = this._manager.contents.driveName(this.path);
    const newPath = drive == '' ? newLocalPath : `${drive}:${newLocalPath}`;

    if (newPath === this._path) {
      return this.save();
    }

    // Make sure the path does not exist.
    try {
      await this._manager.ready;
      await this._manager.contents.get(newPath, {
        contentProviderId: this._contentProviderId
      });
      await this._maybeOverWrite(newPath);
    } catch (err) {
      if (!err.response || err.response.status !== 404) {
        throw err;
      }
      await this._finishSaveAs(newPath);
    }
  }

  /**
   * Download a file.
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
    await this._revert();
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
    if (change.type === 'save' && this._model.collaborative) {
      // Skip if the change isn't related to current file.
      if (this._contentsModel?.path !== change.newValue?.path) {
        return;
      }

      // Update the contents model with the new values provided on save.
      // This is needed for save operations performed on the server-side
      // by the collaborative drive which needs to update the `hash`
      // of the content when it changes on the backend.
      this._updateContentsModel({
        ...this._contentsModel,
        ...change.newValue
      } as Contents.IModel);
      return;
    }
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
      this._updateContentsModel({
        ...this._contentsModel,
        ...changeModel
      } as Contents.IModel);
      this._updatePath(newPath);
    }
  }

  /**
   * Handle a change to a session property.
   */
  private _onSessionChanged(sender: ISessionContext, type: string): void {
    if (type !== 'path') {
      return;
    }

    // The session uses local paths.
    // We need to convert it to a global path.
    const driveName = this._manager.contents.driveName(this.path);
    let newPath = this.sessionContext.session!.path;
    if (driveName) {
      newPath = `${driveName}:${newPath}`;
    }
    this._updatePath(newPath);
  }

  /**
   * Update our contents model, without the content.
   */
  private _updateContentsModel(
    model: Contents.IModel | Omit<Contents.IModel, 'content'>
  ): void {
    const newModel: Omit<Contents.IModel, 'content'> = {
      path: model.path,
      name: model.name,
      type: model.type,
      writable: model.writable,
      created: model.created,
      last_modified: model.last_modified,
      mimetype: model.mimetype,
      format: model.format,
      hash: model.hash,
      hash_algorithm: model.hash_algorithm
    };
    const mod = this._contentsModel?.last_modified ?? null;
    const hash = this._contentsModel?.hash ?? null;
    this._contentsModel = newModel;
    if (
      // If neither modification date nor hash available, assume the file has changed
      (!mod && !hash) ||
      // Compare last_modified if no hash
      (!hash && newModel.last_modified !== mod) ||
      // Compare hash if available
      (hash && newModel.hash !== hash)
    ) {
      this._fileChanged.emit(newModel);
    }
  }

  private _updatePath(newPath: string): void {
    if (this._path === newPath) {
      return;
    }

    this._path = newPath;
    const localPath = this._manager.contents.localPath(newPath);
    const name = PathExt.basename(localPath);
    if (this.sessionContext.session?.path !== localPath) {
      void this.sessionContext.session?.setPath(localPath);
    }
    if (this.sessionContext.session?.name !== name) {
      void this.sessionContext.session?.setName(name);
    }
    if ((this.urlResolver as RenderMimeRegistry.UrlResolver).path !== newPath) {
      (this.urlResolver as RenderMimeRegistry.UrlResolver).path = newPath;
    }
    if (
      this._contentsModel &&
      (this._contentsModel.path !== newPath ||
        this._contentsModel.name !== name)
    ) {
      const contentsModel = {
        ...this._contentsModel,
        name: name,
        path: newPath
      };
      this._updateContentsModel(contentsModel);
    }
    this._pathChanged.emit(newPath);
  }

  /**
   * Handle an initial population.
   */
  private async _populate(): Promise<void> {
    this._isPopulated = true;
    this._isReady = true;
    this._populatedPromise.resolve(void 0);

    // Add a checkpoint if none exists and the file is writable.
    await this._maybeCheckpoint(false);
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
        void this._dialogs.selectKernel(this.sessionContext);
      }
    });
  }

  /**
   * Rename the document.
   *
   * @param newName - the new name for the document.
   */
  private async _rename(newName: string): Promise<void> {
    const splitPath = this.localPath.split('/');
    splitPath[splitPath.length - 1] = newName;
    let newPath = PathExt.join(...splitPath);
    const driveName = this._manager.contents.driveName(this.path);
    if (driveName) {
      newPath = `${driveName}:${newPath}`;
    }

    // rename triggers a fileChanged which updates the contents model
    await this._manager.contents.rename(this.path, newPath);
  }

  /**
   * Save the document contents to disk.
   */
  private async _save(): Promise<void> {
    this._saveState.emit('started');
    const options = this._createSaveOptions();

    try {
      await this._manager.ready;
      if (this._model.collaborative) {
        // Files cannot be saved in collaborative mode. The "save" command
        // is disabled in the UI, but if the user tries to save anyway, act
        // as though it succeeded.
        this._saveState.emit('completed');
        return Promise.resolve();
      }

      const value = await this._maybeSave(options);
      if (this.isDisposed) {
        return;
      }

      this._model.dirty = false;
      this._updateContentsModel(value);

      if (!this._isPopulated) {
        await this._populate();
      }

      // Emit completion.
      this._saveState.emit('completed');
    } catch (err) {
      // If the save has been canceled by the user, throw the error
      // so that whoever called save() can decide what to do.
      const { name } = err;
      if (name === 'ModalCancelError' || name === 'ModalDuplicateError') {
        throw err;
      }

      // Otherwise show an error message and throw the error.
      const localPath = this._manager.contents.localPath(this._path);
      const file = PathExt.basename(localPath);
      void this._handleError(
        err,
        this._trans.__('File Save Error for %1', file)
      );

      // Emit failure.
      this._saveState.emit('failed');
      throw err;
    }
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
      hash: this._factory.fileFormat !== null,
      ...(this._factory.fileFormat !== null
        ? { format: this._factory.fileFormat }
        : {}),
      contentProviderId: this._contentProviderId
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
        if (contents.content) {
          if (contents.format === 'json') {
            model.fromJSON(contents.content);
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
    const promise = this._manager.contents.get(path, {
      content: false,
      hash: true,
      contentProviderId: this._contentProviderId
    });
    return promise.then(
      model => {
        if (this.isDisposed) {
          return Promise.reject(new Error('Disposed'));
        }
        // Since jupyter server may provide hash in model, we compare hash first
        const hashAvailable =
          this.contentsModel?.hash !== undefined &&
          this.contentsModel?.hash !== null &&
          model.hash !== undefined &&
          model.hash !== null;
        const hClient = this.contentsModel?.hash;
        const hDisk = model.hash;
        if (hashAvailable && hClient !== hDisk) {
          console.warn(`Different hash found for ${this.path}`);
          return this._raiseConflict(model, options);
        }

        // When hash is not provided, we compare last_modified
        // We want to check last_modified (disk) > last_modified (client)
        // (our last save)
        // In some cases the filesystem reports an inconsistent time, so we allow buffer when comparing.
        const lastModifiedCheckMargin = this._lastModifiedCheckMargin;
        const modified = this.contentsModel?.last_modified;
        const tClient = modified ? new Date(modified) : new Date();
        const tDisk = new Date(model.last_modified);
        if (
          !hashAvailable &&
          modified &&
          tDisk.getTime() - tClient.getTime() > lastModifiedCheckMargin
        ) {
          console.warn(
            `Last saving performed ${tClient} ` +
              `while the current file seems to have been saved ` +
              `${tDisk}`
          );
          return this._raiseConflict(model, options);
        }

        return this._manager.contents
          .save(path, options)
          .then(async contentsModel => {
            const model = await this._manager.contents.get(path, {
              content: false,
              hash: true,
              contentProviderId: this._contentProviderId
            });
            return {
              ...contentsModel,
              hash: model.hash,
              hash_algorithm: model.hash_algorithm
            } as Contents.IModel;
          });
      },
      err => {
        if (err.response && err.response.status === 404) {
          return this._manager.contents
            .save(path, options)
            .then(async contentsModel => {
              const model = await this._manager.contents.get(path, {
                content: false,
                hash: true,
                contentProviderId: this._contentProviderId
              });
              return {
                ...contentsModel,
                hash: model.hash,
                hash_algorithm: model.hash_algorithm
              } as Contents.IModel;
            });
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
   * Add a checkpoint if the file is writable.
   */
  private _maybeCheckpoint(force: boolean): Promise<void> {
    let promise = Promise.resolve(void 0);
    if (!this.canSave) {
      return promise;
    }
    if (force) {
      promise = this.createCheckpoint().then(/* no-op */);
    } else {
      promise = this.listCheckpoints().then(checkpoints => {
        if (!this.isDisposed && !checkpoints.length && this.canSave) {
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
  private _raiseConflict(
    model: Contents.IModel,
    options: Partial<Contents.IModel>
  ): Promise<Contents.IModel> {
    if (this._conflictModalIsOpen) {
      const error = new Error('Modal is already displayed');
      error.name = 'ModalDuplicateError';
      return Promise.reject(error);
    }
    const body = this._trans.__(
      `"%1" has changed on disk since the last time it was opened or saved.
Do you want to overwrite the file on disk with the version open here,
or load the version on disk (revert)?`,
      this.path
    );
    const revertBtn = Dialog.okButton({
      label: this._trans.__('Revert'),
      actions: ['revert']
    });
    const overwriteBtn = Dialog.warnButton({
      label: this._trans.__('Overwrite'),
      actions: ['overwrite']
    });
    this._conflictModalIsOpen = true;
    return showDialog({
      title: this._trans.__('File Changed'),
      body,
      buttons: [Dialog.cancelButton(), revertBtn, overwriteBtn]
    }).then(result => {
      this._conflictModalIsOpen = false;
      if (this.isDisposed) {
        return Promise.reject(new Error('Disposed'));
      }
      if (result.button.actions.includes('overwrite')) {
        return this._manager.contents.save(this._path, {
          ...options,
          contentProviderId: this._contentProviderId
        });
      }
      if (result.button.actions.includes('revert')) {
        return this.revert().then(() => {
          return model;
        });
      }
      const error = new Error('Cancel');
      error.name = 'ModalCancelError';
      return Promise.reject(error); // Otherwise cancel the save.
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
      label: this._trans.__('Overwrite'),
      accept: true
    });
    return showDialog({
      title: this._trans.__('File Overwrite?'),
      body,
      buttons: [Dialog.cancelButton(), overwriteBtn]
    }).then(result => {
      if (this.isDisposed) {
        return Promise.reject(new Error('Disposed'));
      }

      if (result.button.accept) {
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
    this._saveState.emit('started');
    try {
      await this._manager.ready;
      const options = this._createSaveOptions();
      await this._manager.contents.save(newPath, options);
      await this._maybeCheckpoint(true);

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
      return;
    }
  }

  private _createSaveOptions(): Partial<Contents.IModel> {
    let content: PartialJSONValue = null;
    if (this._factory.fileFormat === 'json') {
      content = this._model.toJSON();
    } else {
      content = this._model.toString();
      if (this._lineEnding) {
        content = content.replace(/\n/g, this._lineEnding);
      }
    }

    return {
      type: this._factory.contentType,
      format: this._factory.fileFormat,
      content
    };
  }

  protected translator: ITranslator;

  private _isReady = false;
  private _isDisposed = false;
  private _isPopulated = false;
  private _trans: TranslationBundle;
  private _contentProviderId?: string;
  private _manager: ServiceManager.IManager;
  private _opener: (
    widget: Widget,
    options?: DocumentRegistry.IOpenOptions
  ) => void;

  private _model: T;
  private _path = '';
  private _lineEnding: string | null = null;
  private _factory: DocumentRegistry.IModelFactory<T>;
  private _contentsModel: Omit<Contents.IModel, 'content'> | null = null;

  private _readyPromise: Promise<void>;
  private _populatedPromise = new PromiseDelegate<void>();
  private _pathChanged = new Signal<this, string>(this);
  private _fileChanged = new Signal<this, Omit<Contents.IModel, 'content'>>(
    this
  );
  private _saveState = new Signal<this, DocumentRegistry.SaveState>(this);
  private _disposed = new Signal<this, void>(this);
  private _dialogs: ISessionContext.IDialogs;
  private _lastModifiedCheckMargin = 500;
  private _conflictModalIsOpen = false;
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
     * The kernel preference associated with the context.
     */
    kernelPreference?: ISessionContext.IKernelPreference;

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

    /**
     * Identifier of the content provider used for file operations.
     * @experimental
     */
    contentProviderId?: string;
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

    const saveBtn = Dialog.okButton({ label: trans.__('Save'), accept: true });
    return showDialog({
      title: trans.__('Save File As…'),
      body: new SaveWidget(path),
      buttons: [Dialog.cancelButton(), saveBtn]
    }).then(result => {
      if (result.button.accept) {
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
