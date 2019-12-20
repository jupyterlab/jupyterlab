// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '../serverconnection';
import { URLExt } from '@jupyterlab/coreutils';
import { validateModel, validateModels } from './validate';

/**
 * The kernel model provided by the server.
 *
 * #### Notes
 * See the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
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
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function listRunning(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel[]> {
  let url = URLExt.join(settings.baseUrl, KERNEL_SERVICE_URL);
  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status !== 200) {
    throw new ServerConnection.ResponseError(response);
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
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function startNew(
  options: IKernelOptions = {},
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel> {
  let url = URLExt.join(settings.baseUrl, KERNEL_SERVICE_URL);
  let init = {
    method: 'POST',
    body: JSON.stringify(options)
  };
  let response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 201) {
    throw new ServerConnection.ResponseError(response);
  }
  let data = await response.json();
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
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response (and thus after a restart) and rejected otherwise.
 */
export async function restartKernel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  let url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id),
    'restart'
  );
  let init = { method: 'POST' };

  let response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 200) {
    throw new ServerConnection.ResponseError(response);
  }
  let data = await response.json();
  validateModel(data);
}

/**
 * Interrupt a kernel.
 *
 * #### Notes
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function interruptKernel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  let url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id),
    'interrupt'
  );
  let init = { method: 'POST' };
  let response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 204) {
    throw new ServerConnection.ResponseError(response);
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
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function shutdownKernel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  let url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id)
  );
  let init = { method: 'DELETE' };
  let response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status === 404) {
    let msg = `The kernel "${id}" does not exist on the server`;
    console.warn(msg);
  } else if (response.status !== 204) {
    throw new ServerConnection.ResponseError(response);
  }
}

/**
 * Get a full kernel model from the server by kernel id string.
 *
 * #### Notes
 * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
 *
 * The promise is fulfilled on a valid response and rejected otherwise.
 */
export async function getKernelModel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel | undefined> {
  let url = URLExt.join(
    settings.baseUrl,
    KERNEL_SERVICE_URL,
    encodeURIComponent(id)
  );

  let response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status === 404) {
    return undefined;
  } else if (response.status !== 200) {
    throw new ServerConnection.ResponseError(response);
  }
  let data = await response.json();
  validateModel(data);
  return data;
}
