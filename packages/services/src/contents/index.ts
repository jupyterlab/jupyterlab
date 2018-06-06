// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  URLExt, PathExt
} from '@jupyterlab/coreutils';

import {
  ModelDB
} from '@jupyterlab/observables';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  each
} from '@phosphor/algorithm';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  ServerConnection
} from '..';

import * as validate
  from './validate';


/**
 * The url for the default drive service.
 */
const SERVICE_DRIVE_URL = 'api/contents';

/**
 * The url for the file access.
 */
const FILES_URL = 'files';


/**
 * A namespace for contents interfaces.
 */
export
namespace Contents {
  /**
   * A contents model.
   */
  export
  interface IModel {
    /**
     * Name of the contents file.
     *
     * #### Notes
     *  Equivalent to the last part of the `path` field.
     */
    readonly name: string;

    /**
     * The full file path.
     *
     * #### Notes
     * It will *not* start with `/`, and it will be `/`-delimited.
     */
    readonly path: string;

    /**
     * The type of file.
     */
    readonly type: ContentType;

    /**
     * Whether the requester has permission to edit the file.
     */
    readonly writable: boolean;

    /**
     * File creation timestamp.
     */
    readonly created: string;

    /**
     * Last modified timestamp.
     */
    readonly last_modified: string;

    /**
     * Specify the mime-type of file contents.
     *
     * #### Notes
     * Only non-`null` when `content` is present and `type` is `"file"`.
     */
    readonly mimetype: string;

    /**
     * The optional file content.
     */
    readonly content: any;

    /**
     * The chunk of the file upload.
     */
    readonly chunk?: number;

    /**
     * The format of the file `content`.
     *
     * #### Notes
     * Only relevant for type: 'file'
     */
    readonly format: FileFormat;
  }

  /**
   * Validates an IModel, thowing an error if it does not pass.
   */
  export
  function validateContentsModel(contents: IModel): void {
    validate.validateContentsModel(contents);
  }

  /**
   * A contents file type.
   */
  export
  type ContentType = 'notebook' | 'file' | 'directory';


  /**
   * A contents file format.
   */
  export
  type FileFormat = 'json' | 'text' | 'base64';

  /**
   * The options used to fetch a file.
   */
  export
  interface IFetchOptions {
    /**
     * The override file type for the request.
     */
    type?: ContentType;

    /**
     * The override file format for the request.
     */
    format?: FileFormat;

    /**
     * Whether to include the file content.
     *
     * The default is `true`.
     */
    content?: boolean;
  }

  /**
   * The options used to create a file.
   */
  export
  interface ICreateOptions {
    /**
     * The directory in which to create the file.
     */
     path?: string;

     /**
      * The optional file extension for the new file (e.g. `".txt"`).
      *
      * #### Notes
      * This ignored if `type` is `'notebook'`.
      */
    ext?: string;

    /**
     * The file type.
     */
    type?: ContentType;
  }

  /**
   * Checkpoint model.
   */
  export
  interface ICheckpointModel {
    /**
     * The unique identifier for the checkpoint.
     */
    readonly id: string;

    /**
     * Last modified timestamp.
     */
    readonly last_modified: string;
  }

  /**
   * Validates an ICheckpointModel, thowing an error if it does not pass.
   */
  export
  function validateCheckpointModel(checkpoint: ICheckpointModel): void {
    validate.validateCheckpointModel(checkpoint);
  }

  /**
   * The change args for a file change.
   */
  export
  interface IChangedArgs {
    /**
     * The type of change.
     */
    type: 'new' | 'delete' | 'rename' | 'save';

    /**
     * The new contents.
     */
    oldValue: Partial<IModel> | null;

    /**
     * The old contents.
     */
    newValue: Partial<IModel> | null;
  }

  /**
   * The interface for a contents manager.
   */
  export
  interface IManager extends IDisposable {
    /**
     * A signal emitted when a file operation takes place.
     */
    readonly fileChanged: ISignal<IManager, IChangedArgs>;

    /**
     * The server settings associated with the manager.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * Add an `IDrive` to the manager.
     */
    addDrive(drive: IDrive): void;

    /**
     * Given a path of the form `drive:local/portion/of/it.txt`
     * get the local part of it.
     *
     * @param path: the path.
     *
     * @returns The local part of the path.
     */
    localPath(path: string): string;

    /**
     * Given a path of the form `drive:local/portion/of/it.txt`
     * get the name of the drive. If the path is missing
     * a drive portion, returns an empty string.
     *
     * @param path: the path.
     *
     * @returns The drive name for the path, or the empty string.
     */
    driveName(path: string): string;

    /**
     * Given a path, get a ModelDB.IFactory from the
     * relevant backend. Returns `null` if the backend
     * does not provide one.
     */
    getModelDBFactory(path: string): ModelDB.IFactory | null;

    /**
     * Get a file or directory.
     *
     * @param path: The path to the file.
     *
     * @param options: The options used to fetch the file.
     *
     * @returns A promise which resolves with the file content.
     */
    get(path: string, options?: IFetchOptions): Promise<IModel>;

    /**
     * Get an encoded download url given a file path.
     *
     * @param A promise which resolves with the absolute POSIX
     *   file path on the server.
     */
    getDownloadUrl(path: string): Promise<string>;

    /**
     * Create a new untitled file or directory in the specified directory path.
     *
     * @param options: The options used to create the file.
     *
     * @returns A promise which resolves with the created file content when the
     *    file is created.
     */
    newUntitled(options?: ICreateOptions): Promise<IModel>;

    /**
     * Delete a file.
     *
     * @param path - The path to the file.
     *
     * @returns A promise which resolves when the file is deleted.
     */
    delete(path: string): Promise<void>;

    /**
     * Rename a file or directory.
     *
     * @param path - The original file path.
     *
     * @param newPath - The new file path.
     *
     * @returns A promise which resolves with the new file content model when the
     *   file is renamed.
     */
    rename(path: string, newPath: string): Promise<IModel>;

    /**
     * Save a file.
     *
     * @param path - The desired file path.
     *
     * @param options - Optional overrrides to the model.
     *
     * @returns A promise which resolves with the file content model when the
     *   file is saved.
     */
    save(path: string, options?: Partial<IModel>): Promise<IModel>;

    /**
     * Copy a file into a given directory.
     *
     * @param path - The original file path.
     *
     * @param toDir - The destination directory path.
     *
     * @returns A promise which resolves with the new content model when the
     *  file is copied.
     */
    copy(path: string, toDir: string): Promise<IModel>;

    /**
     * Create a checkpoint for a file.
     *
     * @param path - The path of the file.
     *
     * @returns A promise which resolves with the new checkpoint model when the
     *   checkpoint is created.
     */
    createCheckpoint(path: string): Promise<ICheckpointModel>;

    /**
     * List available checkpoints for a file.
     *
     * @param path - The path of the file.
     *
     * @returns A promise which resolves with a list of checkpoint models for
     *    the file.
     */
    listCheckpoints(path: string): Promise<ICheckpointModel[]>;

    /**
     * Restore a file to a known checkpoint state.
     *
     * @param path - The path of the file.
     *
     * @param checkpointID - The id of the checkpoint to restore.
     *
     * @returns A promise which resolves when the checkpoint is restored.
     */
    restoreCheckpoint(path: string, checkpointID: string): Promise<void>;

    /**
     * Delete a checkpoint for a file.
     *
     * @param path - The path of the file.
     *
     * @param checkpointID - The id of the checkpoint to delete.
     *
     * @returns A promise which resolves when the checkpoint is deleted.
     */
    deleteCheckpoint(path: string, checkpointID: string): Promise<void>;
  }

  /**
   * The interface for a network drive that can be mounted
   * in the contents manager.
   */
  export
  interface IDrive extends IDisposable {
    /**
     * The name of the drive, which is used at the leading
     * component of file paths.
     */
    readonly name: string;

    /**
     * The server settings of the manager.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * An optional ModelDB.IFactory instance for the
     * drive.
     */
    readonly modelDBFactory?: ModelDB.IFactory;

    /**
     * A signal emitted when a file operation takes place.
     */
    fileChanged: ISignal<IDrive, IChangedArgs>;

    /**
     * Get a file or directory.
     *
     * @param localPath: The path to the file.
     *
     * @param options: The options used to fetch the file.
     *
     * @returns A promise which resolves with the file content.
     */
    get(localPath: string, options?: IFetchOptions): Promise<IModel>;

    /**
     * Get an encoded download url given a file path.
     *
     * @param A promise which resolves with the absolute POSIX
     *   file path on the server.
     */
    getDownloadUrl(localPath: string): Promise<string>;

    /**
     * Create a new untitled file or directory in the specified directory path.
     *
     * @param options: The options used to create the file.
     *
     * @returns A promise which resolves with the created file content when the
     *    file is created.
     */
    newUntitled(options?: ICreateOptions): Promise<IModel>;

    /**
     * Delete a file.
     *
     * @param localPath - The path to the file.
     *
     * @returns A promise which resolves when the file is deleted.
     */
    delete(localPath: string): Promise<void>;

    /**
     * Rename a file or directory.
     *
     * @param oldLocalPath - The original file path.
     *
     * @param newLocalPath - The new file path.
     *
     * @returns A promise which resolves with the new file content model when the
     *   file is renamed.
     */
    rename(oldLocalPath: string, newLocalPath: string): Promise<IModel>;

    /**
     * Save a file.
     *
     * @param localPath - The desired file path.
     *
     * @param options - Optional overrrides to the model.
     *
     * @returns A promise which resolves with the file content model when the
     *   file is saved.
     */
    save(localPath: string, options?: Partial<IModel>): Promise<IModel>;

    /**
     * Copy a file into a given directory.
     *
     * @param localPath - The original file path.
     *
     * @param toLocalDir - The destination directory path.
     *
     * @returns A promise which resolves with the new content model when the
     *  file is copied.
     */
    copy(localPath: string, toLocalDir: string): Promise<IModel>;

    /**
     * Create a checkpoint for a file.
     *
     * @param localPath - The path of the file.
     *
     * @returns A promise which resolves with the new checkpoint model when the
     *   checkpoint is created.
     */
    createCheckpoint(localPath: string): Promise<ICheckpointModel>;

    /**
     * List available checkpoints for a file.
     *
     * @param localPath - The path of the file.
     *
     * @returns A promise which resolves with a list of checkpoint models for
     *    the file.
     */
    listCheckpoints(localPath: string): Promise<ICheckpointModel[]>;

    /**
     * Restore a file to a known checkpoint state.
     *
     * @param localPath - The path of the file.
     *
     * @param checkpointID - The id of the checkpoint to restore.
     *
     * @returns A promise which resolves when the checkpoint is restored.
     */
    restoreCheckpoint(localPath: string, checkpointID: string): Promise<void>;

    /**
     * Delete a checkpoint for a file.
     *
     * @param localPath - The path of the file.
     *
     * @param checkpointID - The id of the checkpoint to delete.
     *
     * @returns A promise which resolves when the checkpoint is deleted.
     */
    deleteCheckpoint(localPath: string, checkpointID: string): Promise<void>;
  }
}


/**
 * A contents manager that passes file operations to the server.
 * Multiple servers implementing the `IDrive` interface can be
 * attached to the contents manager, so that the same session can
 * perform file operations on multiple backends.
 *
 * This includes checkpointing with the normal file operations.
 */
export
class ContentsManager implements Contents.IManager {
  /**
   * Construct a new contents manager object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(options: ContentsManager.IOptions = {}) {
    let serverSettings = this.serverSettings = (
      options.serverSettings || ServerConnection.makeSettings()
    );
    this._defaultDrive = options.defaultDrive || new Drive({ serverSettings});
    this._defaultDrive.fileChanged.connect(this._onFileChanged, this);
  }

  /**
   * The server settings associated with the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * A signal emitted when a file operation takes place.
   */
  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * Test whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Add an `IDrive` to the manager.
   */
  addDrive(drive: Contents.IDrive): void {
    this._additionalDrives.set(drive.name, drive);
    drive.fileChanged.connect(this._onFileChanged, this);
  }

  /**
   * Given a path, get a ModelDB.IFactory from the
   * relevant backend. Returns `null` if the backend
   * does not provide one.
   */
  getModelDBFactory(path: string): ModelDB.IFactory | null {
    let [drive, ] = this._driveForPath(path);
    return drive && drive.modelDBFactory || null;
  }

  /**
   * Given a path of the form `drive:local/portion/of/it.txt`
   * get the local part of it.
   *
   * @param path: the path.
   *
   * @returns The local part of the path.
   */
  localPath(path: string): string {
    const parts = path.split('/');
    const firstParts = parts[0].split(':');
    if (firstParts.length === 1 || !this._additionalDrives.has(firstParts[0])) {
      return PathExt.removeSlash(path);
    }
    return PathExt.join(firstParts.slice(1).join(':'), ...parts.slice(1));
  }

  /**
   * Given a path of the form `drive:local/portion/of/it.txt`
   * get the name of the drive. If the path is missing
   * a drive portion, returns an empty string.
   *
   * @param path: the path.
   *
   * @returns The drive name for the path, or the empty string.
   */
  driveName(path: string): string {
    const parts = path.split('/');
    const firstParts = parts[0].split(':');
    if (firstParts.length === 1) {
      return '';
    }
    if (this._additionalDrives.has(firstParts[0])) {
      return firstParts[0];
    }
    return '';
  }

  /**
   * Get a file or directory.
   *
   * @param path: The path to the file.
   *
   * @param options: The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   */
  get(path: string, options?: Contents.IFetchOptions): Promise<Contents.IModel> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.get(localPath, options).then(contentsModel => {
      let listing: Contents.IModel[] = [];
      if (contentsModel.type === 'directory' && contentsModel.content) {
        each(contentsModel.content, (item: Contents.IModel) => {
          listing.push({
            ...item,
            path: this._toGlobalPath(drive, item.path)
          } as Contents.IModel);
        });
        return {
          ...contentsModel,
          path: this._toGlobalPath(drive, localPath),
          content: listing
        } as Contents.IModel;
      } else {
        return {
          ...contentsModel,
          path: this._toGlobalPath(drive, localPath)
        } as Contents.IModel;
      }
    });
  }

  /**
   * Get an encoded download url given a file path.
   *
   * @param path - An absolute POSIX file path on the server.
   *
   * #### Notes
   * It is expected that the path contains no relative paths.
   */
  getDownloadUrl(path: string): Promise<string> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.getDownloadUrl(localPath);
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   *
   * @param options: The options used to create the file.
   *
   * @returns A promise which resolves with the created file content when the
   *    file is created.
   */
  newUntitled(options: Contents.ICreateOptions = {}): Promise<Contents.IModel> {
    if (options.path) {
      let globalPath = Private.normalize(options.path);
      let [drive, localPath] = this._driveForPath(globalPath);
      return drive.newUntitled({ ...options, path: localPath }).then( contentsModel => {
        return {
          ...contentsModel,
          path: PathExt.join(globalPath, contentsModel.name)
        } as Contents.IModel;
      });
    } else {
      return this._defaultDrive.newUntitled(options);
    }
  }

  /**
   * Delete a file.
   *
   * @param path - The path to the file.
   *
   * @returns A promise which resolves when the file is deleted.
   */
  delete(path: string): Promise<void> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.delete(localPath);
  }

  /**
   * Rename a file or directory.
   *
   * @param path - The original file path.
   *
   * @param newPath - The new file path.
   *
   * @returns A promise which resolves with the new file contents model when
   *   the file is renamed.
   */
  rename(path: string, newPath: string): Promise<Contents.IModel> {
    let [drive1, path1] = this._driveForPath(path);
    let [drive2, path2] = this._driveForPath(newPath);
    if (drive1 !== drive2) {
      throw Error('ContentsManager: renaming files must occur within a Drive');
    }
    return drive1.rename(path1, path2).then(contentsModel => {
      return {
        ...contentsModel,
        path: this._toGlobalPath(drive1, path2)
      } as Contents.IModel;
    });
  }

  /**
   * Save a file.
   *
   * @param path - The desired file path.
   *
   * @param options - Optional overrides to the model.
   *
   * @returns A promise which resolves with the file content model when the
   *   file is saved.
   *
   * #### Notes
   * Ensure that `model.content` is populated for the file.
   */
  save(path: string, options: Partial<Contents.IModel> = {}): Promise<Contents.IModel> {
    const globalPath = Private.normalize(path);
    const [drive, localPath] = this._driveForPath(path);
    return drive.save(localPath, { ...options, path: localPath }).then(contentsModel => {
      return { ...contentsModel, path: globalPath } as Contents.IModel;
    });
  }

  /**
   * Copy a file into a given directory.
   *
   * @param path - The original file path.
   *
   * @param toDir - The destination directory path.
   *
   * @returns A promise which resolves with the new contents model when the
   *  file is copied.
   *
   * #### Notes
   * The server will select the name of the copied file.
   */
  copy(fromFile: string, toDir: string): Promise<Contents.IModel> {
    let [drive1, path1] = this._driveForPath(fromFile);
    let [drive2, path2] = this._driveForPath(toDir);
    if (drive1 === drive2) {
      return drive1.copy(path1, path2).then(contentsModel => {
        return {
          ...contentsModel,
          path: this._toGlobalPath(drive1, contentsModel.path)
        } as Contents.IModel;
      });
    } else {
      throw Error('Copying files between drives is not currently implemented');
    }
  }

  /**
   * Create a checkpoint for a file.
   *
   * @param path - The path of the file.
   *
   * @returns A promise which resolves with the new checkpoint model when the
   *   checkpoint is created.
   */
  createCheckpoint(path: string): Promise<Contents.ICheckpointModel> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.createCheckpoint(localPath);
  }

  /**
   * List available checkpoints for a file.
   *
   * @param path - The path of the file.
   *
   * @returns A promise which resolves with a list of checkpoint models for
   *    the file.
   */
  listCheckpoints(path: string): Promise<Contents.ICheckpointModel[]> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.listCheckpoints(localPath);
  }

  /**
   * Restore a file to a known checkpoint state.
   *
   * @param path - The path of the file.
   *
   * @param checkpointID - The id of the checkpoint to restore.
   *
   * @returns A promise which resolves when the checkpoint is restored.
   */
  restoreCheckpoint(path: string, checkpointID: string): Promise<void> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.restoreCheckpoint(localPath, checkpointID);
  }

  /**
   * Delete a checkpoint for a file.
   *
   * @param path - The path of the file.
   *
   * @param checkpointID - The id of the checkpoint to delete.
   *
   * @returns A promise which resolves when the checkpoint is deleted.
   */
  deleteCheckpoint(path: string, checkpointID: string): Promise<void> {
    let [drive, localPath] = this._driveForPath(path);
    return drive.deleteCheckpoint(localPath, checkpointID);
  }

  /**
   * Given a drive and a local path, construct a fully qualified
   * path. The inverse of `_driveForPath`.
   *
   * @param drive: an `IDrive`.
   *
   * @param localPath: the local path on the drive.
   *
   * @returns the fully qualified path.
   */
  private _toGlobalPath(drive: Contents.IDrive, localPath: string): string {
    if (drive === this._defaultDrive) {
      return PathExt.removeSlash(localPath);
    } else {
      return `${drive.name}:${PathExt.removeSlash(localPath)}`;
    }
  }

  /**
   * Given a path, get the `IDrive to which it refers,
   * where the path satisfies the pattern
   * `'driveName:path/to/file'`. If there is no `driveName`
   * prepended to the path, it returns the default drive.
   *
   * @param path: a path to a file.
   *
   * @returns A tuple containing an `IDrive` object for the path,
   * and a local path for that drive.
   */
  private _driveForPath(path: string): [Contents.IDrive, string] {
    const driveName = this.driveName(path);
    const localPath = this.localPath(path);
    if (driveName) {
      return [this._additionalDrives.get(driveName), localPath];
    } else {
      return [this._defaultDrive, localPath];
    }
  }

  /**
   * Respond to fileChanged signals from the drives attached to
   * the manager. This prepends the drive name to the path if necessary,
   * and then forwards the signal.
   */
  private _onFileChanged(sender: Contents.IDrive, args: Contents.IChangedArgs) {
    if (sender === this._defaultDrive) {
      this._fileChanged.emit(args);
    } else {
      let newValue: Partial<Contents.IModel> | null = null;
      let oldValue: Partial<Contents.IModel> | null = null;
      if (args.newValue && args.newValue.path) {
        newValue = {
          ...args.newValue,
          path: this._toGlobalPath(sender, args.newValue.path)
        };
      }
      if (args.oldValue && args.oldValue.path) {
        oldValue = {
          ...args.oldValue,
          path: this._toGlobalPath(sender, args.oldValue.path)
        };
      }
      this._fileChanged.emit({
        type: args.type,
        newValue,
        oldValue
      });
    }
  }

  private _isDisposed = false;
  private _additionalDrives = new Map<string, Contents.IDrive>();
  private _defaultDrive: Contents.IDrive;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
}


/**
 * A default implementation for an `IDrive`, talking to the
 * server using the Jupyter REST API.
 */
export
class Drive implements Contents.IDrive {
  /**
   * Construct a new contents manager object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(options: Drive.IOptions = {}) {
    this.name = options.name || 'Default';
    this._apiEndpoint = options.apiEndpoint || SERVICE_DRIVE_URL;
    this.serverSettings = options.serverSettings || ServerConnection.makeSettings();
  }

  /**
   * The name of the drive, which is used at the leading
   * component of file paths.
   */
  readonly name: string;

  /**
   * A signal emitted when a file operation takes place.
   */
  get fileChanged(): ISignal<this, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  /**
   * The server settings of the drive.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the manager has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Get a file or directory.
   *
   * @param localPath: The path to the file.
   *
   * @param options: The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   *
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  get(localPath: string, options?: Contents.IFetchOptions): Promise<Contents.IModel> {
    let url = this._getUrl(localPath);
    if (options) {
      // The notebook type cannot take an format option.
      if (options.type === 'notebook') {
        delete options['format'];
      }
      let content = options.content ? '1' : '0';
      let params: JSONObject = { ...options, content };
      url += URLExt.objectToQueryString(params);
    }

    let settings = this.serverSettings;
    return ServerConnection.makeRequest(url, {}, settings).then(response => {
      if (response.status !== 200) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data  => {
      validate.validateContentsModel(data);
      return data;
    });
  }

  /**
   * Get an encoded download url given a file path.
   *
   * @param localPath - An absolute POSIX file path on the server.
   *
   * #### Notes
   * It is expected that the path contains no relative paths.
   */
  getDownloadUrl(localPath: string): Promise<string> {
    let baseUrl = this.serverSettings.baseUrl;
    return Promise.resolve(URLExt.join(baseUrl, FILES_URL,
                           URLExt.encodeParts(localPath)));
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   *
   * @param options: The options used to create the file.
   *
   * @returns A promise which resolves with the created file content when the
   *    file is created.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  newUntitled(options: Contents.ICreateOptions = {}): Promise<Contents.IModel> {
    let body = '{}';
    if (options) {
      if (options.ext) {
        options.ext = Private.normalizeExtension(options.ext);
      }
      body = JSON.stringify(options);
    }

    let settings = this.serverSettings;
    let url = this._getUrl(options.path || '');
    let init = {
      method: 'POST',
      body
    };
    return ServerConnection.makeRequest(url, init, settings).then(response => {
      if (response.status !== 201) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data => {
      validate.validateContentsModel(data);
      this._fileChanged.emit({
        type: 'new',
        oldValue: null,
        newValue: data
      });
      return data;
    });
  }

  /**
   * Delete a file.
   *
   * @param localPath - The path to the file.
   *
   * @returns A promise which resolves when the file is deleted.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents).
   */
  delete(localPath: string): Promise<void> {
    let url = this._getUrl(localPath);
    let settings = this.serverSettings;
    let init = { method: 'DELETE' };
    return ServerConnection.makeRequest(url, init, settings).then(response => {
      // Translate certain errors to more specific ones.
      // TODO: update IPEP27 to specify errors more precisely, so
      // that error types can be detected here with certainty.
      if (response.status === 400) {
        return response.json().then(data => {
          throw new ServerConnection.ResponseError(response, data['message']);
        });
      }
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }
      this._fileChanged.emit({
        type: 'delete',
        oldValue: { path: localPath },
        newValue: null
      });
    });
  }

  /**
   * Rename a file or directory.
   *
   * @param oldLocalPath - The original file path.
   *
   * @param newLocalPath - The new file path.
   *
   * @returns A promise which resolves with the new file contents model when
   *   the file is renamed.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  rename(oldLocalPath: string, newLocalPath: string): Promise<Contents.IModel> {
    let settings = this.serverSettings;
    let url = this._getUrl(oldLocalPath);
    let init = {
      method: 'PATCH',
      body: JSON.stringify({ path: newLocalPath })
    };
    return ServerConnection.makeRequest(url, init, settings).then(response => {
      if (response.status !== 200) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data => {
      validate.validateContentsModel(data);
      this._fileChanged.emit({
        type: 'rename',
        oldValue: { path: oldLocalPath },
        newValue: data
      });
      return data;
    });
  }

  /**
   * Save a file.
   *
   * @param localPath - The desired file path.
   *
   * @param options - Optional overrides to the model.
   *
   * @returns A promise which resolves with the file content model when the
   *   file is saved.
   *
   * #### Notes
   * Ensure that `model.content` is populated for the file.
   *
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  save(localPath: string, options: Partial<Contents.IModel> = {}): Promise<Contents.IModel> {
    let settings = this.serverSettings;
    let url = this._getUrl(localPath);
    let init = {
      method: 'PUT',
      body: JSON.stringify(options)
    };
    return ServerConnection.makeRequest(url, init, settings).then(response => {
      // will return 200 for an existing file and 201 for a new file
      if (response.status !== 200 && response.status !== 201) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data => {
      validate.validateContentsModel(data);
      this._fileChanged.emit({
        type: 'save',
        oldValue: null,
        newValue: data
      });
      return data;
    });
  }

  /**
   * Copy a file into a given directory.
   *
   * @param localPath - The original file path.
   *
   * @param toDir - The destination directory path.
   *
   * @returns A promise which resolves with the new contents model when the
   *  file is copied.
   *
   * #### Notes
   * The server will select the name of the copied file.
   *
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  copy(fromFile: string, toDir: string): Promise<Contents.IModel> {
    let settings = this.serverSettings;
    let url = this._getUrl(toDir);
    let init = {
      method: 'POST',
      body: JSON.stringify({ copy_from: fromFile })
    };
    return ServerConnection.makeRequest(url, init, settings).then(response => {
      if (response.status !== 201) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data => {
      validate.validateContentsModel(data);
      this._fileChanged.emit({
        type: 'new',
        oldValue: null,
        newValue: data
      });
      return data;
    });
  }

  /**
   * Create a checkpoint for a file.
   *
   * @param localPath - The path of the file.
   *
   * @returns A promise which resolves with the new checkpoint model when the
   *   checkpoint is created.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  createCheckpoint(localPath: string): Promise<Contents.ICheckpointModel> {
    let url = this._getUrl(localPath, 'checkpoints');
    let init = { method: 'POST' };
    return ServerConnection.makeRequest(url, init, this.serverSettings).then(response => {
      if (response.status !== 201) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data => {
      validate.validateCheckpointModel(data);
      return data;
    });
  }

  /**
   * List available checkpoints for a file.
   *
   * @param localPath - The path of the file.
   *
   * @returns A promise which resolves with a list of checkpoint models for
   *    the file.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents) and validates the response model.
   */
  listCheckpoints(localPath: string): Promise<Contents.ICheckpointModel[]> {
    let url = this._getUrl(localPath, 'checkpoints');
    return ServerConnection.makeRequest(url, {}, this.serverSettings).then(response => {
      if (response.status !== 200) {
        throw new ServerConnection.ResponseError(response);
      }
      return response.json();
    }).then(data => {
      if (!Array.isArray(data)) {
        throw new Error('Invalid Checkpoint list');
      }
      for (let i = 0; i < data.length; i++) {
        validate.validateCheckpointModel(data[i]);
      }
      return data;
    });
  }

  /**
   * Restore a file to a known checkpoint state.
   *
   * @param localPath - The path of the file.
   *
   * @param checkpointID - The id of the checkpoint to restore.
   *
   * @returns A promise which resolves when the checkpoint is restored.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents).
   */
  restoreCheckpoint(localPath: string, checkpointID: string): Promise<void> {
    let url = this._getUrl(localPath, 'checkpoints', checkpointID);
    let init = { method: 'POST' };
    return ServerConnection.makeRequest(url, init, this.serverSettings).then(response => {
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }
    });

  }

  /**
   * Delete a checkpoint for a file.
   *
   * @param localPath - The path of the file.
   *
   * @param checkpointID - The id of the checkpoint to delete.
   *
   * @returns A promise which resolves when the checkpoint is deleted.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents).
   */
  deleteCheckpoint(localPath: string, checkpointID: string): Promise<void> {
    let url = this._getUrl(localPath, 'checkpoints', checkpointID);
    let init = { method: 'DELETE' };
    return ServerConnection.makeRequest(url, init, this.serverSettings).then(response => {
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }
    });
  }

  /**
   * Get a REST url for a file given a path.
   */
  private _getUrl(...args: string[]): string {
    let parts = args.map(path => URLExt.encodeParts(path));
    let baseUrl = this.serverSettings.baseUrl;
    return URLExt.join(baseUrl, this._apiEndpoint, ...parts);
  }

  private _apiEndpoint: string;
  private _isDisposed = false;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
}


/**
 * A namespace for ContentsManager statics.
 */
export
namespace ContentsManager {
  /**
   * The options used to intialize a contents manager.
   */
  export
  interface IOptions {
    /**
     * The default drive backend for the contents manager.
     */
    defaultDrive?: Contents.IDrive;

    /**
     * The server settings associated with the manager.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}

/**
 * A namespace for Drive statics.
 */
export
namespace Drive {
  /**
   * The options used to intialize a `Drive`.
   */
  export
  interface IOptions {
    /**
     * The name for the `Drive`, which is used in file
     * paths to disambiguate it from other drives.
     */
    name?: string;

    /**
     * The server settings for the server.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * A REST endpoint for drive requests.
     * If not given, defaults to the Jupyter
     * REST API given by [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/contents).
     */
    apiEndpoint?: string;
  }
}


/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * Normalize a file extension to be of the type `'.foo'`.
   *
   * Adds a leading dot if not present and converts to lower case.
   */
  export
  function normalizeExtension(extension: string): string {
    if (extension.length > 0 && extension.indexOf('.') !== 0) {
      extension = `.${extension}`;
    }
    return extension;
  }

  /**
   * Normalize a global path. Reduces '..' and '.' parts, and removes
   * leading slashes from the local part of the path, while retaining
   * the drive name if it exists.
   */
  export
  function normalize(path: string): string {
    const parts = path.split(':');
    if (parts.length === 1) {
      return PathExt.normalize(path);
    }
    return `${parts[0]}:${PathExt.normalize(parts.slice(1).join(':'))}`;
  }
}
