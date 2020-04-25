// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt, PageConfig } from '@jupyterlab/coreutils';
import { ServerConnection } from '../serverconnection';

/**
 * The url for the terminal service.
 */
export const TERMINAL_SERVICE_URL = 'api/terminals';

/**
 * Whether the terminal service is available.
 */
export function isAvailable(): boolean {
  const available = String(PageConfig.getOption('terminalsAvailable'));
  return available.toLowerCase() === 'true';
}

/**
 * The server model for a terminal session.
 */
export interface IModel {
  /**
   * The name of the terminal session.
   */
  readonly name: string;
}

/**
 * Start a new terminal session.
 *
 * @param options - The session options to use.
 *
 * @returns A promise that resolves with the session instance.
 */
export async function startNew(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel> {
  Private.errorIfNotAvailable();
  const url = URLExt.join(settings.baseUrl, TERMINAL_SERVICE_URL);
  const init = { method: 'POST' };

  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  // TODO: Validate model
  return data;
}

/**
 * List the running terminal sessions.
 *
 * @param settings - The server settings to use.
 *
 * @returns A promise that resolves with the list of running session models.
 */
export async function listRunning(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<IModel[]> {
  Private.errorIfNotAvailable();
  const url = URLExt.join(settings.baseUrl, TERMINAL_SERVICE_URL);
  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Invalid terminal list');
  }

  // TODO: validate each model
  return data;
}

/**
 * Shut down a terminal session by name.
 *
 * @param name - The name of the target session.
 *
 * @param settings - The server settings to use.
 *
 * @returns A promise that resolves when the session is shut down.
 */
export async function shutdownTerminal(
  name: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  Private.errorIfNotAvailable();
  const url = URLExt.join(settings.baseUrl, TERMINAL_SERVICE_URL, name);
  const init = { method: 'DELETE' };
  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status === 404) {
    const data = await response.json();
    const msg =
      data.message ??
      `The terminal session "${name}"" does not exist on the server`;
    console.warn(msg);
  } else if (response.status !== 204) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
}

namespace Private {
  /**
   * Throw an error if terminals are not available.
   */
  export function errorIfNotAvailable() {
    if (!isAvailable()) {
      throw new Error('Terminals Unavailable');
    }
  }
}
