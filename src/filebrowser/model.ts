// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents, ContentsManager, Kernel, ServiceManager, Session
} from '@jupyterlab/services';

import {
  IIterator, each
} from 'phosphor/lib/algorithm/iteration';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  IPathTracker
} from './tracker';


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
    this.cd();
    this._manager.sessions.runningChanged.connect(this._onRunningChanged, this);
  }

  /**
   * A signal emitted when the path changes.
   */
  pathChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Get the refreshed signal.
   */
  refreshed: ISignal<this, void>;

  /**
   * Get the file path changed signal.
   */
  fileChanged: ISignal<this, IChangedArgs<Contents.IModel>>;

  /**
   * Get the current path.
   */
  get path(): string {
    return this._model ? this._model.path : '';
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._model === null;
  }

  /**
   * Get the kernel specs.
   */
  get kernelspecs(): Kernel.ISpecModels {
    return this._manager.kernelspecs;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._sessions.clear();
    this._items.clear();
    this._manager = null;
    clearSignalData(this);
  }

  /**
   * Create an iterator over the model's items.
   *
   * @returns A new iterator over the model's items.
   */
  items(): IIterator<Contents.IModel> {
    return this._items.iter();
  }

  /**
   * Create an iterator over the active sessions in the directory.
   *
   * @returns A new iterator over the model's active sessions.
   */
  sessions(): IIterator<Session.IModel> {
    return this._sessions.iter();
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
    }
    // Collapse requests to the same directory.
    if (newValue === this._pendingPath) {
      return this._pending;
    }
    let oldValue = this.path;
    let options: Contents.IFetchOptions = { content: true };
    this._pendingPath = newValue;
    if (newValue === '.') {
      newValue = this.path;
    }
    if (oldValue !== newValue) {
      this._sessions.clear();
    }
    let manager = this._manager;
    this._pending = manager.contents.get(newValue, options).then(contents => {
      this._handleContents(contents);
      this._pendingPath = null;
      return manager.sessions.listRunning();
    }).then(models => {
      if (this.isDisposed) {
        return;
      }
      this._onRunningChanged(manager.sessions, models);
      if (oldValue !== newValue) {
        this.pathChanged.emit({
          name: 'path',
          oldValue,
          newValue
        });
      }
      this.refreshed.emit(void 0);
    });
    return this._pending;
  }

  /**
   * Refresh the current directory.
   *
   * @returns A promise that resolves when the action is complete.
   */
  refresh(): Promise<void> {
    return this.cd('.').catch(error => {
      console.error(error);
      let msg = 'Unable to refresh the directory listing due to ';
      msg += 'lost server connection.';
      error.message = msg;
      throw error;
    });
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
    return this._manager.contents.copy(fromFile, toDir).then(contents => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: void 0,
        newValue: contents
      });
      return contents;
    });
  }

  /**
   * Delete a file.
   *
   * @param: path - The path to the file to be deleted.
   *
   * @returns A promise which resolves when the file is deleted.
   */
  deleteFile(path: string): Promise<void> {
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    return this._manager.contents.delete(path).then(() => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: { path: path },
        newValue: void 0
      });
    });
  }

  /**
   * Download a file.
   *
   * @param - path - The path of the file to be downloaded.
   */
  download(path: string): void {
    let url = this._manager.contents.getDownloadUrl(path);
    let element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', '');
    element.click();
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

    let promise = this._manager.contents.newUntitled(options);
    return promise.then((contents: Contents.IModel) => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: void 0,
        newValue: contents
      });
      return contents;
    });
  }

  /**
   * Rename a file or directory.
   *
   * @param path - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @returns A promise containing the new file contents model.
   */
  rename(path: string, newPath: string): Promise<Contents.IModel> {
    // Handle relative paths.
    path = Private.normalizePath(this._model.path, path);
    newPath = Private.normalizePath(this._model.path, newPath);

    let promise = this._manager.contents.rename(path, newPath);
    return promise.then((contents: Contents.IModel) => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: {type: contents.type , path: path},
        newValue: contents
      });
      return contents;
    });
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

        let promise = this._manager.contents.save(path, model);
        promise.then((contents: Contents.IModel) => {
          this.fileChanged.emit({
            name: 'file',
            oldValue: void 0,
            newValue: contents
          });
          resolve(contents);
        });
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
    this._items.clear();
    this._paths.clear();
    each(contents.content, (model: Contents.IModel) => {
      this._paths.add(model.path);
    });
    this._items = new Vector<Contents.IModel>(contents.content);
  }

  /**
   * Handle a change to the running sessions.
   */
  private _onRunningChanged(sender: Session.IManager, models: Session.IModel[]): void {
    this._sessions.clear();
    each(models, model => {
      if (this._paths.has(model.notebook.path)) {
        this._sessions.pushBack(model);
      }
    });
    this.refreshed.emit(void 0);
  }

  private _maxUploadSizeMb = 15;
  private _manager: ServiceManager.IManager = null;
  private _sessions = new Vector<Session.IModel>();
  private _items = new Vector<Contents.IModel>();
  private _paths = new Set<string>();
  private _model: Contents.IModel;
  private _pendingPath: string = null;
  private _pending: Promise<void> = null;
}


// Define the signals for the `FileBrowserModel` class.
defineSignal(FileBrowserModel.prototype, 'pathChanged');
defineSignal(FileBrowserModel.prototype, 'refreshed');
defineSignal(FileBrowserModel.prototype, 'fileChanged');

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
    return ContentsManager.getAbsolutePath(path, root);
  }
}
