// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { Contents, Drive, User } from '@jupyterlab/services';

import {
  DocumentChange,
  ISharedDocument,
  YDocument,
  YFile,
  YNotebook
} from '@jupyter-notebook/ydoc';

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
    this._providers = new Map();
  }

  /**
   * Dispose of the resources held by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._providers.forEach(p => p.dispose());
    super.dispose();
  }

  async open(
    localPath: string,
    options: Contents.IOpenOptions
  ): Promise<ISharedDocument> {
    let sharedModel: YDocument<DocumentChange>;
    switch (options.type) {
      case 'file':
        sharedModel = new YFile();
        break;
      case 'notebook':
        sharedModel = new YNotebook();
        break;
      case 'directory':
        sharedModel = new YDocument();
        break;
      default:
        sharedModel = new YFile();
        break;
    }

    const provider = new WebSocketProvider({
      url: URLExt.join(this.serverSettings.wsUrl, Y_DOCUMENT_PROVIDER_URL),
      path: localPath,
      format: options.format as string,
      contentType: options.type,
      collaborative: true,
      model: sharedModel,
      user: this._user
    });

    const key = `${options.type}:${options.format}:${localPath}`;
    this._providers.set(key, provider);
    return sharedModel;
  }

  async close(
    localPath: string,
    options: Contents.ICloseOptions
  ): Promise<void> {
    const key = `${options.type}:${options.format}:${localPath}`;
    const provider = this._providers.get(key);
    provider?.dispose();
    this._providers.delete(key);
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
    if (options?.type == 'file' || options?.type == 'notebook') {
      return super.get(localPath, { ...options, content: false });
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
    return super.rename(oldLocalPath, newLocalPath);
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
    // Save is done from the backend
    return options as Contents.IModel;
  }

  private _user: User.IManager;
  private _providers: Map<string, WebSocketProvider>;
}
