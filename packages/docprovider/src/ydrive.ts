// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentChange, ISharedDocument, YDocument } from '@jupyter/ydoc';
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
    this._providers = new Map<ISharedDocument, WebSocketProvider>();
    this._sharedPaths = new Set<string>();
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
    if (options?.sharedDocument) {
      if (
        typeof options?.format !== 'string' ||
        typeof options?.type !== 'string'
      ) {
        throw new Error(
          'Format and content type must be provided with a shared document.'
        );
      }

      if (!this._providers.has(options.sharedDocument)) {
        try {
          const provider = new WebSocketProvider({
            url: URLExt.join(
              this.serverSettings.wsUrl,
              Y_DOCUMENT_PROVIDER_URL
            ),
            path: localPath,
            format: options.format as string,
            contentType: options.type,
            collaborative: true,
            model: options.sharedDocument as YDocument<DocumentChange>,
            user: this._user
          });

          this._providers.set(options.sharedDocument, provider);
          // FIXME
          // options.sharedDocument.disposed.connect(() => {
          //   const provider = this._providers.get(options.sharedDocument!);
          //   if(provider){
          //     provider.dispose();
          //     this._providers.delete(options.sharedDocument!)
          //   }
          // });

          options.content = false;
          this._sharedPaths.add(localPath);
        } catch (error) {
          // Falling back to the contents API if opening the websocket failed
          //  This may happen if the shared document is not a YDocument.
          console.error(
            `Failed to open websocket connection for ${localPath}.\n:${error}`
          );
        }
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

  private _user: User.IManager;
  private _sharedPaths: Set<string>;
  private _providers: Map<ISharedDocument, WebSocketProvider>;
}
