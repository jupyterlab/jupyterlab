// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, ServiceManager
} from '@jupyterlab/services';

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';

import {
  showDialog, ClientSession, Dialog, IClientSession
} from '@jupyterlab/apputils';

import {
  PathExt, URLExt, IModelDB, ModelDB
} from '@jupyterlab/coreutils';

import {
  DocumentRegistry
} from '.';


/**
 * An implementation of a document context.
 *
 * This class is typically instantiated by the document manger.
 */
export
class Context<T extends DocumentRegistry.IModel> implements DocumentRegistry.IContext<T> {
  /**
   * Construct a new document context.
   */
  constructor(options: Context.IOptions<T>) {
    let manager = this._manager = options.manager;
    this._factory = options.factory;
    this._opener = options.opener;
    this._path = options.path;
    let ext = DocumentRegistry.extname(this._path);
    let lang = this._factory.preferredLanguage(ext);

    if (options.modelDBFactory) {
      this._modelDB = options.modelDBFactory.createNew(this._path.split(':').pop());
      this._model = this._factory.createNew(lang, this._modelDB);
    } else {
      this._model = this._factory.createNew(lang);
    }

    this._readyPromise = manager.ready.then(() => {
      return this._populatedPromise.promise;
    });
    this.session = new ClientSession({
      manager: manager.sessions,
      path: this._path,
      name: this._path.split('/').pop(),
      kernelPreference: options.kernelPreference || { shouldStart: false }
    });
    this.session.propertyChanged.connect(this._onSessionChanged, this);
    manager.contents.fileChanged.connect(this._onFileChanged, this);
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
   * A signal emitted when the context is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
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
  readonly session: ClientSession;

  /**
   * The current path associated with the document.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The current contents model associated with the document
   *
   * #### Notes
   * The model will have an  empty `contents` field.
   */
  get contentsModel(): Contents.IModel {
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
    return this._model === null;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    if (this._model == null) {
      return;
    }
    let model = this._model;
    this.session.dispose();
    if (this._modelDB) {
      this._modelDB.dispose();
    }
    this._model = null;
    this._manager = null;
    this._factory = null;
    this._modelDB = null;

    model.dispose();
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
   * Populate the contents of the model, either from
   * disk or from the modelDB backend.
   *
   * @returns a promise that resolves upon model population.
   */
  fromStore(): Promise<void> {
    if (this._modelDB) {
      return this._modelDB.connected.then(() => {
        if (this._modelDB.isPrepopulated) {
          return this.save();
        } else {
          return this.revert();
        }
      });
    } else {
      return this.revert();
    }
  }

  /**
   * Save the document contents to disk.
   */
  save(): Promise<void> {
    let model = this._model;
    let path = this._path;
    if (model.readOnly) {
      return Promise.reject(new Error('Read only'));
    }
    let content: JSONObject | string;
    if (this._factory.fileFormat === 'json') {
      content = model.toJSON();
    } else {
      content = model.toString();
    }

    let options = {
      type: this._factory.contentType,
      format: this._factory.fileFormat,
      content
    };

    return this._manager.ready.then(() => {
      return this._manager.contents.save(path, options);
    }).then(value => {
      if (this.isDisposed) {
        return;
      }
      model.dirty = false;
      this._updateContentsModel(value);

      if (!this._isPopulated) {
        return this._populate();
      }
    }).catch(err => {
      showDialog({
        title: 'File Save Error',
        body: err.xhr.responseText,
        buttons: [Dialog.okButton()]
      });
    });
  }

  /**
   * Save the document to a different path chosen by the user.
   */
  saveAs(): Promise<void> {
    return Private.getSavePath(this._path).then(newPath => {
      if (this.isDisposed || !newPath) {
        return;
      }
      this._path = newPath;
      this.session.setName(newPath.split('/').pop());
      return this.session.setPath(newPath).then(() => this.save());
    });
  }

  /**
   * Revert the document contents to disk contents.
   */
  revert(): Promise<void> {
    let opts: Contents.IFetchOptions = {
      format: this._factory.fileFormat,
      type: this._factory.contentType,
      content: true
    };
    let path = this._path;
    let model = this._model;
    return this._manager.ready.then(() => {
      return this._manager.contents.get(path, opts);
    }).then(contents => {
      if (this.isDisposed) {
        return;
      }
      if (contents.format === 'json') {
        model.fromJSON(contents.content);
      } else {
        model.fromString(contents.content);
      }
      this._updateContentsModel(contents);
      model.dirty = false;
      if (!this._isPopulated) {
        return this._populate();
      }
    }).catch(err => {
      showDialog({
        title: 'File Load Error',
        body: err.xhr.responseText,
        buttons: [Dialog.okButton()]
      });
    });
  }

  /**
   * Create a checkpoint for the file.
   */
  createCheckpoint(): Promise<Contents.ICheckpointModel> {
    let contents = this._manager.contents;
    return this._manager.ready.then(() => {
      return contents.createCheckpoint(this._path);
    });
  }

  /**
   * Delete a checkpoint for the file.
   */
  deleteCheckpoint(checkpointId: string): Promise<void> {
    let contents = this._manager.contents;
    return this._manager.ready.then(() => {
      return contents.deleteCheckpoint(this._path, checkpointId);
    });
  }

  /**
   * Restore the file to a known checkpoint state.
   */
  restoreCheckpoint(checkpointId?: string): Promise<void> {
    let contents = this._manager.contents;
    let path = this._path;
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
    let contents = this._manager.contents;
    return this._manager.ready.then(() => {
      return contents.listCheckpoints(this._path);
    });
  }

  /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(url: string): Promise<string> {
    if (URLExt.isLocal(url)) {
      let cwd = PathExt.dirname(this._path);
      url = PathExt.resolve(cwd, url);
    }
    return Promise.resolve(url);
  }

  /**
   * Get the download url of a given absolute server path.
   */
  getDownloadUrl(path: string): Promise<string> {
    let contents = this._manager.contents;
    if (URLExt.isLocal(path)) {
      return this._manager.ready.then(() => contents.getDownloadUrl(path));
    }
    return Promise.resolve(path);
  }

  /**
   * Add a sibling widget to the document manager.
   */
  addSibling(widget: Widget): IDisposable {
    let opener = this._opener;
    if (opener) {
      opener(widget);
    }
    return new DisposableDelegate(() => {
      widget.close();
    });
  }

  /**
   * Handle a change on the contents manager.
   */
  private _onFileChanged(sender: Contents.IManager, change: Contents.IChangedArgs): void {
    if (change.type !== 'rename') {
      return;
    }
    if (change.oldValue.path === this._path) {
      let newPath = change.newValue.path;
      this.session.setPath(newPath);
      this.session.setName(newPath.split('/').pop());
      this._path = newPath;
      this._updateContentsModel(change.newValue);
      this._pathChanged.emit(this._path);
    }
  }

  /**
   * Handle a change to a session property.
   */
  private _onSessionChanged() {
    let path = this.session.path;
    if (path !== this._path) {
      this._path = path;
      this._pathChanged.emit(path);
    }
  }

  /**
   * Update our contents model, without the content.
   */
  private _updateContentsModel(model: Contents.IModel): void {
    let newModel: Contents.IModel = {
      path: model.path,
      name: model.name,
      type: model.type,
      writable: model.writable,
      created: model.created,
      last_modified: model.last_modified,
      mimetype: model.mimetype,
      format: model.format
    };
    let mod = this._contentsModel ? this._contentsModel.last_modified : null;
    this._contentsModel = newModel;
    if (!mod || newModel.last_modified !== mod) {
      this._fileChanged.emit(newModel);
    }
  }

  /**
   * Handle an initial population.
   */
  private _populate(): Promise<void> {
    this._isPopulated = true;
    // Add a checkpoint if none exists.
    return this.listCheckpoints().then(checkpoints => {
      if (!this.isDisposed && !checkpoints) {
        return this.createCheckpoint();
      }
    }).then(() => {
      if (this.isDisposed) {
        return;
      }
      // Update the kernel preference.
      let name = (
        this._model.defaultKernelName || this.session.kernelPreference.name
      );
      this.session.kernelPreference = {
        ...this.session.kernelPreference,
        name,
        language: this._model.defaultKernelLanguage,
      };
      return this.session.initialize();
    }).then(() => {
      this._isReady = true;
      this._populatedPromise.resolve(void 0);
    });
  }

  private _manager: ServiceManager.IManager = null;
  private _opener: (widget: Widget) => void = null;
  private _model: T = null;
  private _modelDB: IModelDB = null;
  private _path = '';
  private _factory: DocumentRegistry.IModelFactory<T> = null;
  private _contentsModel: Contents.IModel = null;
  private _readyPromise: Promise<void>;
  private _populatedPromise = new PromiseDelegate<void>();
  private _isPopulated = false;
  private _isReady = false;
  private _pathChanged = new Signal<this, string>(this);
  private _fileChanged = new Signal<this, Contents.IModel>(this);
  private _disposed = new Signal<this, void>(this);
}


/**
 * A namespace for `Context` statics.
 */
export namespace Context {
  /**
   * The options used to initialize a context.
   */
  export
  interface IOptions<T extends DocumentRegistry.IModel> {
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
    kernelPreference?: IClientSession.IKernelPreference;

    /**
     * An IModelDB factory method which may be used for the document.
     */
    modelDBFactory?: ModelDB.IFactory;

    /**
     * An optional callback for opening sibling widgets.
     */
    opener?: (widget: Widget) => void;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get a new file path from the user.
   */
  export
  function getSavePath(path: string): Promise<string> {
    let input = document.createElement('input');
    input.value = path;
    let saveBtn = Dialog.okButton({ label: 'SAVE' });
    return showDialog({
      title: 'Save File As..',
      body: input,
      buttons: [Dialog.cancelButton(), saveBtn]
    }).then(result => {
      if (result.label === 'SAVE') {
        return input.value;
      }
    });
  }
}
