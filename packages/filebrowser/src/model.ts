// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IChangedArgs, IStateDB, PathExt
} from '@jupyterlab/coreutils';

import {
  IDocumentManager, shouldOverwrite
} from '@jupyterlab/docmanager';

import {
  Contents, Kernel, Session
} from '@jupyterlab/services';

import {
  ArrayIterator, each, find, IIterator, IterableOrArrayLike
} from '@phosphor/algorithm';

import {
  PromiseDelegate, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';


/**
 * The duration of auto-refresh in ms.
 */
const REFRESH_DURATION = 10000;

/**
 * The enforced time between refreshes in ms.
 */
const MIN_REFRESH = 1000;


/**
 * An implementation of a file browser model.
 *
 * #### Notes
 * All paths parameters without a leading `'/'` are interpreted as relative to
 * the current directory.  Supports `'../'` syntax.
 */
export
class FileBrowserModel implements IDisposable {
  /**
   * Construct a new file browser model.
   */
  constructor(options: FileBrowserModel.IOptions) {
    this.manager = options.manager;
    this._driveName = options.driveName || '';
    let rootPath = this._driveName ? this._driveName + ':' : '';
    this._model = {
      path: rootPath,
      name: PathExt.basename(rootPath),
      type: 'directory',
      content: undefined,
      writable: false,
      created: 'unknown',
      last_modified: 'unknown',
      mimetype: 'text/plain',
      format: 'text'
    };
    this._state = options.state || null;

    const { services } = options.manager;
    services.contents.fileChanged.connect(this._onFileChanged, this);
    services.sessions.runningChanged.connect(this._onRunningChanged, this);

    this._scheduleUpdate();
    this._startTimer();
  }

  /**
   * The document manager instance used by the file browser model.
   */
  readonly manager: IDocumentManager;

  /**
   * A signal emitted when the file browser model loses connection.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * A promise that resolves when the model is first restored.
   */
  get restored(): Promise<void> {
    return this._restored.promise;
  }

  /**
   * Get the file path changed signal.
   */
  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * Get the current path.
   */
  get path(): string {
    return this._model ? this._model.path : '';
  }

  /**
   * A signal emitted when the path changes.
   */
  get pathChanged(): ISignal<this, IChangedArgs<string>> {
    return this._pathChanged;
  }

  /**
   * A signal emitted when the directory listing is refreshed.
   */
  get refreshed(): ISignal<this, void> {
    return this._refreshed;
  }

  /**
   * Get the kernel spec models.
   */
  get specs(): Kernel.ISpecModels | null {
    return this.manager.services.sessions.specs;
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearTimeout(this._timeoutId);
    this._sessions.length = 0;
    this._items.length = 0;
    Signal.clearData(this);
  }

  /**
   * Create an iterator over the model's items.
   *
   * @returns A new iterator over the model's items.
   */
  items(): IIterator<Contents.IModel> {
    return new ArrayIterator(this._items);
  }

  /**
   * Create an iterator over the active sessions in the directory.
   *
   * @returns A new iterator over the model's active sessions.
   */
  sessions(): IIterator<Session.IModel> {
    return new ArrayIterator(this._sessions);
  }

  /**
   * Force a refresh of the directory contents.
   */
  refresh(): Promise<void> {
    this._lastRefresh = new Date().getTime();
    this._requested = false;
    return this.cd('.');
  }

  /**
   * Change directory.
   *
   * @param path - The path to the file or directory.
   *
   * @returns A promise with the contents of the directory.
   */
  cd(newValue = '.'): Promise<void> {
    if (newValue !== '.') {
      newValue = Private.normalizePath(this.manager.services.contents,
                                       this._model.path, newValue);
    } else {
      newValue = this._pendingPath || this._model.path;
    }
    // Collapse requests to the same directory.
    if (newValue === this._pendingPath && this._pending) {
      return this._pending;
    }
    let oldValue = this.path;
    let options: Contents.IFetchOptions = { content: true };
    this._pendingPath = newValue;
    if (oldValue !== newValue) {
      this._sessions.length = 0;
    }
    let services = this.manager.services;
    this._pending = services.contents.get(newValue, options).then(contents => {
      if (this.isDisposed) {
        return;
      }
      this._refreshDuration = REFRESH_DURATION;
      this._handleContents(contents);
      this._pendingPath = null;
      if (oldValue !== newValue) {
        // If there is a state database and a unique key, save the new path.
        if (this._state && this._key) {
          this._state.save(this._key, { path: newValue });
        }

        this._pathChanged.emit({
          name: 'path',
          oldValue,
          newValue
        });
      }
      this._onRunningChanged(services.sessions, services.sessions.running());
      this._refreshed.emit(void 0);
    }).catch(error => {
      this._pendingPath = null;
      if (error.message === 'Not Found') {
        error.message = `Directory not found: "${this._model.path}"`;
        console.error(error);
        this._connectionFailure.emit(error);
        this.cd('/');
      } else {
        this._refreshDuration = REFRESH_DURATION * 10;
        this._connectionFailure.emit(error);
      }
    });
    return this._pending;
  }

  /**
   * Download a file.
   *
   * @param path - The path of the file to be downloaded.
   *
   * @returns A promise which resolves when the file has begun
   *   downloading.
   */
  download(path: string): Promise<void> {
    return this.manager.services.contents.getDownloadUrl(path).then(url => {
      let element = document.createElement('a');
      document.body.appendChild(element);
      element.setAttribute('href', url);
      element.setAttribute('download', '');
      element.click();
      document.body.removeChild(element);
      return void 0;
    });
  }

  /**
   * Restore the state of the file browser.
   *
   * @param id - The unique ID that is used to construct a state database key.
   *
   * @returns A promise when restoration is complete.
   *
   * #### Notes
   * This function will only restore the model *once*. If it is called multiple
   * times, all subsequent invocations are no-ops.
   */
  restore(id: string): Promise<void> {
    const state = this._state;
    const restored = !!this._key;
    if (!state || restored) {
      return Promise.resolve(void 0);
    }

    const manager = this.manager;
    const key = `file-browser-${id}:cwd`;
    const ready = manager.services.ready;
    return Promise.all([state.fetch(key), ready]).then(([cwd]) => {
      if (!cwd) {
        this._restored.resolve(void 0);
        return;
      }

      const path = (cwd as ReadonlyJSONObject)['path'] as string;
      const localPath = manager.services.contents.localPath(path);
      return manager.services.contents.get(path)
        .then(() => this.cd(localPath))
        .catch(() => state.remove(key));
    }).catch(() => state.remove(key))
      .then(() => {
        this._key = key;
        this._restored.resolve(void 0);
      }); // Set key after restoration is done.
  }

  /**
   * Upload a `File` object.
   *
   * @param file - The `File` object to upload.
   *
   * @returns A promise containing the new file contents model.
   *
   * #### Notes
   * This will fail to upload files that are too big to be sent in one
   * request to the server.
   */
  upload(file: File): Promise<Contents.IModel> {
    // Skip large files with a warning.
    if (file.size > this._maxUploadSizeMb * 1024 * 1024) {
      let msg = `Cannot upload file (>${this._maxUploadSizeMb} MB) `;
      msg += `"${file.name}"`;
      console.warn(msg);
      return Promise.reject<Contents.IModel>(new Error(msg));
    }

    return this.refresh().then(() => {
      if (this.isDisposed) {
        return Promise.resolve(false);
      }
      let item = find(this._items, i => i.name === file.name);
      if (item) {
        return shouldOverwrite(file.name);
      }
      return Promise.resolve(true);
    }).then(value => {
      if (value) {
        return this._upload(file);
      }
      return Promise.reject('File not uploaded');
    });
  }

  /**
   * Perform the actual upload.
   */
  private _upload(file: File): Promise<Contents.IModel> {
    // Gather the file model parameters.
    let path = this._model.path;
    path = path ? path + '/' + file.name : file.name;
    let name = file.name;
    let isNotebook = file.name.indexOf('.ipynb') !== -1;
    let type: Contents.ContentType = isNotebook ? 'notebook' : 'file';
    let format: Contents.FileFormat = isNotebook ? 'json' : 'base64';

    // Get the file content.
    let reader = new FileReader();
    if (isNotebook) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    return new Promise<Contents.IModel>((resolve, reject) => {
      reader.onload = (event: Event) => {
        let model: Partial<Contents.IModel> = {
          type: type,
          format,
          name,
          content: Private.getContent(reader)
        };

        this.manager.services.contents.save(path, model).then(contents => {
          resolve(contents);
        }).catch(reject);
      };

      reader.onerror = (event: Event) => {
        reject(Error(`Failed to upload "${file.name}":` + event));
      };
    });

  }

  /**
   * Handle an updated contents model.
   */
  private _handleContents(contents: Contents.IModel): void {
    // Update our internal data.
    this._model = {
      name: contents.name,
      path: contents.path,
      type: contents.type,
      content: undefined,
      writable: contents.writable,
      created: contents.created,
      last_modified: contents.last_modified,
      mimetype: contents.mimetype,
      format: contents.format
    };
    this._items = contents.content;
    this._paths.clear();
    contents.content.forEach((model: Contents.IModel) => {
      this._paths.add(model.path);
    });
  }

  /**
   * Handle a change to the running sessions.
   */
  private _onRunningChanged(sender: Session.IManager, models: IterableOrArrayLike<Session.IModel>): void {
    this._populateSessions(models);
    this._refreshed.emit(void 0);
  }

  /**
   * Handle a change on the contents manager.
   */
  private _onFileChanged(sender: Contents.IManager, change: Contents.IChangedArgs): void {
    let path = this._model.path;
    let { sessions } = this.manager.services;
    let { oldValue, newValue } = change;
    let value = oldValue && oldValue.path &&
      PathExt.dirname(oldValue.path) === path ? oldValue
        : newValue && newValue.path && PathExt.dirname(newValue.path) === path
          ? newValue : undefined;

    // If either the old value or the new value is in the current path, update.
    if (value) {
      this._scheduleUpdate();
      this._populateSessions(sessions.running());
      this._fileChanged.emit(change);
      return;
    }
  }

  /**
   * Populate the model's sessions collection.
   */
  private _populateSessions(models: IterableOrArrayLike<Session.IModel>): void {
    this._sessions.length = 0;
    each(models, model => {
      if (this._paths.has(model.path)) {
        this._sessions.push(model);
      }
    });
  }

  /**
   * Start the internal refresh timer.
   */
  private _startTimer(): void {
    this._timeoutId = window.setInterval(() => {
      if (this._requested) {
        this.refresh();
        return;
      }
      if (document.hidden) {
        // Don't poll when nobody's looking.
        return;
      }
      let date = new Date().getTime();
      if ((date - this._lastRefresh) > this._refreshDuration) {
        this.refresh();
      }
    }, MIN_REFRESH);
  }

  /**
   * Handle internal model refresh logic.
   */
  private _scheduleUpdate(): void {
    let date = new Date().getTime();
    if ((date - this._lastRefresh) > MIN_REFRESH) {
      this.refresh();
    } else {
      this._requested = true;
    }
  }

  private _connectionFailure = new Signal<this, Error>(this);
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  private _items: Contents.IModel[] = [];
  private _key: string = '';
  private _maxUploadSizeMb = 15;
  private _model: Contents.IModel;
  private _pathChanged = new Signal<this, IChangedArgs<string>>(this);
  private _paths = new Set<string>();
  private _pending: Promise<void> | null = null;
  private _pendingPath: string | null = null;
  private _refreshed = new Signal<this, void>(this);
  private _lastRefresh = -1;
  private _requested = false;
  private _sessions: Session.IModel[] = [];
  private _state: IStateDB | null = null;
  private _timeoutId = -1;
  private _refreshDuration = REFRESH_DURATION;
  private _driveName: string;
  private _isDisposed = false;
  private _restored = new PromiseDelegate<void>();
}


/**
 * The namespace for the `FileBrowserModel` class statics.
 */
export
namespace FileBrowserModel {
  /**
   * An options object for initializing a file browser.
   */
  export
  interface IOptions {
    /**
     * A document manager instance.
     */
    manager: IDocumentManager;

    /**
     * An optional `Contents.IDrive` name for the model.
     * If given, the model will prepend `driveName:` to
     * all paths used in file operations.
     */
    driveName?: string;

    /**
     * An optional state database. If provided, the model will restore which
     * folder was last opened when it is restored.
     */
    state?: IStateDB;
  }
}


/**
 * The namespace for the file browser model private data.
 */
namespace Private {
  /**
   * Parse the content of a `FileReader`.
   *
   * If the result is an `ArrayBuffer`, return a Base64-encoded string.
   * Otherwise, return the JSON parsed result.
   */
  export
  function getContent(reader: FileReader): any {
    if (reader.result instanceof ArrayBuffer) {
      // Base64-encode binary file data.
      let bytes = '';
      let buf = new Uint8Array(reader.result);
      let nbytes = buf.byteLength;
      for (let i = 0; i < nbytes; i++) {
        bytes += String.fromCharCode(buf[i]);
      }
      return btoa(bytes);
    } else {
      return JSON.parse(reader.result);
    }
  }

  /**
   * Normalize a path based on a root directory, accounting for relative paths.
   */
  export
  function normalizePath(contents: Contents.IManager, root: string, path: string): string {
    const driveName = contents.driveName(root);
    const localPath = contents.localPath(root);
    const resolved = PathExt.resolve(localPath, path);
    return driveName ? `${driveName}:${resolved}` : resolved;
  }
}
