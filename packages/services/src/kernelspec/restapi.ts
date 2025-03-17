// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '../serverconnection';
import { IKernelSpecAPIClient } from './kernelspec';
import { validateSpecModels } from './validate';

import { URLExt } from '@jupyterlab/coreutils';
import { PartialJSONObject } from '@lumino/coreutils';

/**
 * The url for the kernelspec service.
 */
const KERNELSPEC_SERVICE_URL = 'api/kernelspecs';

/**
 * Fetch all of the kernel specs.
 *
 * @param settings - The optional server settings.
 * @param useCache - Whether to use the cache. If false, always request.
 *
 * @returns A promise that resolves with the kernel specs.
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernelspecs).
 */
export async function getSpecs(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<ISpecModels> {
  const url = URLExt.join(settings.baseUrl, KERNELSPEC_SERVICE_URL);
  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  return validateSpecModels(data);
}

/**
 * The Kernel Spec API client.
 *
 * #### Notes
 * Use this class to interact with the Jupyter Server Kernel Spec API.
 * This class adheres to the Jupyter Server API endpoints.
 */
export class KernelSpecAPIClient implements IKernelSpecAPIClient {
  /**
   * Create a new Kernel Spec API client.
   *
   * @param options - The options used to create the client.
   */
  constructor(options: { serverSettings?: ServerConnection.ISettings } = {}) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }

  /**
   * The server settings for the client.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Fetch all of the kernel specs.
   *
   * @returns A promise that resolves with the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernelspecs).
   */
  async get(): Promise<ISpecModels> {
    return getSpecs(this.serverSettings);
  }
}

/**
 * Kernel Spec interface.
 *
 * #### Notes
 * See [Kernel specs](https://jupyter-client.readthedocs.io/en/latest/kernels.html#kernelspecs).
 */
export interface ISpecModel extends PartialJSONObject {
  /**
   * The name of the kernel spec.
   */
  readonly name: string;

  /**
   * The name of the language of the kernel.
   */
  readonly language: string;

  /**
   * A list of command line arguments used to start the kernel.
   */
  readonly argv: string[];

  /**
   * The kernel’s name as it should be displayed in the UI.
   */
  readonly display_name: string;

  /**
   * A dictionary of environment variables to set for the kernel.
   */
  readonly env?: PartialJSONObject;

  /**
   * A mapping of resource file name to download path.
   */
  readonly resources: { [key: string]: string };

  /**
   * A dictionary of additional attributes about this kernel; used by clients to aid in kernel selection.
   */
  readonly metadata?: PartialJSONObject;
}

/**
 * The available kernelSpec models.
 *
 * #### Notes
 * See the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernelspecs).
 */
export interface ISpecModels extends PartialJSONObject {
  /**
   * The name of the default kernel spec.
   */
  default: string;

  /**
   * A mapping of kernel spec name to spec.
   */
  readonly kernelspecs: { [key: string]: ISpecModel | undefined };
}
