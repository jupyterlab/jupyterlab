// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '../serverconnection';
import { URLExt } from '@jupyterlab/coreutils';
import { validateModel, validateModels } from './validate';
import { IKernelAPIClient } from './kernel';

/**
 * The kernel model provided by the server.
 *
 * #### Notes
 * See the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels).
 */
export interface IModel {
  /**
   * Unique identifier of the kernel on the server.
   */
  readonly id: string;

  /**
   * The name of the kernel.
   */
  readonly name: string;

  /**
   * The kernel execution state.
   */
  readonly execution_state?: string;

  /**
   * The timestamp of the last activity on the kernel.
   */
  // eslint-disable-next-line camelcase
  readonly last_activity?: string;

  /**
   * The number of active connections to the kernel.
   */
  readonly connections?: number;

  /**
   * The reason the kernel died, if applicable.
   */
  readonly reason?: string;

  /**
   * The traceback for a dead kernel, if applicable.
   */
  readonly traceback?: string;
}

/**
 * The url for the kernel service.
 */
export const KERNEL_SERVICE_URL = 'api/kernels';

/**
 * Fetch the running kernels.
 *
 * @param settings - The optional server settings.
 *
 * @returns A promise that resolves with the list of running kernels.
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function listRunning(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel[]> {
  const url = URLExt.join(settings.baseUrl, KERNEL_SERVICE_URL);
  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  validateModels(data);
  return data;
}

/**
 * Start a new kernel.
 *
 * @param options - The options used to create the kernel.
 *
 * @returns A promise that resolves with a kernel connection object.
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function startNew(
  options: IKernelOptions = {},
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel> {
  const url = URLExt.join(settings.baseUrl, KERNEL_SERVICE_URL);
  const init = {
    method: 'POST',
    body: JSON.stringify(options)
  };
  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 201) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  validateModel(data);
  return data;
}

/**
 * The options object used to initialize a kernel.
 */
export type IKernelOptions = Partial<Pick<IModel, 'name'>>;

/**
 * Restart a kernel.
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response (and thus after a restart) and rejected otherwise.
 */
export async function restartKernel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  const url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id),
    'restart'
  );
  const init = { method: 'POST' };

  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  validateModel(data);
}

/**
 * Interrupt a kernel.
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function interruptKernel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  const url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id),
    'interrupt'
  );
  const init = { method: 'POST' };
  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 204) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
}

/**
 * Shut down a kernel.
 *
 * @param id - The id of the running kernel.
 *
 * @param settings - The server settings for the request.
 *
 * @returns A promise that resolves when the kernel is shut down.
 *
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function shutdownKernel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  const url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id)
  );
  const init = { method: 'DELETE' };
  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status === 404) {
    const msg = `The kernel "${id}" does not exist on the server`;
    console.warn(msg);
  } else if (response.status !== 204) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
}

/**
 * Get a full kernel model from the server by kernel id string.
 *
 * #### Notes
 * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function getKernelModel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel | undefined> {
  const url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id)
  );

  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status === 404) {
    return undefined;
  } else if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  validateModel(data);
  return data;
}

/**
 * The kernel API client.
 *
 * #### Notes
 * Use this class to interact with the Jupyter Server Kernel API.
 * This class adheres to the Jupyter Server API endpoints.
 */
export class KernelAPIClient implements IKernelAPIClient {
  /**
   * Create a new kernel API client.
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
   * List the running kernels.
   *
   * @returns A promise that resolves with the list of running kernel models.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async listRunning(): Promise<IModel[]> {
    return listRunning(this.serverSettings);
  }

  /**
   * Get a kernel model.
   *
   * @param id - The id of the kernel of interest.
   *
   * @returns A promise that resolves with the kernel model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   * If the kernel does not exist on the server, the promise is resolved with `undefined`.
   */
  async getModel(id: string): Promise<IModel | undefined> {
    return getKernelModel(id, this.serverSettings);
  }

  /**
   * Start a new kernel.
   *
   * @param options - The options used to create the kernel.
   *
   * @returns A promise that resolves with the kernel model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async startNew(options: IKernelOptions = {}): Promise<IModel> {
    return startNew(options, this.serverSettings);
  }

  /**
   * Restart a kernel.
   *
   * @param id - The id of the kernel to restart.
   *
   * @returns A promise that resolves when the kernel is restarted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async restart(id: string): Promise<void> {
    return restartKernel(id, this.serverSettings);
  }

  /**
   * Interrupt a kernel.
   *
   * @param id - The id of the kernel to interrupt.
   *
   * @returns A promise that resolves when the kernel is interrupted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async interrupt(id: string): Promise<void> {
    return interruptKernel(id, this.serverSettings);
  }

  /**
   * Shut down a kernel by id.
   *
   * @param id - The id of the kernel to shut down.
   *
   * @returns A promise that resolves when the kernel is shut down.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async shutdown(id: string): Promise<void> {
    return shutdownKernel(id, this.serverSettings);
  }
}
