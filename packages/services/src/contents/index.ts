// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { DocumentChange, ISharedDocument, YDocument } from '@jupyter/ydoc';

import { PathExt, URLExt } from '@jupyterlab/coreutils';

import { PartialJSONObject } from '@lumino/coreutils';

import { DisposableDelegate, IDisposable } from '@lumino/disposable';

import { ISignal, Signal } from '@lumino/signaling';

import { ServerConnection } from '..';

import * as validate from './validate';

/**
 * The url for the default drive service.
 */
const SERVICE_DRIVE_URL = 'api/contents';

/**
 * The url for the file access.
 */
const FILES_URL = 'files';

/**
 * A document factory for registering shared models
 */
export type SharedDocumentFactory = (
  options: Contents.ISharedFactoryOptions
) => YDocument<DocumentChange>;

/**
 * A namespace for contents interfaces.
 */
export namespace Contents {
  /**
   * A contents model.
   */
  export interface IModel {
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
     * The path as returned by the server contents API.
     *
     * #### Notes
     * Differently to `path` it does not include IDrive API prefix.
     */
    readonly serverPath?: string;

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

    /**
     * The size of then file in bytes.
     */
    readonly size?: number;

    /**
     * The indices of the matched characters in the name.
     */
    indices?: ReadonlyArray<number> | null;

    /**
     * The hexdigest hash string of content, if requested (otherwise null).
     * It cannot be null if hash_algorithm is defined.
     */
    readonly hash?: string;

    /**
     * The algorithm used to compute hash value. It cannot be null if hash is defined.
     */
    readonly hash_algorithm?: string;
  }

  /**
   * Validates an IModel, throwing an error if it does not pass.
   */
  export function validateContentsModel(contents: IModel): void {
    validate.validateContentsModel(contents);
  }

  /**
   * A contents file type. It can be anything but `jupyter-server`
   * has special treatment for `notebook` and `directory` types.
   * Anything else is considered as `file` type.
   */
  export type ContentType = string;

  /**
   * A contents file format. Always `json` for `notebook` and
   * `directory` types. It should be set to either `text` or
   * `base64` for `file` type.
   * See the
   * [jupyter server data model for filesystem entities](https://jupyter-server.readthedocs.io/en/latest/developers/contents.html#filesystem-entities)
   * for more details.
   */
  export type FileFormat = 'json' | 'text' | 'base64' | null;

  /**
   * The options used to decode which provider to use.
   */
  export interface IContentProvisionOptions {
    /**
     * The override for the content provider.
     * @experimental
     */
    contentProviderId?: string;
  }

  /**
   * The options used to fetch a file.
   */
  export interface IFetchOptions extends IContentProvisionOptions {
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

    /**
     * Whether to include a hash in the response.
     *
     * The default is `false`.
     */
    hash?: boolean;
  }

  /**
   * The options used to create a file.
   */
  export interface ICreateOptions {
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
  export interface ICheckpointModel {
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
   * Validates an ICheckpointModel, throwing an error if it does not pass.
   */
  export function validateCheckpointModel(checkpoint: ICheckpointModel): void {
    validate.validateCheckpointModel(checkpoint);
  }

  /**
   * The change args for a file change.
   */
  export interface IChangedArgs {
    /**
     * The type of change.
     */
    type: 'new' | 'delete' | 'rename' | 'save';

    /**
     * The old contents.
     */
    oldValue: Partial<IModel> | null;

    /**
     * The new contents.
     */
    newValue: Partial<IModel> | null;
  }

  /**
   * A factory interface for creating `ISharedDocument` objects.
   */
  export interface ISharedFactory {
    /**
     * Whether the IDrive supports real-time collaboration or not.
     * Note: If it is not provided, it is false by default.
     */
    readonly collaborative?: boolean;

    /**
     * Create a new `ISharedDocument` instance.
     *
     * It should return `undefined` if the factory is not able to create a `ISharedDocument`.
     */
    createNew(options: ISharedFactoryOptions): ISharedDocument | undefined;

    /**
     * Register a SharedDocumentFactory.
     *
     * @param type Document type
     * @param factory Document factory
     */
    registerDocumentFactory?(
      type: Contents.ContentType,
      factory: SharedDocumentFactory
    ): void;
  }

  /**
   * The options used to instantiate a ISharedDocument
   */
  export interface ISharedFactoryOptions {
    /**
     * The path of the file.
     */
    path: string;
    /**
     * The format of the document. If null, the document won't be
     * collaborative.
     */
    format: FileFormat;
    /**
     * The content type of the document.
     */
    contentType: ContentType;
    /**
     * Whether the document is collaborative or not.
     *
     * The default value is `true`.
     */
    collaborative?: boolean;
  }

  /**
   * The interface for a contents manager.
   */
  export interface IManager extends IDisposable {
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
     * @param path the path.
     *
     * @returns The local part of the path.
     */
    localPath(path: string): string;

    /**
     * Normalize a global path. Reduces '..' and '.' parts, and removes
     * leading slashes from the local part of the path, while retaining
     * the drive name if it exists.
     *
     * @param path the path.
     *
     * @returns The normalized path.
     */
    normalize(path: string): string;

    /**
     * Resolve a global path, starting from the root path. Behaves like
     * posix-path.resolve, with 3 differences:
     *  - will never prepend cwd
     *  - if root has a drive name, the result is prefixed with "<drive>:"
     *  - before adding drive name, leading slashes are removed
     *
     * @param path the path.
     *
     * @returns The normalized path.
     */
    resolvePath(root: string, path: string): string;

    /**
     * Given a path of the form `drive:local/portion/of/it.txt`
     * get the name of the drive. If the path is missing
     * a drive portion, returns an empty string.
     *
     * @param path the path.
     *
     * @returns The drive name for the path, or the empty string.
     */
    driveName(path: string): string;

    /**
     * Given a path, get a shared model IFactory from the
     * relevant backend. Returns `null` if the backend
     * does not provide one.
     */
    getSharedModelFactory(
      path: string,
      options?: IContentProvisionOptions
    ): ISharedFactory | null;

    /**
     * Get a file or directory.
     *
     * @param path The path to the file.
     *
     * @param options The options used to fetch the file.
     *
     * @returns A promise which resolves with the file content.
     */
    get(path: string, options?: IFetchOptions): Promise<IModel>;

    /**
     * Get an encoded download url given a file path.
     *
     * @param A promise which resolves with the absolute POSIX
     *   file path on the server.
     *
     * #### Notes
     * The returned URL may include a query parameter.
     */
    getDownloadUrl(path: string): Promise<string>;

    /**
     * Create a new untitled file or directory in the specified directory path.
     *
     * @param options The options used to create the file.
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
     * @param options - Optional overrides to the model.
     *
     * @returns A promise which resolves with the file content model when the
     *   file is saved.
     */
    save(
      path: string,
      options?: Partial<IModel> & Contents.IContentProvisionOptions
    ): Promise<IModel>;

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
  export interface IDrive extends IDisposable {
    /**
     * An optional content provider registry, consisting of all the
     * content providers that this drive can use to access files.
     */
    readonly contentProviderRegistry?: IContentProviderRegistry;

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
     * An optional shared model factory instance for the
     * drive.
     */
    readonly sharedModelFactory?: ISharedFactory;

    /**
     * A signal emitted when a file operation takes place.
     */
    fileChanged: ISignal<IDrive, IChangedArgs>;

    /**
     * Get a file or directory.
     *
     * @param localPath The path to the file.
     *
     * @param options The options used to fetch the file.
     *
     * @returns A promise which resolves with the file content.
     */
    get(localPath: string, options?: IFetchOptions): Promise<IModel>;

    /**
     * Get an encoded download url given a file path.
     *
     * @returns A promise which resolves with the absolute POSIX
     *   file path on the server.
     *
     * #### Notes
     * The returned URL may include a query parameter.
     */
    getDownloadUrl(localPath: string): Promise<string>;

    /**
     * Create a new untitled file or directory in the specified directory path.
     *
     * @param options The options used to create the file.
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
     * @param options - Optional overrides to the model.
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
export class ContentsManager implements Contents.IManager {
  /**
   * Construct a new contents manager object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(options: ContentsManager.IOptions = {}) {
    const serverSettings = (this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings());
    this._defaultDrive = options.defaultDrive ?? new Drive({ serverSettings });
    this._defaultDrive.fileChanged.connect(this._onFileChanged, this);
  }

  /**
   * The default drive associated with the manager.
   */
  get defaultDrive(): Contents.IDrive {
    return this._defaultDrive;
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
   * Given a path, get a shared model factory from the relevant backend.
   * The factory defined on content provider best matching the given path
   * takes precedence over the factory defined on the drive as a whole.
   * Returns `null` if the backend does not provide one.
   */
  getSharedModelFactory(
    path: string,
    options?: Contents.IContentProvisionOptions
  ): Contents.ISharedFactory | null {
    const [drive] = this._driveForPath(path);
    const provider = drive.contentProviderRegistry?.getProvider(
      options?.contentProviderId
    );
    if (provider?.sharedModelFactory) {
      return provider.sharedModelFactory;
    }
    return drive.sharedModelFactory ?? null;
  }

  /**
   * Given a path of the form `drive:local/portion/of/it.txt`
   * get the local part of it.
   *
   * @param path the path.
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
   * Normalize a global path. Reduces '..' and '.' parts, and removes
   * leading slashes from the local part of the path, while retaining
   * the drive name if it exists.
   *
   * @param path the path.
   *
   * @returns The normalized path.
   */
  normalize(path: string): string {
    const parts = path.split(':');
    if (parts.length === 1) {
      return PathExt.normalize(path);
    }
    return `${parts[0]}:${PathExt.normalize(parts.slice(1).join(':'))}`;
  }

  /**
   * Resolve a global path, starting from the root path. Behaves like
   * posix-path.resolve, with 3 differences:
   *  - will never prepend cwd
   *  - if root has a drive name, the result is prefixed with "<drive>:"
   *  - before adding drive name, leading slashes are removed
   *
   * @param path the path.
   *
   * @returns The normalized path.
   */
  resolvePath(root: string, path: string): string {
    const driveName = this.driveName(root);
    const localPath = this.localPath(root);
    const resolved = PathExt.resolve('/', localPath, path);
    return driveName ? `${driveName}:${resolved}` : resolved;
  }

  /**
   * Given a path of the form `drive:local/portion/of/it.txt`
   * get the name of the drive. If the path is missing
   * a drive portion, returns an empty string.
   *
   * @param path the path.
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
   * @param path The path to the file.
   *
   * @param options The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   */
  get(
    path: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    const [drive, localPath] = this._driveForPath(path);
    return drive.get(localPath, options).then(contentsModel => {
      const listing: Contents.IModel[] = [];
      if (contentsModel.type === 'directory' && contentsModel.content) {
        for (const item of contentsModel.content) {
          listing.push({ ...item, path: this._toGlobalPath(drive, item.path) });
        }
        return {
          ...contentsModel,
          path: this._toGlobalPath(drive, localPath),
          content: listing,
          serverPath: contentsModel.path
        } as Contents.IModel;
      } else {
        return {
          ...contentsModel,
          path: this._toGlobalPath(drive, localPath),
          serverPath: contentsModel.path
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
   *
   * The returned URL may include a query parameter.
   */
  getDownloadUrl(path: string): Promise<string> {
    const [drive, localPath] = this._driveForPath(path);
    return drive.getDownloadUrl(localPath);
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   *
   * @param options The options used to create the file.
   *
   * @returns A promise which resolves with the created file content when the
   *    file is created.
   */
  newUntitled(options: Contents.ICreateOptions = {}): Promise<Contents.IModel> {
    if (options.path) {
      const globalPath = this.normalize(options.path);
      const [drive, localPath] = this._driveForPath(globalPath);
      return drive
        .newUntitled({ ...options, path: localPath })
        .then(contentsModel => {
          return {
            ...contentsModel,
            path: PathExt.join(globalPath, contentsModel.name),
            serverPath: contentsModel.path
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
    const [drive, localPath] = this._driveForPath(path);
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
    const [drive1, path1] = this._driveForPath(path);
    const [drive2, path2] = this._driveForPath(newPath);
    if (drive1 !== drive2) {
      throw Error('ContentsManager: renaming files must occur within a Drive');
    }
    return drive1.rename(path1, path2).then(contentsModel => {
      return {
        ...contentsModel,
        path: this._toGlobalPath(drive1, path2),
        serverPath: contentsModel.path
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
  save(
    path: string,
    options: Partial<Contents.IModel> = {}
  ): Promise<Contents.IModel> {
    const globalPath = this.normalize(path);
    const [drive, localPath] = this._driveForPath(path);
    return drive
      .save(localPath, { ...options, path: localPath })
      .then(contentsModel => {
        return {
          ...contentsModel,
          path: globalPath,
          serverPath: contentsModel.path
        } as Contents.IModel;
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
    const [drive1, path1] = this._driveForPath(fromFile);
    const [drive2, path2] = this._driveForPath(toDir);
    if (drive1 === drive2) {
      return drive1.copy(path1, path2).then(contentsModel => {
        return {
          ...contentsModel,
          path: this._toGlobalPath(drive1, contentsModel.path),
          serverPath: contentsModel.path
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
    const [drive, localPath] = this._driveForPath(path);
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
    const [drive, localPath] = this._driveForPath(path);
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
    const [drive, localPath] = this._driveForPath(path);
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
    const [drive, localPath] = this._driveForPath(path);
    return drive.deleteCheckpoint(localPath, checkpointID);
  }

  /**
   * Given a drive and a local path, construct a fully qualified
   * path. The inverse of `_driveForPath`.
   *
   * @param drive an `IDrive`.
   *
   * @param localPath the local path on the drive.
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
   * @param path a path to a file.
   *
   * @returns A tuple containing an `IDrive` object for the path,
   * and a local path for that drive.
   */
  private _driveForPath(path: string): [Contents.IDrive, string] {
    const driveName = this.driveName(path);
    const localPath = this.localPath(path);
    if (driveName) {
      return [this._additionalDrives.get(driveName)!, localPath];
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
      if (args.newValue?.path) {
        newValue = {
          ...args.newValue,
          path: this._toGlobalPath(sender, args.newValue.path)
        };
      }
      if (args.oldValue?.path) {
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
export class Drive implements Contents.IDrive {
  /**
   * Construct a new contents manager object.
   *
   * @param options - The options used to initialize the object.
   */
  constructor(options: Drive.IOptions = {}) {
    this.name = options.name ?? 'Default';
    this._apiEndpoint = options.apiEndpoint ?? SERVICE_DRIVE_URL;
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    const restContentProvider = new RestContentProvider({
      apiEndpoint: this._apiEndpoint,
      serverSettings: this.serverSettings
    });
    this.contentProviderRegistry = new ContentProviderRegistry({
      defaultProvider: restContentProvider
    });
    this.contentProviderRegistry.fileChanged.connect(
      (registry, change: Contents.IChangedArgs) => {
        this._fileChanged.emit(change);
      }
    );
  }

  /**
   * Content provider registry.
   * @experimental
   */
  readonly contentProviderRegistry: IContentProviderRegistry;

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
   * @param localPath The path to the file.
   *
   * @param options The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   *
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    const contentProvider = this.contentProviderRegistry.getProvider(
      options?.contentProviderId
    );
    return contentProvider.get(localPath, options);
  }

  /**
   * Get an encoded download url given a file path.
   *
   * @param localPath - An absolute POSIX file path on the server.
   *
   * #### Notes
   * It is expected that the path contains no relative paths.
   *
   * The returned URL may include a query parameter.
   */
  getDownloadUrl(localPath: string): Promise<string> {
    const baseUrl = this.serverSettings.baseUrl;
    let url = URLExt.join(baseUrl, FILES_URL, URLExt.encodeParts(localPath));
    let cookie = '';
    try {
      cookie = document.cookie;
    } catch (e) {
      // e.g. SecurityError in case of CSP Sandbox
    }
    const xsrfTokenMatch = cookie.match('\\b_xsrf=([^;]*)\\b');
    if (xsrfTokenMatch) {
      const fullUrl = new URL(url);
      fullUrl.searchParams.append('_xsrf', xsrfTokenMatch[1]);
      url = fullUrl.toString();
    }
    return Promise.resolve(url);
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   *
   * @param options The options used to create the file.
   *
   * @returns A promise which resolves with the created file content when the
   *    file is created.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async newUntitled(
    options: Contents.ICreateOptions = {}
  ): Promise<Contents.IModel> {
    let body = '{}';
    if (options) {
      if (options.ext) {
        options.ext = Private.normalizeExtension(options.ext);
      }
      body = JSON.stringify(options);
    }

    const settings = this.serverSettings;
    const url = this._getUrl(options.path ?? '');
    const init = {
      method: 'POST',
      body
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    validate.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    return data;
  }

  /**
   * Delete a file.
   *
   * @param localPath - The path to the file.
   *
   * @returns A promise which resolves when the file is deleted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents).
   */
  async delete(localPath: string): Promise<void> {
    const url = this._getUrl(localPath);
    const settings = this.serverSettings;
    const init = { method: 'DELETE' };
    const response = await ServerConnection.makeRequest(url, init, settings);
    // TODO: update IPEP27 to specify errors more precisely, so
    // that error types can be detected here with certainty.
    if (response.status !== 204) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    this._fileChanged.emit({
      type: 'delete',
      oldValue: { path: localPath },
      newValue: null
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async rename(
    oldLocalPath: string,
    newLocalPath: string
  ): Promise<Contents.IModel> {
    const settings = this.serverSettings;
    const url = this._getUrl(oldLocalPath);
    const init = {
      method: 'PATCH',
      body: JSON.stringify({ path: newLocalPath })
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    validate.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'rename',
      oldValue: { path: oldLocalPath },
      newValue: data
    });
    return data;
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async save(
    localPath: string,
    options: Partial<Contents.IModel> & Contents.IContentProvisionOptions = {}
  ): Promise<Contents.IModel> {
    const contentProvider = this.contentProviderRegistry.getProvider(
      options?.contentProviderId
    );
    const data = await contentProvider.save(localPath, options);
    this._fileChanged.emit({
      type: 'save',
      oldValue: null,
      newValue: data
    });
    return data;
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async copy(fromFile: string, toDir: string): Promise<Contents.IModel> {
    const settings = this.serverSettings;
    const url = this._getUrl(toDir);
    const init = {
      method: 'POST',
      body: JSON.stringify({ copy_from: fromFile })
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    validate.validateContentsModel(data);
    this._fileChanged.emit({
      type: 'new',
      oldValue: null,
      newValue: data
    });
    return data;
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async createCheckpoint(
    localPath: string
  ): Promise<Contents.ICheckpointModel> {
    const url = this._getUrl(localPath, 'checkpoints');
    const init = { method: 'POST' };
    const response = await ServerConnection.makeRequest(
      url,
      init,
      this.serverSettings
    );
    if (response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    validate.validateCheckpointModel(data);
    return data;
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async listCheckpoints(
    localPath: string
  ): Promise<Contents.ICheckpointModel[]> {
    const url = this._getUrl(localPath, 'checkpoints');
    const response = await ServerConnection.makeRequest(
      url,
      {},
      this.serverSettings
    );
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid Checkpoint list');
    }
    for (let i = 0; i < data.length; i++) {
      validate.validateCheckpointModel(data[i]);
    }
    return data;
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents).
   */
  async restoreCheckpoint(
    localPath: string,
    checkpointID: string
  ): Promise<void> {
    const url = this._getUrl(localPath, 'checkpoints', checkpointID);
    const init = { method: 'POST' };
    const response = await ServerConnection.makeRequest(
      url,
      init,
      this.serverSettings
    );
    if (response.status !== 204) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents).
   */
  async deleteCheckpoint(
    localPath: string,
    checkpointID: string
  ): Promise<void> {
    const url = this._getUrl(localPath, 'checkpoints', checkpointID);
    const init = { method: 'DELETE' };
    const response = await ServerConnection.makeRequest(
      url,
      init,
      this.serverSettings
    );
    if (response.status !== 204) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
  }

  /**
   * Get a REST url for a file given a path.
   */
  private _getUrl(...args: string[]): string {
    const parts = args.map(path => URLExt.encodeParts(path));
    const baseUrl = this.serverSettings.baseUrl;
    return URLExt.join(baseUrl, this._apiEndpoint, ...parts);
  }

  private _apiEndpoint: string;
  private _isDisposed = false;
  private _fileChanged = new Signal<this, Contents.IChangedArgs>(this);
}

/**
 * A namespace for ContentsManager statics.
 */
export namespace ContentsManager {
  /**
   * The options used to initialize a contents manager.
   */
  export interface IOptions {
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
export namespace Drive {
  /**
   * The options used to initialize a `Drive`.
   */
  export interface IOptions {
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
     * REST API given by [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents).
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
  export function normalizeExtension(extension: string): string {
    if (extension.length > 0 && extension.indexOf('.') !== 0) {
      extension = `.${extension}`;
    }
    return extension;
  }
}

/**
 * The default registry of content providers.
 */
class ContentProviderRegistry implements IContentProviderRegistry {
  /**
   * Construct a new content provider registry.
   *
   * @param options - The options used to initialize the registry.
   */
  constructor(options: ContentProviderRegistry.IOptions) {
    this.register('default', options.defaultProvider);
    this._defaultProvider = options.defaultProvider;
  }

  /**
   * Add a content provider to the registry.
   *
   * @param identifier - The identifier of the provider; it can be reused between drives.
   * @param provider - The content provider to register.
   */
  register(identifier: string, provider: IContentProvider): IDisposable {
    if (this._providers.has(identifier)) {
      throw Error(
        `Provider with ${identifier} identifier was already registered on this drive`
      );
    }
    this._providers.set(identifier, provider);

    const fileChangedProxy = (
      _provider: IContentProvider,
      change: Contents.IChangedArgs
    ) => {
      this._fileChanged.emit(change);
    };
    if (provider.fileChanged) {
      provider.fileChanged.connect(fileChangedProxy);
    }

    return new DisposableDelegate(() => {
      if (provider.fileChanged) {
        provider.fileChanged.disconnect(fileChangedProxy);
      }

      if (this._providers.has(identifier)) {
        this._providers.delete(identifier);
      }
    });
  }

  /**
   * Get a content provider matching provided identifier.
   *
   * If no identifier is provided, return the default provider.
   * Throws an error if a provider with given identifier is not found.
   *
   * @param identifier - identifier of the content provider.
   */
  getProvider(identifier?: string): IContentProvider {
    if (!identifier) {
      return this._defaultProvider;
    }
    const provider = this._providers.get(identifier);
    if (!provider) {
      throw Error(`Provider ${identifier} is not registered`);
    }
    return provider;
  }

  /**
   * A proxy of the file changed signal for all the providers.
   */
  get fileChanged(): ISignal<IContentProviderRegistry, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  private _providers: Map<string, IContentProvider> = new Map();
  private _defaultProvider: IContentProvider;
  private _fileChanged = new Signal<
    IContentProviderRegistry,
    Contents.IChangedArgs
  >(this);
}

namespace ContentProviderRegistry {
  /**
   * Initialization options for `ContentProviderRegistry`.
   */
  export interface IOptions {
    /**
     * Default provider for the registry.
     */
    defaultProvider: IContentProvider;
  }
}

/**
 * A content provider using the Jupyter REST API.
 */
export class RestContentProvider implements IContentProvider {
  constructor(options: RestContentProvider.IOptions) {
    this._options = options;
  }

  /**
   * Get a file or directory.
   *
   * @param localPath The path to the file.
   *
   * @param options The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   *
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    let url = this._getUrl(localPath);
    if (options) {
      // The notebook type cannot take a format option.
      if (options.type === 'notebook') {
        delete options['format'];
      }
      const content = options.content ? '1' : '0';
      const hash = options.hash ? '1' : '0';
      const params: PartialJSONObject = { ...options, content, hash };
      url += URLExt.objectToQueryString(params);
    }

    const settings = this._options.serverSettings;
    const response = await ServerConnection.makeRequest(url, {}, settings);
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    validate.validateContentsModel(data);
    return data;
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
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/contents) and validates the response model.
   */
  async save(
    localPath: string,
    options: Partial<Contents.IModel> = {}
  ): Promise<Contents.IModel> {
    const settings = this._options.serverSettings;
    const url = this._getUrl(localPath);
    const init = {
      method: 'PUT',
      body: JSON.stringify(options)
    };
    const response = await ServerConnection.makeRequest(url, init, settings);
    // will return 200 for an existing file and 201 for a new file
    if (response.status !== 200 && response.status !== 201) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    validate.validateContentsModel(data);
    return data;
  }

  /**
   * Get a REST url for a file given a path.
   */
  private _getUrl(...args: string[]): string {
    const parts = args.map(path => URLExt.encodeParts(path));
    const baseUrl = this._options.serverSettings.baseUrl;
    return URLExt.join(baseUrl, this._options.apiEndpoint, ...parts);
  }

  private _options: RestContentProvider.IOptions;
}

export namespace RestContentProvider {
  /**
   * Initialization options for the REST content provider.
   */
  export interface IOptions {
    apiEndpoint: string;
    serverSettings: ServerConnection.ISettings;
  }
}

/**
 * Registry of content providers.
 * @experimental
 */
export interface IContentProviderRegistry {
  /**
   * Add a content provider to the registry.
   *
   * @param identifier - The identifier of the provider; it can be reused between drives.
   * @param provider - The content provider to register.
   */
  register(identifier: string, provider: IContentProvider): IDisposable;

  /**
   * Get a content provider matching provided identifier.
   *
   * If no identifier is provided, return the default provider.
   * Throws an error if a provider with given identifier is not found.
   *
   * @param identifier - identifier of the content provider.
   */
  getProvider(identifier?: string): IContentProvider;

  /**
   * A proxy of the file changed signal for all the providers.
   */
  readonly fileChanged: ISignal<
    IContentProviderRegistry,
    Contents.IChangedArgs
  >;
}

/**
 * The content provider interface.
 *
 * Content providers are similar to drives, but instead of a data storage,
 * they represent the data retrieval method (think protocol). Each drive
 * can have multiple providers registered, and each provider ID can be
 * used to register an instance of such provider across multiple drives.
 *
 * To provision file contents via a content provider:
 * - register a widget factory with `contentProviderId` option
 * - register a file type with in the document registry with `contentProviderId` option
 *
 * @experimental
 */
export interface IContentProvider
  extends Pick<Contents.IDrive, 'get' | 'save' | 'sharedModelFactory'> {
  /**
   * A signal emitted when a file operation takes place.
   *
   * Content providers which perform save operations initiated on the backend
   * may emit this signal to communicate a change in the file contents.
   */
  readonly fileChanged?: ISignal<IContentProvider, Contents.IChangedArgs>;
}
