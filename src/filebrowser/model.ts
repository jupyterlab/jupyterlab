// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsManager, IContentsModel, IContentsOpts, INotebookSessionManager,
  INotebookSession, ISessionId, KernelStatus, getKernelSpecs, IKernelSpecId
} from 'jupyter-js-services';

import * as arrays
  from 'phosphor-arrays';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import * as utils
  from './utils';


/**
 * An implementation of a file browser view model.
 *
 * #### Notes
 * All paths parameters without a leading `'/'` are interpreted as relative to
 * the current directory.  Supports `'../'` syntax.
 */
export
class FileBrowserModel implements IDisposable {
  /**
   * Construct a new file browser view model.
   */
  constructor(contentsManager: IContentsManager, sessionManager: INotebookSessionManager) {
    this._contentsManager = contentsManager;
    this._sessionManager = sessionManager;
    this._model = { path: '', name: '/', type: 'directory', content: [] };
    this._getKernelSpecs();
    this.cd();
  }

  /**
   * Get the refreshed signal.
   */
  get refreshed(): ISignal<FileBrowserModel, void> {
    return Private.refreshedSignal.bind(this);
  }

  /**
   * Get the file open requested signal.
   */
  get openRequested(): ISignal<FileBrowserModel, IContentsModel> {
    return Private.openRequestedSignal.bind(this);
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
   * Get the selection changed signal.
   */
  get selectionChanged(): ISignal<FileBrowserModel, void> {
    return Private.selectionChangedSignal.bind(this);
  }

  /**
   * Get whether the view model is disposed.
   */
  get isDisposed(): boolean {
    return this._model === null;
  }

  /**
   * Get the session ids for active notebooks.
   *
   * #### Notes
   * This is a read-only property.
   */
  get sessionIds(): ISessionId[] {
    return this._sessionIds.slice();
  }

  /**
   * Get a the list of available kernel specs.
   *
   * #### Notes
   * This is a read-only property.
   */
  get kernelSpecs(): IKernelSpecId[] {
    return this._kernelSpecs.slice();
  }

  /**
   * Get whether the items are sorted in ascending order.
   */
  get sortAscending(): boolean {
    return this._ascending;
  }

  /**
   * Set whether the items are sorted in ascending order.
   */
  set sortAscending(value: boolean) {
    this._ascending = value;
    this._sort();
  }

  /**
   * Get which key the items are sorted on.
   */
  get sortKey(): string {
    return this._sortKey;
  }

  /**
   * Set which key the items are sorted on.
   */
  set sortKey(value: string) {
    this._sortKey = value;
    this._sort();
  }

  /**
   * Get the sorted list of items.
   *
   * #### Notes
   * This is a read-only property and should be treated as immutable.
   */
  get sortedItems(): IContentsModel[] {
    return this._model.content;
  }

  /**
   * Select an item by name.
   *
   * #### Notes
   * This is a no-op if the name is not valid or already selected.
   */
  select(name: string): void {
    if (!this._selection[name]) {
      this._selection[name] = true;
      this.selectionChanged.emit(void 0);
    }
  }

  /**
   * De-select an item by name.
   *
   * #### Notes
   * This is a no-op if the name is not valid or not selected.
   */
  deselect(name: string): void {
    if (this._selection[name]) {
      delete this._selection[name];
      this.selectionChanged.emit(void 0);
    }
  }

  /**
   * Check whether an item is selected.
   *
   * #### Notes
   * Returns `true` for a valid name that is selected, `false` otherwise.
   */
  isSelected(name: string): boolean {
    return !!this._selection[name];
  }

  /**
   * Get the list of selected names.
   */
  getSelected(): string[] {
    return Object.keys(this._selection);
  }

  /**
   * Clear the selected items.
   */
  clearSelected(): void {
    this._selection = Object.create(null);
    this.selectionChanged.emit(void 0);
  }

  /**
   * Dispose of the resources held by the view model.
   */
  dispose(): void {
    this._model = null;
    this._contentsManager = null;
    this._selection = null;
    clearSignalData(this);
  }

  /**
   * Change directory.
   *
   * @param path - The path to the file or directory.
   *
   * @returns A promise with the contents of the directory.
   */
  cd(path = ''): Promise<void> {
    if (path !== '') {
      path = Private.normalizePath(this._model.path, path);
    }
    let changed = false;
    let previous = this._selection;
    if (path !== this.path) {
      previous = Object.create(null);
    }
    let selection = Object.create(null);
    return this._contentsManager.get(path, {}).then(contents => {
      this._model = contents;
      let content = contents.content as IContentsModel[];
      let names = content.map((value, index) => value.name);
      for (let name of names) {
        if (previous[name]) {
          selection[name] = true;
        }
      }
      this._unsortedNames = content.map((value, index) => value.name);
      if (this._sortKey !== 'name' || !this._ascending) this._sort();
      return this._findSessions();
    }).then(() => {
      this.selectionChanged.emit(void 0);
      this.refreshed.emit(void 0);
    });
  }

  /**
   * Refresh the current directory.
   */
  refresh(): Promise<void> {
    // Refresh the list of kernelspecs and our directory listing.
    this._getKernelSpecs();
    return this.cd('.');
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
  copy(fromFile: string, toDir: string): Promise<IContentsModel> {
    let normalizePath = Private.normalizePath;
    fromFile = normalizePath(this._model.path, fromFile);
    toDir = normalizePath(this._model.path, toDir);
    return this._contentsManager.copy(fromFile, toDir);
  }

  /**
   * Delete a file.
   *
   * @param: path - The path to the file to be deleted.
   *
   * @returns A promise which resolves when the file is deleted.
   */
  delete(path: string): Promise<void> {
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    return this._contentsManager.delete(path).then(() => {
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
  download(path: string): Promise<IContentsModel> {
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    return this._contentsManager.get(path, {}).then(contents => {
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
  newUntitled(type: string, ext?: string): Promise<IContentsModel> {
    if (type === 'file') {
      ext = ext || '.txt';
    } else {
      ext = '';
    }
    return this._contentsManager.newUntitled(this._model.path,
      { type: type, ext: ext }
    );
  }

  /**
   * Open a file in the current by name.
   */
  open(name: string): Promise<void> {
    let item = arrays.find(this.sortedItems, value => value.name === name);
    if (!item) {
      return Promise.reject(new Error(`No file named: '${name}'`));
    }
    if (item.type === 'directory') {
      return this.cd(name);
    } else {
      this.openRequested.emit(item);
      return Promise.resolve(void 0);
    }
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
  rename(path: string, newPath: string): Promise<IContentsModel> {
    // Handle relative paths.
    let normalizePath = Private.normalizePath;
    path = normalizePath(this._model.path, path);
    newPath = normalizePath(this._model.path, newPath);
    return this._contentsManager.rename(path, newPath).then(contents => {
      this.fileChanged.emit({
        name: 'file',
        oldValue: path,
        newValue: newPath
      });
      return contents;
    })
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
  upload(file: File, overwrite?: boolean): Promise<IContentsModel> {
    // Skip large files with a warning.
    if (file.size > this._max_upload_size_mb * 1024 * 1024) {
      let msg = `Cannot upload file (>${this._max_upload_size_mb} MB) `;
      msg += `"${file.name}"`
      console.warn(msg);
      return Promise.reject(new Error(msg));
    }

    if (overwrite) {
      return this._upload(file);
    }

    return this._contentsManager.get(file.name, {}).then(() => {
      return Private.typedThrow<IContentsModel>(`"${file.name}" already exists`);
    }, () => {
      return this._upload(file);
    });
  }

  /**
   * Shut down a notebook session by session id.
   */
  shutdown(sessionId: ISessionId): Promise<void> {
    return this._sessionManager.connectTo(sessionId.id).then(session => {
      return session.shutdown();
    });
  }

  /**
   * Start a new session on a notebook.
   */
  startSession(path: string, kernel: string): Promise<INotebookSession> {
    return this._sessionManager.startNew({
      notebookPath: path,
      kernelName: kernel
    });
  }

  /**
   * Sort the model items.
   */
  private _sort(): void {
    if (!this._unsortedNames) {
      return;
    }
    let items = this._model.content.slice() as IContentsModel[];
    if (this._sortKey === 'name') {
      items.sort((a, b) => {
        let indexA = this._unsortedNames.indexOf(a.name);
        let indexB = this._unsortedNames.indexOf(b.name);
        return indexA - indexB;
      });
    } else if (this._sortKey === 'last_modified') {
      items.sort((a, b) => {
        let valA = new Date(a.last_modified).getTime();
        let valB = new Date(b.last_modified).getTime();
        return valB - valA;
      });
    }

    // Reverse the order if descending.
    if (!this._ascending) {
      items.reverse();
    }
    this._model.content = items;
  }

  /**
   * Perform the actual upload.
   */
  private _upload(file: File): Promise<IContentsModel> {
    // Gather the file model parameters.
    let path = this._model.path
    path = path ? path + '/' + file.name : file.name;
    let name = file.name;
    let isNotebook = file.name.indexOf('.ipynb') !== -1;
    let type = isNotebook ? 'notebook' : 'file';
    let format = isNotebook ? 'json' : 'base64';

    // Get the file content.
    let reader = new FileReader();
    if (isNotebook) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    return new Promise<IContentsModel>((resolve, reject) => {
      reader.onload = (event: Event) => {
        let model: IContentsOpts = {
          type: type,
          format: format,
          name: name,
          content: Private.getContent(reader)
        }
        resolve(this._contentsManager.save(path, model));
      }

      reader.onerror = (event: Event) => {
        reject(Error(`Failed to upload "${file.name}":` + event));
      }
    });

  }

  /**
   * Get the notebook sessions for the current directory.
   */
  private _findSessions(): Promise<void> {
    this._sessionIds = [];
    let notebooks = this._model.content.filter((content: IContentsModel) => { return content.type === 'notebook'; });
    if (!notebooks.length) {
      return Promise.resolve(void 0);
    }

    return this._sessionManager.listRunning().then(sessionIds => {
      if (!sessionIds.length) {
        return;
      }
      let promises: Promise<void>[] = [];
      let paths = notebooks.map((notebook: IContentsModel) => {
        return notebook.path;
      });
      for (var sessionId of sessionIds) {
        let index = paths.indexOf(sessionId.notebook.path);
        if (index !== -1) {
          promises.push(this._sessionManager.connectTo(sessionId.id).then(session => {
            if (session.status === KernelStatus.Idle || session.status === KernelStatus.Idle) {
              this._sessionIds.push(sessionId);
              return void 0;
            }
          }));
        }
      }
      return Promise.all(promises).then(() => {});
    });
  }

  /**
   * Load the list of kernel specs.
   */
  private _getKernelSpecs(): void {
    this._sessionManager.getSpecs().then(specs => {
      let kernelSpecs: IKernelSpecId[] = [];
      for (let key in specs.kernelspecs) {
        kernelSpecs.push(specs.kernelspecs[key]);
      }
      kernelSpecs.sort((a, b) => {
        return a.spec.display_name.localeCompare(b.spec.display_name);
      });
      this._kernelSpecs = kernelSpecs;
    }, error => console.error(error));
  }

  private _max_upload_size_mb = 15;
  private _contentsManager: IContentsManager = null;
  private _sessionIds: ISessionId[] = [];
  private _sessionManager: INotebookSessionManager = null;
  private _model: IContentsModel;
  private _kernelSpecs: IKernelSpecId[] = [];
  private _selection: { [key: string]: boolean; } = Object.create(null);
  private _sortKey = 'name';
  private _ascending = true;
  private _unsortedNames: string[] = [];
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
   * A signal emitted when a file open is requested.
   */
  export
  const openRequestedSignal = new Signal<FileBrowserModel, IContentsModel>();

  /**
   * A signal emitted when the a file changes path.
   */
  export
  const fileChangedSignal = new Signal<FileBrowserModel, IChangedArgs<string>>();

  /**
   * A signal emitted when the selection changes.
   */
  export
  const selectionChangedSignal = new Signal<FileBrowserModel, void>();

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
      root = ''
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
