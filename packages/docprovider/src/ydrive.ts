// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DocumentChange,
  ISharedDocument,
  YDocument,
  YFile,
  YNotebook
} from '@jupyter/ydoc';
import { URLExt } from '@jupyterlab/coreutils';
import { Contents, Drive, User } from '@jupyterlab/services';
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
    this._user = user;
    this._sharedPaths = new Set<string>();
    this._providers = new Map<string, WebSocketProvider>();

    this.sharedModelFactory = new SharedModelFactory(this._onCreate);
  }

  /**
   * SharedModel factory for the YDrive.
   */
  readonly sharedModelFactory: Contents.ISharedFactory;

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
    // FIXME
    // We are not removing the path from `sharedPaths` as multiple providers of the same file (with different model) may exist.
    //this._sharedPaths.delete(localPath);
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
    if (options && options.format && options.type) {
      const key = `${options.type}:${options.format}:${localPath}`;
      const provider = this._providers.get(key);

      if (provider) {
        this._sharedPaths.add(localPath);
        const model = super.get(localPath, { ...options, content: false });
        await provider.ready;
        return model;
      }
    }

    return super.get(localPath, options);
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

  private _onCreate = (
    options: Contents.ISharedFactoryOptions,
    sharedModel: YDocument<DocumentChange>
  ) => {
    if (typeof options.format !== 'string') {
      return;
    }
    try {
      const provider = new WebSocketProvider({
        url: URLExt.join(this.serverSettings.wsUrl, Y_DOCUMENT_PROVIDER_URL),
        path: options.path,
        format: options.format,
        contentType: options.contentType,
        model: sharedModel,
        user: this._user
      });

      const key = `${options.contentType}:${options.format}:${options.path}`;
      this._providers.set(key, provider);

      sharedModel.disposed.connect(() => {
        const provider = this._providers.get(key);
        if (provider) {
          provider.dispose();
          this._providers.delete(key);
        }
      });
    } catch (error) {
      // Falling back to the contents API if opening the websocket failed
      //  This may happen if the shared document is not a YDocument.
      console.error(
        `Failed to open websocket connection for ${options.path}.\n:${error}`
      );
    }
  };

  private _user: User.IManager;
  private _sharedPaths: Set<string>;
  private _providers: Map<string, WebSocketProvider>;
}

/**
 * Yjs sharedModel factory for real-time collaboration.
 */
class SharedModelFactory implements Contents.ISharedFactory {
  constructor(
    private _onCreate: (
      options: Contents.ISharedFactoryOptions,
      sharedModel: YDocument<DocumentChange>
    ) => void
  ) {}

  createNew(
    options: Contents.ISharedFactoryOptions
  ): ISharedDocument | undefined {
    if (typeof options.format !== 'string') {
      console.warn(`Only defined format are supported; got ${options.format}.`);
      return;
    }

    if (!options.collaborative) {
      return;
    }

    let sharedModel: YDocument<DocumentChange> | undefined;
    switch (options.contentType) {
      case 'file':
        sharedModel = new YFile();
        break;
      case 'notebook':
        sharedModel = new YNotebook();
        break;
      //default:
      // FIXME we should request a registry for the proper sharedModel
    }

    if (sharedModel) {
      this._onCreate(options, sharedModel);
    }

    return sharedModel;
  }
}
