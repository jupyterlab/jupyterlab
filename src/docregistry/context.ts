// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Contents, Kernel, ServiceManager, utils
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
  showDialog, okButton
} from '../common/dialog';

import {
  IKernelContext, KernelContext
} from '../common/kernelcontext';

import {
  DocumentRegistry
} from '../docregistry';


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
    this._model = this._factory.createNew(lang);
    let type = this._path.indexOf('.ipynb') !== -1 ? 'notebook' : 'file';
    this._kernelContext = new KernelContext({
      manager: manager.sessions,
      path: this._path,
      type,
      name: this._path.split('/').pop(),
      preferredKernelName: this._model.preferredKernelName,
      preferredKernelLanguage: this._model.preferredKernelLanguage
    });
    this._model.stateChanged.connect(this._onModelStateChanged, this);
    manager.contents.fileChanged.connect(this._onFileChanged, this);
    this._readyPromise = manager.ready.then(() => {
      return this._populatedPromise.promise;
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
   * The current kernel associated with the document.
   */
  get kernel(): Kernel.IKernel {
    return this._kernelContext.kernel;
  }

  /**
   * The kernel context associated with the documnet.
   */
  get kernelContext(): IKernelContext {
    return this._kernelContext;
  }

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
    this._model = null;
    this._manager = null;
    this._factory = null;

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

    let promise = this._manager.contents.save(path, options);
    return promise.then(value => {
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
        buttons: [okButton]
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
      this._pathChanged.emit(newPath);
      let promises = [this._kernelContext.rename(newPath), this.save()];
      return Promise.all(promises);
    }).then(() => void 0);
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
    return this._manager.contents.get(path, opts).then(contents => {
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
        buttons: [okButton]
      });
    });
  }

  /**
   * Create a checkpoint for the file.
   */
  createCheckpoint(): Promise<Contents.ICheckpointModel> {
    return this._manager.contents.createCheckpoint(this._path);
  }

  /**
   * Delete a checkpoint for the file.
   */
  deleteCheckpoint(checkpointId: string): Promise<void> {
    return this._manager.contents.deleteCheckpoint(this._path, checkpointId);
  }

  /**
   * Restore the file to a known checkpoint state.
   */
  restoreCheckpoint(checkpointId?: string): Promise<void> {
    let contents = this._manager.contents;
    let path = this._path;
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
  }

  /**
   * List available checkpoints for a file.
   */
  listCheckpoints(): Promise<Contents.ICheckpointModel[]> {
    return this._manager.contents.listCheckpoints(this._path);
  }

  /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(url: string): Promise<string> {
    // Ignore urls that have a protocol.
    if (utils.urlParse(url).protocol || url.indexOf('//') === 0) {
      return Promise.resolve(url);
    }
    let cwd = ContentsManager.dirname(this._path);
    let path = ContentsManager.getAbsolutePath(url, cwd);
    return Promise.resolve(path);
  }

  /**
   * Get the download url of a given absolute server path.
   */
  getDownloadUrl(path: string): Promise<string> {
    // Ignore urls that have a protocol.
    if (utils.urlParse(path).protocol || path.indexOf('//') === 0) {
      return Promise.resolve(path);
    }
    return this._manager.contents.getDownloadUrl(path);
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
      this._path = newPath;
      this._kernelContext.rename(newPath);
      this._updateContentsModel(change.newValue);
      this._pathChanged.emit(this._path);
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
      this._isReady = true;
      this._populatedPromise.resolve(void 0);
    });
  }

  /**
   * Handle a change in model state.
   */
  private _onModelStateChanged(): void {
    let model = this._model;
    let context = this._kernelContext;
    context.preferredKernelName = model.preferredKernelName;
    context.preferredKernelLanguage = model.preferredKernelLanguage;
  }

  private _manager: ServiceManager.IManager = null;
  private _opener: (widget: Widget) => void = null;
  private _model: T = null;
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
  private _kernelContext: KernelContext;
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
    return showDialog({
      title: 'Save File As..',
      body: input,
      okText: 'SAVE'
    }).then(result => {
      if (result.text === 'SAVE') {
        return input.value;
      }
    });
  }
}
