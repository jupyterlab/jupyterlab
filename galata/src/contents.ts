// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { Contents } from '@jupyterlab/services';
import { Page } from '@playwright/test';
import fetch, { RequestInit, Response } from 'node-fetch';
import * as path from 'path';
import {
  IPluginNameToInterfaceMap,
  PLUGIN_ID_DOC_MANAGER
} from './inpage/tokens';
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
   * @param baseURL Server base URL
   * @param page Playwright page model object
   */
  constructor(readonly baseURL: string, readonly page?: Page) {}

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
    const baseUrl = this.page ? await Utils.getBaseUrl(this.page) : '/';
    const token = this.page ? await Utils.getToken(this.page) : '';
    const apiUrl = `${this.baseURL}${baseUrl}api/contents`;

    const data = {
      type,
      // Get the content only for directory
      content: type === 'directory' ? 1 : 0
    };

    const request: RequestInit = {
      method: 'GET'
    };

    if (token) {
      request.headers = { Authorization: `Token ${token}` };
    }

    let response: Response | null = null;

    try {
      response = await fetch(
        `${apiUrl}/${path}` + URLExt.objectToQueryString(data),
        request
      );
    } catch (error) {
      console.error(`Fail to get content metadata for ${path}`, error);
    }

    const succeeded = response?.status === 200;

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

    let response: Response | null = null;

    try {
      response = await this._fetch(destinationPath, {
        method: 'PUT',
        body: data
      });
    } catch (error) {
      console.error(
        `Failed to upload content to server ${destinationPath}`,
        error
      );
    }

    const succeeded = response?.status === 201;

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

    let response: Response | null = null;

    try {
      response = await this._fetch(fileName, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to delete file ${filePath}`, error);
    }

    const succeeded = response?.status === 204;

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
          const docManager = (await window.galataip.getPlugin(
            pluginId
          )) as IDocumentManager;
          const result = await docManager.rename(oldName, newName);
          return result !== null;
        },
        {
          pluginId: PLUGIN_ID_DOC_MANAGER as keyof IPluginNameToInterfaceMap,
          oldName: oldName,
          newName: newName
        }
      );
    }

    let response: Response | null = null;

    try {
      response = await this._fetch(oldName, {
        method: 'PATCH',
        body: JSON.stringify({ path: newName })
      });
    } catch (error) {
      console.error(`Failed to rename file ${oldName} to ${newName}`, error);
    }

    const succeeded = response?.status === 200;

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
    trigger?: () => Promise<void> | void
  ): Promise<void> {
    if (!this.page) {
      return Promise.reject('No page available.');
    }

    await Promise.all([
      this.page.waitForResponse(response =>
        response.url().includes('api/contents')
      ),
      Promise.resolve(trigger?.call(this))
    ]);
  }

  protected async _createDirectory(dirPath: string): Promise<boolean> {
    const body = JSON.stringify({
      format: 'json',
      type: 'directory'
    });

    let response = null;

    try {
      response = await this._fetch(dirPath, {
        method: 'PUT',
        body
      });
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}`, error);
    }

    return response?.status === 201;
  }

  private async _fetch(
    path: string,
    request: RequestInit = { method: 'GET' }
  ): Promise<Response | null> {
    const baseUrl = this.page ? await Utils.getBaseUrl(this.page) : '/';
    const token = this.page ? await Utils.getToken(this.page) : '';

    const url = URLExt.join(this.baseURL, baseUrl, 'api/contents', path);

    if (token) {
      request.headers = { Authorization: `Token ${token}` };
    }

    let response: Response | null = null;

    response = await fetch(url, request);
    return response;
  }
}
