// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import type { IDocumentManager } from '@jupyterlab/docmanager';
import type { Contents } from '@jupyterlab/services';
import type { APIRequestContext, APIResponse, Page } from '@playwright/test';
import type { ReadStream } from 'fs-extra';
import * as path from 'path';
import type { IPluginNameToInterfaceMap } from './extension';
import * as Utils from './utils';

/**
 * Helper class to interact with contents server API
 *
 * Those helpers are directly requesting the Jupyter server to
 * carry contents tasks; except rename operations if the page model
 * is provided.
 */
export class ContentsHelper {
  /**
   * Construct a new instance of ContentsHelper
   *
   * @param request Playwright API request context
   * @param page Playwright page model object
   */
  constructor(
    request?: APIRequestContext,
    readonly page?: Page
  ) {
    if (request) {
      this.request = request;
    } else if (page) {
      this.request = page.context().request;
    } else {
      throw new TypeError(
        'You must provide `request` or `page` to the contents helper.'
      );
    }
  }

  readonly request: APIRequestContext;

  /**
   * Return the model for a path.
   *
   * @param path Path
   * @param type Path type
   * @returns Element metadata
   */
  async getContentMetadata(
    path: string,
    type: 'file' | 'directory' = 'file'
  ): Promise<Contents.IModel | null> {
    const data = {
      type,
      // Get the content only for directory
      content: type === 'directory' ? 1 : 0
    };

    let response = null;

    try {
      response = await this._fetch(path + URLExt.objectToQueryString(data));
    } catch (error) {
      console.error(`Fail to get content metadata for ${path}`, error);
    }

    const succeeded = response?.status() === 200;

    if (succeeded) {
      return response!.json();
    }

    return null;
  }

  /**
   * Whether a directory exists or not
   *
   * @param dirPath Directory path
   * @returns Directory existence status
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    const content = await this.getContentMetadata(dirPath, 'directory');

    return content?.type === 'directory';
  }

  /**
   * Whether a file exists or not
   *
   * @param filePath File path
   * @returns File existence status
   */
  async fileExists(filePath: string): Promise<boolean> {
    const content = await this.getContentMetadata(filePath);

    return content?.type === 'notebook' || content?.type === 'file';
  }

  /**
   * Create a directory
   *
   * @param dirPath Directory path
   * @returns Action success status
   */
  async createDirectory(dirPath: string): Promise<boolean> {
    const directories = dirPath.split('/');
    let path = '';

    for (const directory of directories) {
      if (directory.trim() === '') {
        continue;
      }
      if (path !== '') {
        path += '/';
      }
      path += directory;
      await this._createDirectory(path);
    }

    return true;
  }

  /**
   * Upload a directory recursively in the Jupyter server
   *
   * @param sourcePath Local source path
   * @param destinationPath Server destination path
   * @returns Action success status
   */
  async uploadDirectory(
    sourcePath: string,
    destinationPath?: string
  ): Promise<boolean> {
    const pos = sourcePath.lastIndexOf('/');
    const sourceDirName = sourcePath.substring(pos + 1);
    destinationPath = destinationPath ?? sourceDirName;

    const files = Utils.getFilesInDirectory(sourcePath);
    for (const file of files) {
      const relativePath = file.substring(sourcePath.length + 1);
      await this.uploadFile(file, `${destinationPath}/${relativePath}`);
    }

    return true;
  }

  /**
   * Upload content as file to JupyterLab.
   *
   * Note: the destinationPath is the filepath on the server.
   *
   * @param content Content file to upload
   * @param format Content format
   * @param destinationPath Destination filepath
   * @returns Whether the action succeeded or not.
   */

  async uploadContent(
    content: string,
    format: 'base64' | 'text' | 'json',
    destinationPath: string
  ): Promise<boolean> {
    const pos = destinationPath.lastIndexOf('/');
    if (pos !== -1) {
      const destDir = destinationPath?.substring(0, pos);
      if (destDir && !(await this.directoryExists(destDir))) {
        await this.createDirectory(destDir);
      }
    }

    const data = JSON.stringify({
      content,
      format,
      type: 'file'
    });

    let response = null;

    try {
      response = await this._fetch(destinationPath, {
        method: 'PUT',
        data
      });
    } catch (error) {
      console.error(
        `Failed to upload content to server ${destinationPath}`,
        error
      );
    }

    const succeeded = response?.status() === 201;

    if (succeeded) {
      return await this.fileExists(destinationPath);
    }

    return false;
  }

  /**
   * Upload a file to JupyterLab.
   *
   * Note: the destinationPath is the filepath on the server.
   *
   * @param sourcePath Filepath to upload
   * @param destinationPath Destination filepath
   * @returns Whether the action succeeded or not.
   */
  async uploadFile(
    sourcePath: string,
    destinationPath?: string
  ): Promise<boolean> {
    return this.uploadContent(
      Utils.base64EncodeFile(sourcePath),
      'base64',
      destinationPath ?? path.basename(sourcePath)
    );
  }

  /**
   * Delete a file
   *
   * @param filePath File path
   * @returns Action success status
   */
  async deleteFile(filePath: string): Promise<boolean> {
    const fileName = filePath;

    let response = null;

    try {
      response = await this._fetch(fileName, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to delete file ${filePath}`, error);
    }

    const succeeded = response?.status() === 204;

    if (succeeded) {
      return !(await this.fileExists(fileName));
    }

    return false;
  }

  /**
   * Delete recursively a directory
   *
   * @param dirPath Directory path
   * @returns Action success status
   */
  async deleteDirectory(dirPath: string): Promise<boolean> {
    const dirContent = await this.getContentMetadata(dirPath, 'directory');

    if (!(dirContent && dirContent.type === 'directory')) {
      return false;
    }

    let anyFailed = false;

    // delete directory contents first
    for (const item of dirContent.content) {
      if (item.type === 'directory') {
        if (!(await this.deleteDirectory(item.path))) {
          anyFailed = true;
        }
      } else {
        if (!(await this.deleteFile(item.path))) {
          anyFailed = true;
        }
      }
    }

    if (!(await this.deleteFile(dirPath))) {
      anyFailed = true;
    }

    return !anyFailed;
  }

  /**
   * Rename a file
   *
   * @param oldName Old name
   * @param newName New name
   * @returns Action success status
   */
  async renameFile(oldName: string, newName: string): Promise<boolean> {
    if (this.page) {
      // Rename through REST API does not propagate to opened widgets
      // => Use galata in-page if page is available
      return await this.page.evaluate(
        async ({ pluginId, oldName, newName }) => {
          const docManager = (await window.galata.getPlugin(
            pluginId
          )) as IDocumentManager;
          const result = await docManager.rename(oldName, newName);
          return result !== null;
        },
        {
          pluginId:
            '@jupyterlab/docmanager-extension:manager' as keyof IPluginNameToInterfaceMap,
          oldName: oldName,
          newName: newName
        }
      );
    }

    let response = null;

    try {
      response = await this._fetch(oldName, {
        method: 'PATCH',
        data: JSON.stringify({ path: newName })
      });
    } catch (error) {
      console.error(`Failed to rename file ${oldName} to ${newName}`, error);
    }

    const succeeded = response?.status() === 200;

    if (succeeded) {
      return await this.fileExists(newName);
    }

    return false;
  }

  /**
   * Rename a directory
   *
   * @param oldName Old name
   * @param newName New name
   * @returns Action success status
   */
  async renameDirectory(oldName: string, newName: string): Promise<boolean> {
    return await this.renameFile(oldName, newName);
  }

  /**
   * Wait for a contents API response
   *
   * @param trigger Action to trigger while waiting
   */
  async waitForAPIResponse(
    trigger?: () => Promise<void> | void,
    options?: {
      timeout?: number;
    }
  ): Promise<void> {
    if (!this.page) {
      return Promise.reject('No page available.');
    }

    await Promise.all([
      this.page.waitForResponse(
        response => response.url().includes('api/contents'),
        options
      ),
      Promise.resolve(trigger?.call(this))
    ]);
  }

  protected async _createDirectory(dirPath: string): Promise<boolean> {
    const data = JSON.stringify({
      format: 'json',
      type: 'directory'
    });

    let response = null;

    try {
      response = await this._fetch(dirPath, {
        method: 'PUT',
        data
      });
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}`, error);
    }

    return response?.status() === 201;
  }

  private async _fetch(
    path: string,
    options: {
      /**
       * Allows to set post data of the request. If the data parameter is an object, it will be serialized to json string and
       * `content-type` header will be set to `application/json` if not explicitly set. Otherwise the `content-type` header will
       * be set to `application/octet-stream` if not explicitly set.
       */
      data?: string | Buffer;

      /**
       * Whether to throw on response codes other than 2xx and 3xx. By default response object is returned for all status codes.
       */
      failOnStatusCode?: boolean;

      /**
       * Provides an object that will be serialized as html form using `application/x-www-form-urlencoded` encoding and sent as
       * this request body. If this parameter is specified `content-type` header will be set to
       * `application/x-www-form-urlencoded` unless explicitly provided.
       */
      form?: { [key: string]: string | number | boolean };

      /**
       * Allows to set HTTP headers.
       */
      headers?: { [key: string]: string };

      /**
       * Whether to ignore HTTPS errors when sending network requests. Defaults to `false`.
       */
      ignoreHTTPSErrors?: boolean;

      /**
       * If set changes the fetch method (e.g. [PUT](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PUT) or
       * [POST](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST)). If not specified, GET method is used.
       */
      method?: string;

      /**
       * Provides an object that will be serialized as html form using `multipart/form-data` encoding and sent as this request
       * body. If this parameter is specified `content-type` header will be set to `multipart/form-data` unless explicitly
       * provided. File values can be passed either as [`fs.ReadStream`](https://nodejs.org/api/fs.html#fs_class_fs_readstream)
       * or as file-like object containing file name, mime-type and its content.
       */
      multipart?: {
        [key: string]:
          | string
          | number
          | boolean
          | ReadStream
          | {
              /**
               * File name
               */
              name: string;

              /**
               * File type
               */
              mimeType: string;

              /**
               * File content
               */
              buffer: Buffer;
            };
      };

      /**
       * Query parameters to be sent with the URL.
       */
      params?: { [key: string]: string | number | boolean };

      /**
       * Request timeout in milliseconds. Defaults to `30000` (30 seconds). Pass `0` to disable timeout.
       */
      timeout?: number;
    } = { method: 'GET' }
  ): Promise<APIResponse> {
    const baseUrl = this.page ? await Utils.getBaseUrl(this.page) : '/';
    const token = this.page ? await Utils.getToken(this.page) : '';

    let url = URLExt.join(baseUrl, 'api/contents', path);

    if (token) {
      options.headers = { Authorization: `Token ${token}` };
    }

    return this.request.fetch(url, options);
  }
}
