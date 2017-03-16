// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, Kernel, ServiceManager, Session
} from '@jupyterlab/services';

import {
  ArrayExt, ArrayIterator, IterableOrArrayLike, IIterator, each, toArray
} from '@phosphor/algorithm';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IChangedArgs, PathExt, uuid
} from '@jupyterlab/coreutils';

import {
  IPathTracker
} from './tracker';


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
class FileBrowserModel implements IDisposable, IPathTracker {
  /**
   * Construct a new file browser model.
   */
  constructor(options: FileBrowserModel.IOptions) {
    this._manager = options.manager;
    this._model = { path: '', name: '/', type: 'directory' };
    this._manager.contents.fileChanged.connect(this._onFileChanged, this);
    this._manager.sessions.runningChanged.connect(this._onRunningChanged, this);
    this._scheduleUpdate();
    this._refreshId = window.setInterval(() => {
      this._scheduleUpdate();
    }, REFRESH_DURATION);
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
   * A signal emitted when the running sessions in the directory changes.
   */
  get sessionsChanged(): ISignal<this, void> {
    return this._sessionsChanged;
  }

  /**
   * Get the file path changed signal.
   */
  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * A signal emitted when the file browser model loses connection.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * Get the current path.
   */
  get path(): string {
    return this._model ? this._model.path : '';
  }

  /**
   * Get the kernel spec models.
   */
  get specs(): Kernel.ISpecModels | null {
    return this._manager.sessions.specs;
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._model === null;
  }
  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this._model === null) {
      return;
    }
    this._model = null;
    this._manager = null;
    clearTimeout(this._timeoutId);
    clearInterval(this._refreshId);
    clearTimeout(this._blackoutId);
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
      newValue = Private.normalizePath(this._model.path, newValue);
    } else {
      newValue = this._pendingPath || this._model.path;
    }
    // Collapse requests to the same directory.
    if (newValue === this._pendingPath) {
      return this._pending;
    }
    let oldValue = this.path;
    let options: Contents.IFetchOptions = { content: true };
    this._pendingPath = newValue;
    if (oldValue !== newValue) {
      this._sessions.length = 0;
    }
    let manager = this._manager;
    this._pending = manager.contents.get(newValue, options).then(contents => {
      if (this.isDisposed) {
        return;
      }
      this._handleContents(contents);
      this._pendingPath = null;
      if (oldValue !== newValue) {
        this._pathChanged.emit({
          name: 'path',
          oldValue,
          newValue
        });
      }
      this._onRunningChanged(manager.sessions, manager.sessions.running());
      this._refreshed.emit(void 0);
    }).catch(error => {
      this._pendingPath = null;
      this._connectionFailure.emit(error);
    });
    return this._pending;
  }

  /**
   * Copy a file.
   *
   * @param fromFile - The path of the original file.
   *
   * @param toDir - The path to the target directory.
   *
   * @returns A promise which resolves to the contents of the file.
   */
  copy(fromFile: string, toDir: string): Promise<Contents.IModel> {
    let normalizePath = Private.normalizePath;
    fromFile = normalizePath(this._model.path, fromFile);
    toDir = normalizePath(this._model.path, toDir);
    return this._manager.contents.copy(fromFile, toDir);
  }

  /**
   * Delete a file.
   *
   * @param: path - The path to the file to be deleted.
   *
   * @returns A promise which resolves when the file is deleted.
   *
   * #### Notes
   * If there is a running session associated with the file and no other
   * sessions are using the kernel, the session will be shut down.
   */
  deleteFile(path: string): Promise<void> {
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    return this.stopIfNeeded(path).then(() => {
      return this._manager.contents.delete(path);
    });
  }

  /**
   * Download a file.
   *
   * @param - path - The path of the file to be downloaded.
   *
   * @returns A promise which resolves when the file has begun
   *   downloading.
   */
  download(path: string): Promise<void> {
    return this._manager.contents.getDownloadUrl(path).then(url => {
      let element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', '');
      element.click();
      return void 0;
    });
  }

  /**
   * Create a new untitled file or directory in the current directory.
   *
   * @param type - The type of file object to create. One of
   *  `['file', 'notebook', 'directory']`.
   *
   * @param ext - Optional extension for `'file'` types (defaults to `'.txt'`).
   *
   * @returns A promise containing the new file contents model.
   */
  newUntitled(options: Contents.ICreateOptions): Promise<Contents.IModel> {
    if (options.type === 'file') {
      options.ext = options.ext || '.txt';
    }
    options.path = options.path || this._model.path;
    return this._manager.contents.newUntitled(options);
  }

  /**
   * Rename a file or directory.
   *
   * @param path - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @returns A promise containing the new file contents model.  The promise
   *   will reject if the newPath already exists.  Use [[overwrite]] to
   *   overwrite a file.
   */
  rename(path: string, newPath: string): Promise<Contents.IModel> {
    // Handle relative paths.
    path = Private.normalizePath(this._model.path, path);
    newPath = Private.normalizePath(this._model.path, newPath);

    return this._manager.contents.rename(path, newPath);
  }

  /**
   * Overwrite a file.
   *
   * @param path - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @returns A promise containing the new file contents model.
   */
  overwrite(path: string, newPath: string): Promise<Contents.IModel> {
    // Cleanly overwrite the file by moving it, making sure the original
    // does not exist, and then renaming to the new path.
    let tempPath = `${newPath}.${uuid()}`;
    let cb = () => { return this.rename(tempPath, newPath); };
    return this.rename(path, tempPath).then(() => {
      return this.deleteFile(newPath);
    }).then(cb, cb);
  }

  /**
   * Upload a `File` object.
   *
   * @param file - The `File` object to upload.
   *
   * @param overwrite - Whether to overwrite an existing file.
   *
   * @returns A promise containing the new file contents model.
   *
   * #### Notes
   * This will fail to upload files that are too big to be sent in one
   * request to the server.
   */
  upload(file: File, overwrite?: boolean): Promise<Contents.IModel> {
    // Skip large files with a warning.
    if (file.size > this._maxUploadSizeMb * 1024 * 1024) {
      let msg = `Cannot upload file (>${this._maxUploadSizeMb} MB) `;
      msg += `"${file.name}"`;
      console.warn(msg);
      return Promise.reject<Contents.IModel>(new Error(msg));
    }

    if (overwrite) {
      return this._upload(file);
    }

    let path = this._model.path;
    path = path ? path + '/' + file.name : file.name;
    return this._manager.contents.get(path, {}).then(() => {
      let msg = `"${file.name}" already exists`;
      throw new Error(msg);
    }, () => {
      if (this.isDisposed) {
        return;
      }
      return this._upload(file);
    });
  }

  /**
   * Shut down a session by session id.
   *
   * @param id - The id of the session.
   *
   * @returns A promise that resolves when the action is complete.
   */
  shutdown(id: string): Promise<void> {
    return this._manager.sessions.shutdown(id);
  }

  /**
   * Find a session associated with a path and stop it is the only
   * session using that kernel.
   */
  protected stopIfNeeded(path: string): Promise<void> {
    let sessions = toArray(this._sessions);
    let index = ArrayExt.findFirstIndex(sessions, value => value.notebook.path === path);
    if (index !== -1) {
      let count = 0;
      let model = sessions[index];
      each(sessions, value => {
        if (model.kernel.id === value.kernel.id) {
          count++;
        }
      });
      if (count === 1) {
        // Try to delete the session, but succeed either way.
        return this.shutdown(model.id).catch(() => { /* no-op */ });
      }
    }
    return Promise.resolve(void 0);
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
        let model: Contents.IModel = {
          type: type,
          format,
          name,
          content: Private.getContent(reader)
        };

        this._manager.contents.save(path, model).then(contents => {
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
      writable: contents.writable,
      created: contents.created,
      last_modified: contents.last_modified,
      mimetype: contents.mimetype,
      format: contents.format
    };
    this._items = contents.content;
    this._paths.clear();
    each(contents.content, (model: Contents.IModel) => {
      this._paths.add(model.path);
    });
  }

  /**
   * Handle a change to the running sessions.
   */
  private _onRunningChanged(sender: Session.IManager, models: IterableOrArrayLike<Session.IModel>): void {
    this._sessions.length = 0;
    each(models, model => {
      if (this._paths.has(model.notebook.path)) {
        this._sessions.push(model);
      }
    });
    this._refreshed.emit(void 0);
  }

  /**
   * Handle a change on the contents manager.
   */
  private _onFileChanged(sender: Contents.IManager, change: Contents.IChangedArgs): void {
    let path = this._model.path || '.';
    let value = change.oldValue;
    if (value && value.path && PathExt.dirname(value.path) === path) {
      this._fileChanged.emit(change);
      this._scheduleUpdate();
      return;
    }
    value = change.newValue;
    if (value && value.path && PathExt.dirname(value.path) === path) {
      this._fileChanged.emit(change);
      this._scheduleUpdate();
      return;
    }
  }

  /**
   * Handle internal model refresh logic.
   */
  private _scheduleUpdate(): void {
    // Send immediately if there is no pending action, otherwise defer.
    if (this._blackoutId !== -1) {
      this._requested = true;
      return;
    }
    this._timeoutId = window.setTimeout(() => {
      this.refresh();
      if (this._requested && this._blackoutId !== -1) {
        this._requested = false;
        clearTimeout(this._blackoutId);
        this._blackoutId = -1;
        this._timeoutId = window.setTimeout(() => {
          this._scheduleUpdate();
        }, MIN_REFRESH);
      } else {
        this._blackoutId = window.setTimeout(() => {
          this._blackoutId = -1;
          if (this._requested) {
            this._scheduleUpdate();
          }
        }, MIN_REFRESH);
      }
    }, 0);
  }

  private _maxUploadSizeMb = 15;
  private _manager: ServiceManager.IManager = null;
  private _sessions: Session.IModel[] = [];
  private _items: Contents.IModel[] = [];
  private _paths = new Set<string>();
  private _model: Contents.IModel;
  private _pendingPath: string = null;
  private _pending: Promise<void> = null;
  private _timeoutId = -1;
  private _refreshId = -1;
  private _blackoutId = -1;
  private _requested = false;
  private _pathChanged = new Signal<this, IChangedArgs<string>>(this);
  private _refreshed = new Signal<this, void>(this);
  private _sessionsChanged = new Signal<this, void>(this);
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
  private _connectionFailure = new Signal<this, Error>(this);
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
     * A service manager instance.
     */
    manager: ServiceManager.IManager;
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
  function normalizePath(root: string, path: string): string {
    return PathExt.resolve(root, path);
  }
}
