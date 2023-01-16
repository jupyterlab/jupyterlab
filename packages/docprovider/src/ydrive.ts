// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DocumentChange,
  IFactory,
  ISharedDocument,
  YDocument,
  YFile,
  YNotebook
} from '@jupyter/ydoc';
import { URLExt } from '@jupyterlab/coreutils';
import { Contents, Drive, ServerConnection, User } from '@jupyterlab/services';
import { WebSocketProvider } from './yprovider';

/**
 * The url for the default drive service.
 */
const Y_DOCUMENT_PROVIDER_URL = 'api/yjs';

/**
 * A Collaborative implementation for an `IDrive`, talking to the
 * server using the Jupyter REST API and a WebSocket connection.
 */
export class YDrive extends Drive {
  /**
   * Construct a new drive object.
   *
   * @param user - The user manager to add the identity to the awareness of documents.
   */
  constructor(user: User.IManager) {
    super({ name: 'YDrive' });
    this._providers = new Map<ISharedDocument, WebSocketProvider>();
    this._sharedPaths = new Set<string>();

    this.sharedModelFactory = new SharedModelFactory(
      user,
      this.serverSettings,
      this._providers
    );
  }

  readonly sharedModelFactory: IFactory;

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
  async delete(localPath: string): Promise<void> {
    await super.delete(localPath);
    // TODO should we remove the path from the sharedPath?
    this._sharedPaths.delete(localPath);
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._sharedPaths.clear();
    this._providers.forEach(p => p.dispose());
    this._providers.clear();
    super.dispose();
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
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    // In collaborative mode we never load the content.
    return super.get(localPath, { ...options, content: false });
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
  async rename(
    oldLocalPath: string,
    newLocalPath: string
  ): Promise<Contents.IModel> {
    const model = await super.rename(oldLocalPath, newLocalPath);
    if (this._sharedPaths.has(oldLocalPath)) {
      this._sharedPaths.delete(oldLocalPath);
      this._sharedPaths.add(model.path);
    }
    return model;
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
  async save(
    localPath: string,
    options: Partial<Contents.IModel> = {}
  ): Promise<Contents.IModel> {
    if (this._sharedPaths.has(localPath)) {
      // Save is done from the backend
      return this.get(localPath, { ...options, content: false });
    } else {
      return super.save(localPath, options);
    }
  }

  private _sharedPaths: Set<string>;
  private _providers: Map<ISharedDocument, WebSocketProvider>;
}

/**
 *
 */
export class SharedModelFactory implements IFactory {
  private _user: User.IManager;
  private _sharedPaths: Set<string>;
  private _providers: Map<ISharedDocument, WebSocketProvider>;

  constructor(
    user: User.IManager,
    serverSettings: ServerConnection.ISettings,
    providers: Map<ISharedDocument, WebSocketProvider>
  ) {
    this._user = user;
    this._providers = providers;

    this.serverSettings = serverSettings;
  }

  readonly serverSettings: ServerConnection.ISettings;

  createNew(options: IFactory.IOptions): ISharedDocument {
    if (
      typeof options?.format !== 'string' ||
      typeof options?.contentType !== 'string'
    ) {
      throw new Error('Format and content type must be provided.');
    }

    let sharedModel: YDocument<DocumentChange>;
    switch (options?.contentType) {
      case 'file':
        sharedModel = new YFile();
        break;
      case 'notebook':
        sharedModel = new YNotebook();
        break;
      //case 'directory':
      //default:
    }

    try {
      const provider = new WebSocketProvider({
        url: URLExt.join(this.serverSettings.wsUrl, Y_DOCUMENT_PROVIDER_URL),
        path: options.path,
        format: options.format,
        contentType: options.contentType,
        collaborative: true,
        model: sharedModel!,
        user: this._user
      });

      this._providers.set(sharedModel!, provider);
      // FIXME
      sharedModel!.disposed.connect(() => {
        const provider = this._providers.get(sharedModel!);
        if (provider) {
          provider.dispose();
          this._providers.delete(sharedModel!);
        }
      });

      this._sharedPaths.add(options.path);
    } catch (error) {
      // Falling back to the contents API if opening the websocket failed
      //  This may happen if the shared document is not a YDocument.
      console.error(
        `Failed to open websocket connection for ${options.path}.\n:${error}`
      );
    }

    return sharedModel!;
  }
}
