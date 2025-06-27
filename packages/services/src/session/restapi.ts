// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '../serverconnection';
import { Session } from '.';
import { URLExt } from '@jupyterlab/coreutils';
import { updateLegacySessionModel, validateModel } from './validate';
import { ISessionAPIClient } from './session';

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * The url for the session service.
 */
export const SESSION_SERVICE_URL = 'api/sessions';

/**
 * List the running sessions.
 */
export async function listRunning(
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<Session.IModel[]> {
  const url = URLExt.join(settings.baseUrl, SESSION_SERVICE_URL);
  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid Session list');
  }
  data.forEach(m => {
    updateLegacySessionModel(m);
    validateModel(m);
  });
  return data;
}

/**
 * Get a session url.
 */
export function getSessionUrl(baseUrl: string, id: string): string {
  const servicesBase = URLExt.join(baseUrl, SESSION_SERVICE_URL);
  const result = URLExt.join(servicesBase, id);
  if (!result.startsWith(servicesBase)) {
    throw new Error('Can only be used for services requests');
  }
  return result;
}

/**
 * Shut down a session by id.
 */
export async function shutdownSession(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<void> {
  const url = getSessionUrl(settings.baseUrl, id);
  const init = { method: 'DELETE' };
  const response = await ServerConnection.makeRequest(url, init, settings);

  if (response.status === 404) {
    const data = await response.json();
    const msg =
      data.message ?? `The session "${id}"" does not exist on the server`;
    console.warn(msg);
  } else if (response.status === 410) {
    throw new ServerConnection.ResponseError(
      response,
      'The kernel was deleted but the session was not'
    );
  } else if (response.status !== 204) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
}

/**
 * Get a full session model from the server by session id string.
 */
export async function getSessionModel(
  id: string,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<Session.IModel> {
  const url = getSessionUrl(settings.baseUrl, id);
  const response = await ServerConnection.makeRequest(url, {}, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  updateLegacySessionModel(data);
  validateModel(data);
  return data;
}

/**
 * Create a new session, or return an existing session if the session path
 * already exists.
 */
export async function startSession(
  options: Session.ISessionOptions,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<Session.IModel> {
  const url = URLExt.join(settings.baseUrl, SESSION_SERVICE_URL);
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
  updateLegacySessionModel(data);
  validateModel(data);
  return data;
}

/**
 * Send a PATCH to the server, updating the session path or the kernel.
 */
export async function updateSession(
  model: Pick<Session.IModel, 'id'> & DeepPartial<Omit<Session.IModel, 'id'>>,
  settings: ServerConnection.ISettings = ServerConnection.makeSettings()
): Promise<Session.IModel> {
  const url = getSessionUrl(settings.baseUrl, model.id);
  const init = {
    method: 'PATCH',
    body: JSON.stringify(model)
  };
  const response = await ServerConnection.makeRequest(url, init, settings);
  if (response.status !== 200) {
    const err = await ServerConnection.ResponseError.create(response);
    throw err;
  }
  const data = await response.json();
  updateLegacySessionModel(data);
  validateModel(data);
  return data;
}

/**
 * The session API client.
 *
 * #### Notes
 * Use this class to interact with the Jupyter Server Session API.
 * This class adheres to the Jupyter Server API endpoints.
 */
export class SessionAPIClient implements ISessionAPIClient {
  /**
   * Create a new session API client.
   *
   * @param options - The options used to create the client.
   */
  constructor(options: { serverSettings?: ServerConnection.ISettings }) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }

  /**
   * The server settings used by the client.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * List the running sessions.
   *
   * @returns A promise that resolves with the list of running session models.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async listRunning(): Promise<Session.IModel[]> {
    return listRunning(this.serverSettings);
  }

  /**
   * Get a session model.
   *
   * @param id - The id of the session of interest.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async getModel(id: string): Promise<Session.IModel> {
    return getSessionModel(id, this.serverSettings);
  }

  /**
   * Create a new session.
   *
   * @param options - The options used to create the session.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async startNew(options: Session.ISessionOptions): Promise<Session.IModel> {
    return startSession(options, this.serverSettings);
  }

  /**
   * Shut down a session by id.
   *
   * @param id - The id of the session to shut down.
   *
   * @returns A promise that resolves when the session is shut down.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async shutdown(id: string): Promise<void> {
    return shutdownSession(id, this.serverSettings);
  }

  /**
   * Update a session by id.
   *
   * @param model - The session model to update.
   *
   * @returns A promise that resolves with the updated session model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async update(
    model: Pick<Session.IModel, 'id'> & DeepPartial<Omit<Session.IModel, 'id'>>
  ): Promise<Session.IModel> {
    return updateSession(model, this.serverSettings);
  }
}
