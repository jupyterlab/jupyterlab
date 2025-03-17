// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '../serverconnection';
import { ITerminal, ITerminalAPIClient } from './terminal';

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
 * @param settings - The server settings to use.
 *
 * @param name - The name of the target terminal.
 *
 * @param cwd - The path in which the terminal will start.
 *
 * @returns A promise that resolves with the session model.
 */
export async function startNew(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings(),
  name?: string,
  cwd?: string
): Promise<IModel> {
  Private.errorIfNotAvailable();
  const url = URLExt.join(settings.baseUrl, TERMINAL_SERVICE_URL);
  const init = {
    method: 'POST',
    body: JSON.stringify({ name, cwd })
  };

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
  const workspacesBase = URLExt.join(settings.baseUrl, TERMINAL_SERVICE_URL);
  const url = URLExt.join(workspacesBase, name);
  if (!url.startsWith(workspacesBase)) {
    throw new Error('Can only be used for terminal requests');
  }
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

/**
 * The Terminal API client.
 *
 * #### Notes
 * Use this class to interact with the Jupyter Server Terminal API.
 * This class adheres to the Jupyter Server API endpoints.
 */
export class TerminalAPIClient implements ITerminalAPIClient {
  /**
   * Create a new Terminal API client.
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
   * Whether terminals are available.
   */
  get isAvailable(): boolean {
    return isAvailable();
  }

  /**
   * Start a new terminal session.
   *
   * @param options - The options used to create the terminal.
   *
   * @returns A promise that resolves with the terminal session model.
   */
  async startNew(options: ITerminal.IOptions = {}): Promise<IModel> {
    const { name, cwd } = options;
    return startNew(this.serverSettings, name, cwd);
  }

  /**
   * List the running terminal sessions.
   *
   * @returns A promise that resolves with the list of running session models.
   */
  async listRunning(): Promise<IModel[]> {
    return listRunning(this.serverSettings);
  }

  /**
   * Shut down a terminal session by name.
   *
   * @param name - The name of the target session.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  async shutdown(name: string): Promise<void> {
    return shutdownTerminal(name, this.serverSettings);
  }
}

/**
 * Namespace for private statics.
 */
namespace Private {
  /**
   * Throw an error if terminals are not available.
   */
  export function errorIfNotAvailable(): void {
    if (!isAvailable()) {
      throw new Error('Terminals Unavailable');
    }
  }
}
