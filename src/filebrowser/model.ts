// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IContents, IKernel, IServiceManager, ISession
} from 'jupyter-js-services';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  deepEqual
} from '../notebook/common/json';


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
    this._manager = options.manager;
    this._model = { path: '', name: '/', type: 'directory', content: [] };
    this.cd();
    this._manager.sessions.runningChanged.connect(this._onRunningChanged, this);
  }

  /**
   * A signal emitted when the path changes.
   */
  get pathChanged(): ISignal<FileBrowserModel, IChangedArgs<string>> {
    return Private.pathChangedSignal.bind(this);
  }

  /**
   * Get the refreshed signal.
   */
  get refreshed(): ISignal<FileBrowserModel, void> {
    return Private.refreshedSignal.bind(this);
  }

  /**
   * Get the file path changed signal.
   */
  get fileChanged(): ISignal<FileBrowserModel, IChangedArgs<string>> {
    return Private.fileChangedSignal.bind(this);
  }

  /**
   * Get the current path.
   *
   * #### Notes
   * This is a read-only property.
   */
  get path(): string {
    return this._model.path;
  }

  /**
   * Get a read-only list of the items in the current path.
   */
  get items(): IContents.IModel[] {
    return this._model.content ? this._model.content.slice() : [];
  }

  /**
   * Get whether the view model is disposed.
   */
  get isDisposed(): boolean {
    return this._model === null;
  }

  /**
   * Get the session models for active notebooks.
   *
   * #### Notes
   * This is a read-only property.
   */
  get sessions(): ISession.IModel[] {
    return this._sessions.slice();
  }

  /**
   * Get the kernel specs.
   */
  get kernelspecs(): IKernel.ISpecModels {
    return this._manager.kernelspecs;
  }

  /**
   * Dispose of the resources held by the view model.
   */
  dispose(): void {
    this._model = null;
    this._manager = null;
    clearSignalData(this);
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
      return Promise.resolve(void 0);
    }
    let oldValue = this.path;
    let options = { content: true };
    this._pendingPath = newValue;
    if (newValue === '.') {
      newValue = this.path;
    }
    if (oldValue !== newValue) {
      this._sessions = [];
    }
    this._pending = this._manager.contents.get(newValue, options).then(contents => {
      this._model = contents;
      return this._manager.sessions.listRunning();
    }).then(models => {
      this._onRunningChanged(this._manager.sessions, models);
      if (oldValue !== newValue) {
        this.pathChanged.emit({
          name: 'path',
          oldValue,
          newValue
        });
      }
      this.refreshed.emit(void 0);
      this._pendingPath = null;
    });
    return this._pending;
  }

  /**
   * Refresh the current directory.
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
  copy(fromFile: string, toDir: string): Promise<IContents.IModel> {
    let normalizePath = Private.normalizePath;
    fromFile = normalizePath(this._model.path, fromFile);
    toDir = normalizePath(this._model.path, toDir);
    return this._manager.contents.copy(fromFile, toDir).then(contents => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: void 0,
        newValue: contents.path
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
        oldValue: path,
        newValue: void 0
      });
    });
  }

  /**
   * Download a file.
   *
   * @param - path - The path of the file to be downloaded.
   *
   * @returns - A promise which resolves to the file contents.
   */
  download(path: string): Promise<IContents.IModel> {
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    return this._manager.contents.get(path, {}).then(contents => {
      let element = document.createElement('a');
      element.setAttribute('href', 'data:text/text;charset=utf-8,' +      encodeURI(contents.content));
      element.setAttribute('download', contents.name);
      element.click();
      return contents;
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
  newUntitled(options: IContents.ICreateOptions): Promise<IContents.IModel> {
    if (options.type === 'file') {
      options.ext = options.ext || '.txt';
    }
    options.path = options.path || this._model.path;
    return this._manager.contents.newUntitled(options).then(contents => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: void 0,
        newValue: contents.path
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
  rename(path: string, newPath: string): Promise<IContents.IModel> {
    // Handle relative paths.
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    newPath = normalizePath(this._model.path, newPath);
    return this._manager.contents.rename(path, newPath).then(contents => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: path,
        newValue: newPath
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
  upload(file: File, overwrite?: boolean): Promise<IContents.IModel> {
    // Skip large files with a warning.
    if (file.size > this._maxUploadSizeMb * 1024 * 1024) {
      let msg = `Cannot upload file (>${this._maxUploadSizeMb} MB) `;
      msg += `"${file.name}"`;
      console.warn(msg);
      return Promise.reject<IContents.IModel>(new Error(msg));
    }

    if (overwrite) {
      return this._upload(file);
    }

    let path = this._model.path;
    path = path ? path + '/' + file.name : file.name;
    return this._manager.contents.get(path, {}).then(() => {
      return Private.typedThrow<IContents.IModel>(`"${file.name}" already exists`);
    }, () => {
      return this._upload(file);
    });
  }

  /**
   * Shut down a session by session id.
   */
  shutdown(id: string): Promise<void> {
    return this._manager.sessions.shutdown(id);
  }

  /**
   * Perform the actual upload.
   */
  private _upload(file: File): Promise<IContents.IModel> {
    // Gather the file model parameters.
    let path = this._model.path;
    path = path ? path + '/' + file.name : file.name;
    let name = file.name;
    let isNotebook = file.name.indexOf('.ipynb') !== -1;
    let type: IContents.FileType = isNotebook ? 'notebook' : 'file';
    let format: IContents.FileFormat = isNotebook ? 'json' : 'base64';

    // Get the file content.
    let reader = new FileReader();
    if (isNotebook) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    return new Promise<IContents.IModel>((resolve, reject) => {
      reader.onload = (event: Event) => {
        let model: IContents.IModel = {
          type: type,
          format,
          name,
          content: Private.getContent(reader)
        };
        this._manager.contents.save(path, model).then(contents => {
          this.fileChanged.emit({
            name: 'file',
            oldValue: void 0,
            newValue: contents.path
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
   * Handle a change to the running sessions.
   */
  private _onRunningChanged(sender: ISession.IManager, models: ISession.IModel[]): void {
    if (deepEqual(models, this._sessions)) {
      return;
    }
    this._sessions = [];
    if (!models.length) {
      this.refreshed.emit(void 0);
      return;
    }
    let paths = this._model.content.map((contents: IContents.IModel) => {
      return contents.path;
    });
    for (let model of models) {
      let index = paths.indexOf(model.notebook.path);
      if (index !== -1) {
        this._sessions.push(model);
      }
    }
    this.refreshed.emit(void 0);
  }

  private _maxUploadSizeMb = 15;
  private _manager: IServiceManager = null;
  private _sessions: ISession.IModel[] = [];
  private _model: IContents.IModel;
  private _pendingPath: string = null;
  private _pending: Promise<void> = null;
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
    manager: IServiceManager;
  }
}


/**
 * The namespace for the file browser model private data.
 */
namespace Private {
  /**
   * A signal emitted when a model refresh occurs.
   */
  export
  const refreshedSignal = new Signal<FileBrowserModel, void>();

  /**
   * A signal emitted when the a file changes path.
   */
  export
  const fileChangedSignal = new Signal<FileBrowserModel, IChangedArgs<string>>();

  /**
   * A signal emitted when the path changes.
   */
  export
  const pathChangedSignal = new Signal<FileBrowserModel, IChangedArgs<string>> ();

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
    // Current directory
    if (path === '.') {
      return root;
    }
    // Root path.
    if (path.indexOf('/') === 0) {
      path = path.slice(1, path.length);
      root = '';
    // Current directory.
    } else if (path.indexOf('./') === 0) {
      path = path.slice(2, path.length);
    // Grandparent directory.
    } else if (path.indexOf('../../') === 0) {
      let parts = root.split('/');
      root = parts.splice(0, parts.length - 2).join('/');
      path = path.slice(6, path.length);
    // Parent directory.
    } else if (path.indexOf('../') === 0) {
      let parts = root.split('/');
      root = parts.splice(0, parts.length - 1).join('/');
      path = path.slice(3, path.length);
    } else {
      // Current directory.
    }
    if (path[path.length - 1] === '/') {
      path = path.slice(0, path.length - 1);
    }
    // Combine the root and the path if necessary.
    if (root && path) {
      path = root + '/' + path;
    } else if (root) {
      path = root;
    }
    return path;
  }

  /**
   * Work around TS 1.8 type inferencing in promises which only throw.
   */
  export
  function typedThrow<T>(msg: string): T {
    throw new Error(msg);
  }
}
